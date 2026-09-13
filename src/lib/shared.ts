export type BreakRow = {
  id: string;
  attendance_id: string;
  start_time: string;
  end_time: string | null;
};

export type AttendanceRow = {
  id: string;
  employee_id: string;
  employee_name?: string;
  work_date: string;
  entry_time: string | null;
  exit_time: string | null;
  entry_latitude: number | null;
  entry_longitude: number | null;
  exit_latitude: number | null;
  exit_longitude: number | null;
  status: string;
  work_mode?: string;
  approved_by: string | null;
  attendance_breaks?: BreakRow[];
};

export type Employee = {
  id: string;
  full_name: string;
  id_number: string;
  hourly_wage: number;
  travel: number;
  bonus: number;
  active: boolean;
};

export type QrCode = {
  id: string;
  token: string;
  label: string;
  kind?: string;
  valid_from: string;
  valid_until: string;
  active: boolean;
};

export function breakMinutes(row: { attendance_breaks?: BreakRow[] | null }): number {
  const list = row.attendance_breaks ?? [];
  const ms = list.reduce((s, b) => {
    if (!b.end_time) return s;
    const d = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
    return s + (d > 0 ? d : 0);
  }, 0);
  return Math.round(ms / 60000);
}

export function fmtDuration(minutes: number) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}:${String(m).padStart(2, "0")} ש׳` : `${m} דק׳`;
}

export function hoursOf(row: {
  entry_time: string | null;
  exit_time: string | null;
  attendance_breaks?: BreakRow[] | null;
}, deductBreaks = true): number {
  if (!row.entry_time || !row.exit_time) return 0;
  const ms =
    new Date(row.exit_time).getTime() -
    new Date(row.entry_time).getTime() -
    (deductBreaks ? breakMinutes(row) * 60000 : 0);
  return ms > 0 ? Math.round((ms / 36e5) * 100) / 100 : 0;
}

export function fmtTime(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(v: string) {
  return new Date(v + "T00:00:00").toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function statusLabel(s: string) {
  return s === "approved" ? "מאושר" : s === "rejected" ? "נדחה" : "ממתין לאישור";
}

export function money(n: number) {
  return "₪" + n.toLocaleString("he-IL", { maximumFractionDigits: 2 });
}

export type MonthlyStats = {
  employee_id: string;
  month: string;
  sales_count: number;
  potential_revenue: number;
  manager_bonus?: number;
};

export type CompTier = {
  id?: string;
  min_sales: number;
  max_sales: number | null;
  kind: "percent" | "fixed";
  value: number;
};

export type CompModel = {
  id: string;
  name: string;
  active: boolean;
  tiers: CompTier[];
};

export function sortTiers(tiers: CompTier[]): CompTier[] {
  return [...tiers].sort((a, b) => Number(a.min_sales) - Number(b.min_sales));
}

export function findTier(tiers: CompTier[], sales: number): CompTier | null {
  return (
    sortTiers(tiers).find(
      (t) => sales >= Number(t.min_sales) && (t.max_sales === null || sales <= Number(t.max_sales)),
    ) ?? null
  );
}

/** בונוס לפי מודל התגמול של העובד */
export function modelBonus(model: CompModel | null | undefined, sales: number, potential: number): number {
  if (!model) return 0;
  const tier = findTier(model.tiers ?? [], sales);
  if (!tier) return 0;
  if (tier.kind === "fixed") return Math.round(Number(tier.value) * 100) / 100;
  if (!potential) return 0;
  return Math.round(potential * (Number(tier.value) / 100) * 100) / 100;
}

export function tierLabel(tier: CompTier | null): string {
  if (!tier) return "—";
  return tier.kind === "fixed" ? money(Number(tier.value)) : `${Number(tier.value)}%`;
}

export function tierRange(tier: CompTier): string {
  return tier.max_sales === null ? `${tier.min_sales}+` : `${tier.min_sales}–${tier.max_sales}`;
}