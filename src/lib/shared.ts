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
  approved_by: string | null;
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
  valid_from: string;
  valid_until: string;
  active: boolean;
};

export function hoursOf(row: { entry_time: string | null; exit_time: string | null }): number {
  if (!row.entry_time || !row.exit_time) return 0;
  const ms = new Date(row.exit_time).getTime() - new Date(row.entry_time).getTime();
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