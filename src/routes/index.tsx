import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Coffee, Home, LogIn, LogOut, MapPin, Play, ShieldCheck, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrScanDialog } from "@/components/QrScanDialog";
import { InstallAppButton } from "@/components/InstallAppButton";
import { getPosition } from "@/lib/geo";
import { employeeBreak, employeeLogin, employeePunch, employeeState, getCompany } from "@/lib/employee.functions";
import { breakMinutes, computeBonus, currentMonth, fmtDate, fmtDuration, fmtTime, hoursOf, money, statusLabel } from "@/lib/shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "דיווח נוכחות לעובדים" },
      { name: "description", content: "כניסה ויציאה מהעבודה בסריקת ברקוד עם אימות מיקום וסיכום שעות חודשי." },
      { property: "og:title", content: "דיווח נוכחות לעובדים" },
      { property: "og:description", content: "כניסה ויציאה בסריקת ברקוד, אימות מיקום וסיכום שעות חודשי." },
    ],
  }),
  component: EmployeeApp,
});

const KEY = "attendance_employee_token";

function EmployeeApp() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem(KEY));
    setReady(true);
  }, []);

  const company = useQuery({ queryKey: ["company"], queryFn: () => getCompany() });

  const logout = () => {
    localStorage.removeItem(KEY);
    setToken(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {company.data?.logo_url ? (
              <img src={company.data.logo_url} alt="לוגו החברה" className="h-9 w-9 rounded-md object-contain" />
            ) : null}
            <h1 className="text-base font-bold">{company.data?.company_name ?? "מכללת המשווקים"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <InstallAppButton />
            {token ? (
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="ms-1 size-4" /> יציאה
              </Button>
            ) : (
              <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-4" /> מנהל
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {!ready ? null : token ? (
          <AttendanceScreen token={token} onInvalid={logout} />
        ) : (
          <LoginCard onLogin={(t) => {
            localStorage.setItem(KEY, t);
            setToken(t);
          }} />
        )}
      </main>
    </div>
  );
}

function LoginCard({ onLogin }: { onLogin: (token: string) => void }) {
  const login = useServerFn(employeeLogin);
  const [fullName, setName] = useState("");
  const [idNumber, setId] = useState("");

  const mutation = useMutation({
    mutationFn: () => login({ data: { fullName, idNumber } }),
    onSuccess: (res) => onLogin(res.token),
    onError: (e: Error) => toast.error(e.message || "התחברות נכשלה"),
  });

  return (
    <div className="card-soft mx-auto max-w-md p-6">
      <h2 className="text-xl font-bold">כניסת עובד</h2>
      <p className="mt-1 text-sm text-muted-foreground">הזינו שם מלא ומספר תעודת זהות כפי שנרשמו במערכת.</p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">שם מלא</Label>
          <Input id="name" value={fullName} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="id">תעודת זהות</Label>
          <Input id="id" inputMode="numeric" value={idNumber} onChange={(e) => setId(e.target.value)} required />
        </div>
        <Button type="submit" className="h-12 w-full text-base" disabled={mutation.isPending}>
          התחברות
        </Button>
      </form>
    </div>
  );
}

function AttendanceScreen({ token, onInvalid }: { token: string; onInvalid: () => void }) {
  const month = currentMonth();
  const state = useServerFn(employeeState);
  const punch = useServerFn(employeePunch);
  const breakFn = useServerFn(employeeBreak);
  const qc = useQueryClient();
  const [scan, setScan] = useState<null | "in" | "out">(null);
  const [codePrompt, setCodePrompt] = useState<null | "in" | "out">(null);
  const [homeCode, setHomeCode] = useState("");
  const [mode, setMode] = useState<"site" | "home">("site");
  const [busy, setBusy] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  const companySettings = useQuery({ queryKey: ["company"], queryFn: () => getCompany() });
  const query = useQuery({
    queryKey: ["employee-state", token, month],
    queryFn: () => state({ data: { token, month } }),
    retry: false,
  });

  useEffect(() => {
    if (query.error) {
      toast.error("החיבור פג תוקף, יש להתחבר מחדש");
      onInvalid();
    }
  }, [query.error, onInvalid]);

  if (!query.data) return <p className="text-center text-muted-foreground">טוען…</p>;

  const { employee, records, openRecord, finishedToday, openBreak } = query.data;
  const status = openRecord ? "בעבודה" : finishedToday ? "סיימת עבודה" : "לא התחלת עבודה";
  const activeMode = (openRecord ? ((openRecord as { work_mode?: string }).work_mode ?? "site") : mode) as
    | "site"
    | "home";

  const startPunch = (type: "in" | "out") => {
    const m = type === "in" ? mode : activeMode;
    if (m === "home") {
      setHomeCode("");
      setCodePrompt(type);
    } else {
      setScan(type);
    }
  };

  const approved = records.filter((r) => r.status === "approved");
  const deductBreaks = companySettings.data?.deduct_breaks ?? true;
  const approvedHours = approved.reduce((s, r) => s + hoursOf(r, deductBreaks), 0);

  const submitPunch = async (value: string, type: "in" | "out", m: "site" | "home") => {
    setBusy(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (m === "site") {
        const pos = await getPosition();
        latitude = pos.latitude;
        longitude = pos.longitude;
      } else {
        // עבודה מהבית: מנסים לצרף מיקום, אך אם אין הרשאה הדיווח ממשיך כרגיל
        try {
          const pos = await getPosition();
          latitude = pos.latitude;
          longitude = pos.longitude;
        } catch {
          latitude = null;
          longitude = null;
        }
      }
      await punch({ data: { token, qrToken: value.trim(), type, mode: m, latitude, longitude } });
      toast.success(type === "in" ? "הכניסה נרשמה בהצלחה" : "היציאה נרשמה בהצלחה");
      await qc.invalidateQueries({ queryKey: ["employee-state"] });
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(
        msg.includes("QR_EXPIRED")
          ? m === "home"
            ? "הקוד אינו בתוקף. פנו למנהל."
            : "הברקוד אינו בתוקף. פנו למנהל."
          : msg.includes("QR_INVALID")
            ? m === "home"
              ? "קוד שגוי"
              : "ברקוד לא מזוהה"
            : msg || "הפעולה נכשלה",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleScan = async (value: string) => {
    const type = scan;
    setScan(null);
    if (!type) return;
    await submitPunch(value, type, "site");
  };

  const handleBreak = async (action: "start" | "end") => {
    setBusy(true);
    try {
      await breakFn({ data: { token, action } });
      toast.success(action === "start" ? "יצאת להפסקה" : "חזרת מהפסקה");
      await qc.invalidateQueries({ queryKey: ["employee-state"] });
    } catch (e) {
      toast.error((e as Error).message || "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card-soft p-5">
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold">{employee.full_name}</h2>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium">
          <span
            className={`size-2 rounded-full ${openRecord ? "bg-success" : finishedToday ? "bg-muted-foreground" : "bg-warning"}`}
          />
          {status}
        </div>
        {openRecord ? (
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p>שעת כניסה: {fmtTime(openRecord.entry_time)}</p>
            <p>
              סה״כ הפסקות היום: {fmtDuration(breakMinutes(openRecord))}
              {openBreak ? ` · בהפסקה מאז ${fmtTime(openBreak.start_time)}` : ""}
            </p>
            {(openRecord.attendance_breaks ?? []).length ? (
              <ul className="text-xs">
                {(openRecord.attendance_breaks ?? []).map((b) => (
                  <li key={b.id}>
                    הפסקה: {fmtTime(b.start_time)} – {b.end_time ? fmtTime(b.end_time) : "פעילה"}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        {!openRecord ? (
          <div className="card-soft p-4">
            <p className="text-sm font-medium">איפה אתם עובדים היום?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "site" ? "default" : "outline"}
                className="h-12"
                onClick={() => setMode("site")}
              >
                <Building2 className="ms-2 size-4" /> מהמכללה
              </Button>
              <Button
                type="button"
                variant={mode === "home" ? "default" : "outline"}
                className="h-12"
                onClick={() => setMode("home")}
              >
                <Home className="ms-2 size-4" /> מהבית
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            משמרת פעילה — {activeMode === "home" ? "עבודה מהבית" : "עבודה מהמכללה"}
          </p>
        )}
        <Button
          className="h-20 w-full bg-success text-lg font-bold text-success-foreground hover:bg-success/90"
          disabled={!!openRecord || busy}
          onClick={() => startPunch("in")}
        >
          <LogIn className="ms-2 size-6" /> כניסה
        </Button>
        {openRecord ? (
          <Button
            variant="outline"
            className="h-16 w-full text-base font-bold"
            disabled={busy}
            onClick={() => handleBreak(openBreak ? "end" : "start")}
          >
            {openBreak ? <Play className="ms-2 size-5" /> : <Coffee className="ms-2 size-5" />}
            {openBreak ? "חזרה מהפסקה" : "יציאה להפסקה"}
          </Button>
        ) : null}
        <Button
          className="h-20 w-full bg-destructive text-lg font-bold text-destructive-foreground hover:bg-destructive/90"
          disabled={!openRecord || busy || !!openBreak}
          onClick={() => startPunch("out")}
        >
          <LogOut className="ms-2 size-6" /> יציאה
        </Button>
        <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          {activeMode === "home" ? (
            <>נדרשת הזנת הקוד היומי שקיבלתם מהמנהל</>
          ) : (
            <>
              <MapPin className="size-3" /> נדרשת סריקת הברקוד במקום העבודה ואישור מיקום
            </>
          )}
        </p>
      </div>

      <div className="card-soft overflow-hidden">
        <button
          className="flex w-full items-center justify-between px-5 py-4 text-right"
          onClick={() => setShowSummary((v) => !v)}
        >
          <span className="font-bold">סיכום חודשי — {new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" })}</span>
          <ChevronDown className={`size-5 transition-transform ${showSummary ? "rotate-180" : ""}`} />
        </button>

        {showSummary ? (
          <div className="border-t p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary p-3 text-center">
                <p className="text-xs text-muted-foreground">ימים מאושרים</p>
                <p className="text-2xl font-extrabold">{approved.length}</p>
              </div>
              <div className="rounded-lg bg-secondary p-3 text-center">
                <p className="text-xs text-muted-foreground">שעות מאושרות</p>
                <p className="text-2xl font-extrabold">{approvedHours.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-dashed p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">בונוס משוער לחודש</p>
                <p className="text-xl font-extrabold text-success">
                  {money(computeBonus(query.data?.stats?.sales_count ?? 0, query.data?.stats?.potential_revenue ?? 0))}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                לפי {query.data?.stats?.sales_count ?? 0} מכירות החודש. הבונוס משוער בלבד, מתעדכן אחת לשבוע, אינו מדויק
                ותקף רק לחודש הקלנדרי הנוכחי — בכפוף לאישור סופי של המנהל.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {records.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">אין דיווחים החודש</p>
              ) : (
                records.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{fmtDate(r.work_date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtTime(r.entry_time)} – {fmtTime(r.exit_time)}
                      </p>
                      {breakMinutes(r) ? (
                        <p className="text-xs text-muted-foreground">הפסקות: {fmtDuration(breakMinutes(r))}</p>
                      ) : null}
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{hoursOf(r, deductBreaks).toFixed(2)} ש׳</p>
                      <p
                        className={`text-xs ${r.status === "approved" ? "text-success" : r.status === "rejected" ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {statusLabel(r.status)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">* רק שעות שאושרו על ידי המנהל נכללות בסיכום.</p>
          </div>
        ) : null}
      </div>

      <QrScanDialog
        open={scan !== null}
        title={scan === "in" ? "סריקת ברקוד לכניסה" : "סריקת ברקוד ליציאה"}
        onClose={() => setScan(null)}
        onScan={handleScan}
      />

      <Dialog open={codePrompt !== null} onOpenChange={(v) => !v && setCodePrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-right">
              {codePrompt === "in" ? "קוד עבודה מהבית — כניסה" : "קוד עבודה מהבית — יציאה"}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const type = codePrompt;
              const code = homeCode;
              setCodePrompt(null);
              if (type) await submitPunch(code, type, "home");
            }}
          >
            <div className="space-y-2">
              <Label>קוד יומי</Label>
              <Input
                inputMode="numeric"
                autoFocus
                className="text-center text-2xl tracking-widest"
                value={homeCode}
                onChange={(e) => setHomeCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
              אישור
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
