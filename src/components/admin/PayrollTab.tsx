import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminOverview, saveEmployeeStats } from "@/lib/admin.functions";
import { getCompany } from "@/lib/employee.functions";
import { downloadCsv } from "@/lib/csv";
import {
  bonusRate,
  computeBonus,
  hoursOf,
  money,
  type AttendanceRow,
  type Employee,
  type MonthlyStats,
} from "@/lib/shared";

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

  const [draft, setDraft] = useState<Record<string, { sales: string; potential: string }>>({});

  useEffect(() => {
    const next: Record<string, { sales: string; potential: string }> = {};
    for (const e of employees) {
      const s = stats.find((x) => x.employee_id === e.id);
      next[e.id] = {
        sales: String(Number(s?.sales_count ?? 0)),
        potential: String(Number(s?.potential_revenue ?? 0)),
      };
    }
    setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.dataUpdatedAt, month]);

  const mutation = useMutation({
    mutationFn: (v: { employee_id: string; sales_count: number; potential_revenue: number }) =>
      saveStats({ data: { token, month, ...v } }),
    onSuccess: async () => {
      toast.success("נתוני המכירות נשמרו");
      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: Error) => toast.error(e.message || "שמירה נכשלה"),
  });

  const rows = employees.map((e) => {
    const approved = records.filter((r) => r.employee_id === e.id && r.status === "approved");
    const hours = approved.reduce((s, r) => s + hoursOf(r, deductBreaks), 0);
    const base = hours * Number(e.hourly_wage);
    const d = draft[e.id];
    const sales = Number(d?.sales ?? 0) || 0;
    const potential = Number(d?.potential ?? 0) || 0;
    const bonus = computeBonus(sales, potential);
    return {
      id: e.id,
      name: e.full_name,
      days: approved.length,
      hours: Math.round(hours * 100) / 100,
      wage: Number(e.hourly_wage),
      base: Math.round(base * 100) / 100,
      sales,
      potential,
      bonus,
      travel: Number(e.travel),
      total: Math.round((base + bonus + Number(e.travel)) * 100) / 100,
    };
  });

  const exportCsv = () => {
    downloadCsv(`payroll-${month}.csv`, [
      [
        "עובד",
        "ימים מאושרים",
        "שעות מאושרות",
        "שכר שעתי",
        "שכר בסיס",
        "מכירות",
        "פוטנציאל הכנסות",
        "אחוז בונוס",
        "בונוס",
        "נסיעות",
        "סה״כ ברוטו",
      ],
      ...rows.map((r) => [
        r.name,
        r.days,
        r.hours,
        r.wage,
        r.base,
        r.sales,
        r.potential,
        `${bonusRate(r.sales) * 100}%`,
        r.bonus,
        r.travel,
        r.total,
      ]),
    ]);
  };

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">שכר חודשי</h2>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={exportCsv}>
            <Download className="ms-1 size-4" /> ייצוא CSV
          </Button>
        </div>
      </div>

      <div className="card-soft overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-secondary text-xs">
            <tr>
              <th className="p-3">עובד</th>
              <th className="p-3">ימים</th>
              <th className="p-3">שעות</th>
              <th className="p-3">שכר שעתי</th>
              <th className="p-3">שכר בסיס</th>
              <th className="p-3">מכירות</th>
              <th className="p-3">פוטנציאל הכנסות</th>
              <th className="p-3">בונוס</th>
              <th className="p-3">נסיעות</th>
              <th className="p-3">סה״כ ברוטו</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.days}</td>
                <td className="p-3">{r.hours.toFixed(2)}</td>
                <td className="p-3">{money(r.wage)}</td>
                <td className="p-3">{money(r.base)}</td>
                <td className="p-3">
                  <Input
                    type="number"
                    min="0"
                    className="w-20"
                    value={draft[r.id]?.sales ?? "0"}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, [r.id]: { ...p[r.id]!, sales: e.target.value } }))
                    }
                  />
                </td>
                <td className="p-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-28"
                    value={draft[r.id]?.potential ?? "0"}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, [r.id]: { ...p[r.id]!, potential: e.target.value } }))
                    }
                  />
                </td>
                <td className="p-3">
                  {money(r.bonus)}
                  <span className="block text-xs text-muted-foreground">{bonusRate(r.sales) * 100}%</span>
                </td>
                <td className="p-3">{money(r.travel)}</td>
                <td className="p-3 font-bold">{money(r.total)}</td>
                <td className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        employee_id: r.id,
                        sales_count: Math.max(0, Math.round(r.sales)),
                        potential_revenue: Math.max(0, r.potential),
                      })
                    }
                  >
                    <Save className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-secondary font-bold">
              <td className="p-3" colSpan={9}>
                סה״כ
              </td>
              <td className="p-3">{money(Math.round(grandTotal * 100) / 100)}</td>
              <td className="p-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        * רק שעות שאושרו נכללות בחישוב. {deductBreaks ? "זמן ההפסקות מנוכה מסך השעות." : "זמן ההפסקות אינו מנוכה מסך השעות."}
      </p>
      <p className="text-xs text-muted-foreground">
        * הבונוס מחושב מסך פוטנציאל ההכנסות של אותו חודש: עד 4 מכירות 2%, 5–9 מכירות 4%, 10–15 מכירות 5%, 16 ומעלה 6%.
      </p>
    </div>
  );
}