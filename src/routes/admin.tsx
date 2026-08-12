import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeesTab } from "@/components/admin/EmployeesTab";
import { AttendanceTab } from "@/components/admin/AttendanceTab";
import { QrTab } from "@/components/admin/QrTab";
import { PayrollTab } from "@/components/admin/PayrollTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { adminLogin, adminOverview } from "@/lib/admin.functions";
import { getCompany } from "@/lib/employee.functions";
import { currentMonth, fmtDuration, fmtTime, hoursOf, money, type AttendanceRow, type Employee } from "@/lib/shared";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ניהול נוכחות ושכר — מנהל" },
      { name: "description", content: "לוח ניהול לאישור שעות עבודה, ניהול עובדים, ברקוד נוכחות ודוח שכר חודשי." },
      { property: "og:title", content: "ניהול נוכחות ושכר — מנהל" },
      { property: "og:description", content: "אישור שעות, ניהול עובדים, ברקוד נוכחות ודוח שכר." },
    ],
  }),
  component: AdminPage,
});

const KEY = "attendance_admin_token";

function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const company = useQuery({ queryKey: ["company"], queryFn: () => getCompany() });

  useEffect(() => {
    setToken(localStorage.getItem(KEY));
    setReady(true);
  }, []);

  const logout = () => {
    localStorage.removeItem(KEY);
    setToken(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {company.data?.logo_url ? (
              <img src={company.data.logo_url} alt="לוגו החברה" className="h-9 w-9 rounded-md object-contain" />
            ) : null}
            <div>
              <h1 className="text-base font-bold">{company.data?.company_name ?? "מכללת המשווקים"}</h1>
              <p className="text-xs text-muted-foreground">ממשק ניהול</p>
            </div>
          </div>
          {token ? (
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="ms-1 size-4" /> התנתקות
            </Button>
          ) : (
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              מסך עובד
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {!ready ? null : token ? (
          <AdminDashboard token={token} month={month} setMonth={setMonth} onInvalid={logout} />
        ) : (
          <AdminLogin
            onLogin={(t) => {
              localStorage.setItem(KEY, t);
              setToken(t);
            }}
          />
        )}
      </main>
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: (t: string) => void }) {
  const login = useServerFn(adminLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => login({ data: { username, password } }),
    onSuccess: (r) => onLogin(r.token),
    onError: (e: Error) => toast.error(e.message || "התחברות נכשלה"),
  });

  return (
    <div className="card-soft mx-auto max-w-md p-6">
      <h2 className="text-xl font-bold">כניסת מנהל</h2>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>שם משתמש</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>סיסמה</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="h-12 w-full text-base" disabled={mutation.isPending}>
          כניסה
        </Button>
      </form>
    </div>
  );
}

function AdminDashboard({
  token,
  month,
  setMonth,
  onInvalid,
}: {
  token: string;
  month: string;
  setMonth: (m: string) => void;
  onInvalid: () => void;
}) {
  const overview = useServerFn(adminOverview);
  const query = useQuery({
    queryKey: ["admin-overview", token, month],
    queryFn: () => overview({ data: { token, month } }),
    retry: false,
    refetchInterval: 60000,
  });
  const [liveFilter, setLiveFilter] = useState<null | "all" | "site" | "home" | "break">(null);
  const [openLog, setOpenLog] = useState<string | null>(null);

  useEffect(() => {
    if (query.error) {
      toast.error("החיבור פג תוקף, יש להתחבר מחדש");
      onInvalid();
    }
  }, [query.error, onInvalid]);

  const employees = (query.data?.employees ?? []) as Employee[];
  const records = (query.data?.records ?? []) as AttendanceRow[];
  const approved = records.filter((r) => r.status === "approved");
  const approvedHours = approved.reduce((s, r) => s + hoursOf(r), 0);
  const payroll = employees.reduce((sum, e) => {
    const h = approved.filter((r) => r.employee_id === e.id).reduce((s, r) => s + hoursOf(r), 0);
    return sum + h * Number(e.hourly_wage) + Number(e.bonus) + Number(e.travel);
  }, 0);

  type LiveRow = {
    id: string;
    employee_name: string;
    work_mode: string;
    entry_time: string | null;
    on_break: boolean;
    break_start: string | null;
    breaks?: { start_time: string; end_time: string | null }[];
  };
  const live = (query.data?.live ?? []) as LiveRow[];
  const fromHome = live.filter((r) => r.work_mode === "home");
  const fromSite = live.filter((r) => r.work_mode !== "home");
  const onBreak = live.filter((r) => r.on_break);
  const filtered =
    liveFilter === "home" ? fromHome : liveFilter === "site" ? fromSite : liveFilter === "break" ? onBreak : live;

  return (
    <Tabs defaultValue="dashboard" className="space-y-5">
      <TabsList className="flex w-full flex-wrap">
        <TabsTrigger value="dashboard">סקירה</TabsTrigger>
        <TabsTrigger value="employees">עובדים</TabsTrigger>
        <TabsTrigger value="attendance">נוכחות</TabsTrigger>
        <TabsTrigger value="qr">ברקוד</TabsTrigger>
        <TabsTrigger value="payroll">שכר</TabsTrigger>
        <TabsTrigger value="settings">הגדרות</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="סה״כ עובדים" value={String(employees.filter((e) => e.active).length)} />
            <Stat
              label="עובדים פעילים כעת"
              value={String(live.length)}
              onClick={() => setLiveFilter(liveFilter === "all" ? null : "all")}
              active={liveFilter === "all"}
            />
            <Stat
              label="עובדים מהמכללה"
              value={String(fromSite.length)}
              onClick={() => setLiveFilter(liveFilter === "site" ? null : "site")}
              active={liveFilter === "site"}
            />
            <Stat
              label="עובדים מהבית"
              value={String(fromHome.length)}
              onClick={() => setLiveFilter(liveFilter === "home" ? null : "home")}
              active={liveFilter === "home"}
            />
            <Stat
              label="בהפסקה כעת"
              value={String(onBreak.length)}
              onClick={() => setLiveFilter(liveFilter === "break" ? null : "break")}
              active={liveFilter === "break"}
            />
            <Stat label="שעות מאושרות החודש" value={approvedHours.toFixed(2)} />
            <Stat label="שכר מאושר החודש" value={money(Math.round(payroll * 100) / 100)} />
          </div>

          {liveFilter ? (
            <div className="card-soft overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-secondary text-xs">
                  <tr>
                    <th className="p-3">עובד</th>
                    <th className="p-3">מיקום עבודה</th>
                    <th className="p-3">שעת כניסה</th>
                    <th className="p-3">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 font-medium">{r.employee_name}</td>
                      <td className="p-3">{r.work_mode === "home" ? "מהבית" : "מהמכללה"}</td>
                      <td className="p-3">{fmtTime(r.entry_time)}</td>
                      <td className="p-3">
                        {r.on_break ? (
                          <span className="text-warning">בהפסקה מאז {fmtTime(r.break_start)}</span>
                        ) : (
                          <span className="text-success">בעבודה</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        אין עובדים בקטגוריה זו
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">לחצו על אחד הכרטיסים כדי לראות פירוט עובדים.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="employees">
        <EmployeesTab token={token} />
      </TabsContent>
      <TabsContent value="attendance">
        <AttendanceTab token={token} month={month} setMonth={setMonth} />
      </TabsContent>
      <TabsContent value="qr">
        <QrTab token={token} />
      </TabsContent>
      <TabsContent value="payroll">
        <PayrollTab token={token} month={month} setMonth={setMonth} />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsTab token={token} />
      </TabsContent>
    </Tabs>
  );
}

function Stat({
  label,
  value,
  onClick,
  active,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const content = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </>
  );
  if (!onClick) return <div className="card-soft p-4">{content}</div>;
  return (
    <button
      onClick={onClick}
      className={`card-soft p-4 text-right transition hover:border-primary ${active ? "ring-2 ring-primary" : ""}`}
    >
      {content}
    </button>
  );
}