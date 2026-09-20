import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminOverview, saveEmployeeStats } from "@/lib/admin.functions";
import { getCompany } from "@/lib/employee.functions";
import { downloadPayrollExcel } from "@/lib/excel";
import {
  findTier,
  hoursOf,
  modelBonus,
  money,
  tierLabel,
  type AttendanceRow,
  type CompModel,
  type Employee,
  type MonthlyStats,
} from "@/lib/shared";

type Draft = { sales: string; potential: string; manager: string; revenue: Record<string, string> };

const emptyDraft = (): Draft => ({ sales: "0", potential: "0", manager: "0", revenue: {} });

export function PayrollTab({ token, month, setMonth }: { token: string; month: string; setMonth: (m: string) => void }) {
  const overview = useServerFn(adminOverview);
  const saveStats = useServerFn(saveEmployeeStats);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-overview", token, month],
    queryFn: () => overview({ data: { token, month } }),
  });
  const company = useQuery({ queryKey: ["company"], queryFn: () => getCompany() });
  const deductBreaks = company.data?.deduct_breaks ?? true;

  const employees = (query.data?.employees ?? []) as Employee[];
  const records = (query.data?.records ?? []) as AttendanceRow[];
  const stats = (query.data?.stats ?? []) as MonthlyStats[];
  const models = (query.data?.models ?? []) as CompModel[];
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const employee of employees) {
      const saved = stats.find((item) => item.employee_id === employee.id);
      const model = models.find((item) => item.id === employee.comp_model_id) ?? null;
      const revenue: Record<string, string> = {};
      for (const rate of model?.rates ?? []) {
        revenue[rate.name] = String(Number((saved?.revenue_by_type ?? {})[rate.name] ?? 0));
      }
      next[employee.id] = {
        sales: String(Number(saved?.sales_count ?? 0)),
        potential: String(Number(saved?.potential_revenue ?? 0)),
        manager: String(Number(saved?.manager_bonus ?? 0)),
        revenue,
      };
    }
    setDraft(next);
  }, [query.dataUpdatedAt, month]);

  const updateDraft = (employeeId: string, update: (current: Draft) => Draft) => {
    setDraft((current) => ({ ...current, [employeeId]: update(current[employeeId] ?? emptyDraft()) }));
  };

  const mutation = useMutation({
    mutationFn: (value: {
      employee_id: string;
      sales_count: number;
      potential_revenue: number;
      manager_bonus: number;
      revenue_by_type: Record<string, number>;
    }) => saveStats({ data: { token, month, ...value } }),
    onSuccess: async () => {
      toast.success("נתוני השכר נשמרו");
      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message || "שמירה נכשלה"),
  });

  const allRows = employees.map((employee) => {
    const approved = records.filter((record) => record.employee_id === employee.id && record.status === "approved");
    const hours = approved.reduce((sum, record) => sum + hoursOf(record, deductBreaks), 0);
    const monthly = employee.pay_type === "monthly";
    const commissionOnly = employee.pay_type === "commission";
    const base = commissionOnly ? 0 : monthly ? Number(employee.monthly_salary ?? 0) : hours * Number(employee.hourly_wage);
    const employeeDraft = draft[employee.id] ?? emptyDraft();
    const sales = Number(employeeDraft.sales) || 0;
    const potential = Number(employeeDraft.potential) || 0;
    const managerBonus = Number(employeeDraft.manager) || 0;
    const model = models.find((item) => item.id === employee.comp_model_id) ?? null;
    const revenue: Record<string, number> = {};
    for (const rate of model?.rates ?? []) revenue[rate.name] = Number(employeeDraft.revenue[rate.name] ?? 0) || 0;
    const bonus = modelBonus(model, sales, potential, revenue);
    return {
      id: employee.id,
      active: employee.active !== false,
      name: employee.full_name,
      idNumber: employee.id_number,
      employmentStartDate: employee.employment_start_date ?? "",
      days: new Set(approved.map((record) => record.work_date)).size,
      hours: Math.round(hours * 100) / 100,
      payLabel: commissionOnly ? "עמלות בלבד" : monthly ? "שכר חודשי" : "שכר שעתי",
      hourlyWage: monthly || commissionOnly ? 0 : Number(employee.hourly_wage),
      wage: commissionOnly ? 0 : monthly ? Number(employee.monthly_salary ?? 0) : Number(employee.hourly_wage),
      base: Math.round(base * 100) / 100,
      sales,
      potential,
      model,
      revenue,
      modelName: model ? model.name : "ללא מודל",
      tierText: model ? tierLabel(findTier(model.tiers ?? [], model.kind === "management" ? potential : sales)) : "—",
      bonus,
      managerBonus,
      travel: Number(employee.travel),
      total: Math.round((base + bonus + managerBonus + Number(employee.travel)) * 100) / 100,
    };
  });

  const rows = allRows.filter((row) => row.active);

  const exportExcel = () => {
    downloadPayrollExcel(
      month,
      (includeInactive ? allRows : rows).map((row) => ({
        employeeName: row.name,
        idNumber: row.idNumber,
        employmentStartDate: row.employmentStartDate,
        month,
        workDays: row.days,
        workHours: row.hours,
        hourlyWage: row.hourlyWage,
        basePay: row.base,
        travel: row.travel,
        bonus: row.bonus,
        managerBonus: row.managerBonus,
        grossTotal: row.total,
      })),
    );
  };

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">שכר חודשי</h2>
          <p className="text-sm text-muted-foreground">{rows.length} עובדים · סה״כ {money(grandTotal)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-40" />
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
            />
            <span>כלול עובדים לא פעילים בייצוא</span>
          </label>
          <Button variant="outline" onClick={exportExcel}>
            <Download className="ms-1 size-4" /> ייצוא Excel
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <section key={row.id} className="card-soft overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-secondary/60 px-4 py-3">
              <div>
                <h3 className="font-bold">{row.name}</h3>
                <p className="text-xs text-muted-foreground">ת״ז {row.idNumber} · {row.payLabel} · {row.modelName}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">סה״כ ברוטו</p>
                <p className="text-xl font-extrabold">{money(row.total)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 xl:grid-cols-8">
              <PayrollValue label="ימים" value={String(row.days)} />
              <PayrollValue label="שעות" value={row.hours.toFixed(2)} />
              <PayrollValue label="תעריף" value={money(row.wage)} note={row.payLabel} />
              <PayrollValue label="שכר בסיס" value={money(row.base)} />
              <PayrollValue label="נסיעות" value={money(row.travel)} />
              <PayrollValue label="בונוס" value={money(row.bonus)} note={row.tierText} />
              <PayrollValue label="בונוס מנהל" value={money(row.managerBonus)} />
              <PayrollValue label="פוטנציאל הכנסות" value={money(row.potential)} />
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] lg:items-end">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-medium">
                  <span>מכירות</span>
                  <Input
                    type="number"
                    min="0"
                    value={draft[row.id]?.sales ?? "0"}
                    onChange={(event) => updateDraft(row.id, (current) => ({ ...current, sales: event.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  <span>פוטנציאל הכנסות</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft[row.id]?.potential ?? "0"}
                    onChange={(event) => updateDraft(row.id, (current) => ({ ...current, potential: event.target.value }))}
                  />
                </label>
              </div>

              <div>
                {(row.model?.rates ?? []).length ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {(row.model?.rates ?? []).map((rate) => (
                      <label key={rate.name} className="space-y-1 text-xs font-medium">
                        <span>{rate.name} ({rate.percent}%)</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft[row.id]?.revenue?.[rate.name] ?? "0"}
                          onChange={(event) =>
                            updateDraft(row.id, (current) => ({
                              ...current,
                              revenue: { ...current.revenue, [rate.name]: event.target.value },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">אין סוגי הכנסה במודל זה</p>
                )}
              </div>

              <div className="flex items-end gap-2">
                <label className="space-y-1 text-xs font-medium">
                  <span>בונוס מנהל</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-32"
                    value={draft[row.id]?.manager ?? "0"}
                    onChange={(event) => updateDraft(row.id, (current) => ({ ...current, manager: event.target.value }))}
                  />
                </label>
                <Button
                  aria-label={`שמירת נתוני השכר של ${row.name}`}
                  title="שמירה"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      employee_id: row.id,
                      sales_count: Math.max(0, Math.round(row.sales)),
                      potential_revenue: Math.max(0, row.potential),
                      manager_bonus: Math.max(0, row.managerBonus),
                      revenue_by_type: row.revenue,
                    })
                  }
                >
                  <Save className="size-4" /> שמירה
                </Button>
              </div>
            </div>
          </section>
        ))}
        {rows.length === 0 ? <p className="card-soft p-8 text-center text-muted-foreground">אין עובדים להצגה</p> : null}
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>* רק שעות שאושרו נכללות בחישוב. {deductBreaks ? "זמן ההפסקות מנוכה מסך השעות." : "זמן ההפסקות אינו מנוכה מסך השעות."}</p>
        <p>* הבונוס מחושב לפי מודל התגמול של העובד. עובד ללא מודל אינו מקבל בונוס.</p>
        <p>* בונוס מנהל נקבע ידנית, נכלל בסה״כ ברוטו ואינו מוצג לנציג.</p>
      </div>
    </div>
  );
}

function PayrollValue({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 bg-card px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-bold" title={value}>{value}</p>
      {note ? <p className="truncate text-xs text-muted-foreground" title={note}>{note}</p> : null}
    </div>
  );
}