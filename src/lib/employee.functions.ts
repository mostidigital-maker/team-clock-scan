import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getCompany = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./attendance.server");
  const { data } = await db
    .from("company_settings")
    .select("company_name, logo_url, deduct_breaks")
    .eq("id", true)
    .maybeSingle();
  return {
    company_name: data?.company_name ?? "מכללת המשווקים",
    logo_url: data?.logo_url ?? null,
    deduct_breaks: data?.deduct_breaks ?? true,
  };
});

export const employeeLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ idNumber: z.string().trim().min(4).max(20), fullName: z.string().trim().min(2).max(80) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db, createSession } = await import("./attendance.server");
    const { data: emp } = await db
      .from("employees")
      .select("*")
      .eq("id_number", data.idNumber)
      .maybeSingle();
    if (!emp || !emp.active) throw new Error("פרטי התחברות שגויים או עובד לא פעיל");
    if (emp.full_name.trim() !== data.fullName.trim()) throw new Error("פרטי התחברות שגויים או עובד לא פעיל");
    const token = await createSession("employee", emp.id);
    return { token };
  });

export const employeeState = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10), month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireEmployee, monthRange } = await import("./attendance.server");
    const emp = await requireEmployee(data.token);
    const { from, to } = monthRange(data.month);
    const { data: records } = await db
      .from("attendance")
      .select("*, attendance_breaks(*)")
      .eq("employee_id", emp.id)
      .gte("work_date", from)
      .lt("work_date", to)
      .order("work_date", { ascending: false });
    const { data: open } = await db
      .from("attendance")
      .select("*, attendance_breaks(*)")
      .eq("employee_id", emp.id)
      .is("exit_time", null)
      .not("entry_time", "is", null)
      .order("entry_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayRows } = await db
      .from("attendance")
      .select("*")
      .eq("employee_id", emp.id)
      .eq("work_date", today);
    return {
      employee: { id: emp.id, full_name: emp.full_name, id_number: emp.id_number },
      records: records ?? [],
      openRecord: open ?? null,
      finishedToday: (todayRows ?? []).some((r) => r.exit_time),
      openBreak:
        (open?.attendance_breaks ?? []).find((b: { end_time: string | null }) => !b.end_time) ?? null,
    };
  });

export const employeeBreak = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string().min(10), action: z.enum(["start", "end"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireEmployee } = await import("./attendance.server");
    const emp = await requireEmployee(data.token);
    const { data: open } = await db
      .from("attendance")
      .select("id")
      .eq("employee_id", emp.id)
      .is("exit_time", null)
      .not("entry_time", "is", null)
      .order("entry_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!open) throw new Error("אין משמרת פתוחה");
    const { data: openBreak } = await db
      .from("attendance_breaks")
      .select("*")
      .eq("attendance_id", open.id)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data.action === "start") {
      if (openBreak) throw new Error("כבר יצאת להפסקה");
      const { error } = await db
        .from("attendance_breaks")
        .insert({ attendance_id: open.id, start_time: new Date().toISOString() });
      if (error) throw new Error(error.message);
    } else {
      if (!openBreak) throw new Error("לא נמצאה הפסקה פתוחה");
      const { error } = await db
        .from("attendance_breaks")
        .update({ end_time: new Date().toISOString() })
        .eq("id", openBreak.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const employeePunch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(10),
        qrToken: z.string().min(4),
        type: z.enum(["in", "out"]),
        mode: z.enum(["site", "home"]).default("site"),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireEmployee, validateQr } = await import("./attendance.server");
    const emp = await requireEmployee(data.token);
    const qr = await validateQr(data.qrToken, data.mode === "home" ? "home" : "qr");
    const now = new Date().toISOString();

    const { data: open } = await db
      .from("attendance")
      .select("*")
      .eq("employee_id", emp.id)
      .is("exit_time", null)
      .not("entry_time", "is", null)
      .order("entry_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data.type === "in") {
      if (open) throw new Error("כבר דיווחת כניסה. יש לדווח יציאה תחילה.");
      const { error } = await db.from("attendance").insert({
        employee_id: emp.id,
        work_date: now.slice(0, 10),
        entry_time: now,
        entry_latitude: data.latitude ?? null,
        entry_longitude: data.longitude ?? null,
        qr_code_id: qr.id,
        work_mode: data.mode,
        status: "pending",
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (!open) throw new Error("לא נמצאה כניסה פתוחה.");
    const { error } = await db
      .from("attendance")
      .update({
        exit_time: now,
        exit_latitude: data.latitude ?? null,
        exit_longitude: data.longitude ?? null,
        exit_qr_code_id: qr.id,
      })
      .eq("id", open.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });