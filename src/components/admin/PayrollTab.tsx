import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminOverview } from "@/lib/admin.functions";
import { downloadCsv } from "@/lib/csv";
import { hoursOf, money, type AttendanceRow, type Employee } from "@/lib/shared";

export function PayrollTab({ token, month, setMonth }: { token: string; month: string; setMonth: (m: string) => void }) {
  const overview = useServerFn(adminOverview);
  const query = useQuery({
    queryKey: ["admin-overview", token, month],
    queryFn: () => overview({ data: { token, month } }),
  });

  const employees = (query.data?.employees ?? []) as Employee[];
  const records = (query.data?.records ?? []) as AttendanceRow[];

  const rows = employees.map((e) => {
    const approved = records.filter((r) => r.employee_id === e.id && r.status === "approved");
    const hours = approved.reduce((s, r) => s + hoursOf(r), 0);
    const base = hours * Number(e.hourly_wage);
    return {
      name: e.full_name,
      days: approved.length,
      hours: Math.round(hours * 100) / 100,
      wage: Number(e.hourly_wage),
      base: Math.round(base * 100) / 100,
      bonus: Number(e.bonus),
      travel: Number(e.travel),
      total: Math.round((base + Number(e.bonus) + Number(e.travel)) * 100) / 100,
    };
  });

  const exportCsv = () => {
    downloadCsv(`payroll-${month}.csv`, [
      ["עובד", "ימים מאושרים", "שעות מאושרות", "שכר שעתי", "שכר בסיס", "בונוס", "נסיעות", "סה״כ ברוטו"],
      ...rows.map((r) => [r.name, r.days, r.hours, r.wage, r.base, r.bonus, r.travel, r.total]),
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
              <th className="p-3">בונוס</th>
              <th className="p-3">נסיעות</th>
              <th className="p-3">סה״כ ברוטו</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.days}</td>
                <td className="p-3">{r.hours.toFixed(2)}</td>
                <td className="p-3">{money(r.wage)}</td>
                <td className="p-3">{money(r.base)}</td>
                <td className="p-3">{money(r.bonus)}</td>
                <td className="p-3">{money(r.travel)}</td>
                <td className="p-3 font-bold">{money(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-secondary font-bold">
              <td className="p-3" colSpan={7}>
                סה״כ
              </td>
              <td className="p-3">{money(Math.round(grandTotal * 100) / 100)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">* רק שעות שאושרו נכללות בחישוב.</p>
    </div>
  );
}