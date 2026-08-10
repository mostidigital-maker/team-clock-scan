import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenOnly = z.object({ token: z.string().min(10) });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ username: z.string().trim().min(2).max(40), password: z.string().min(4).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db, sha256, createSession } = await import("./attendance.server");
    const { data: user } = await db
      .from("admin_users")
      .select("*")
      .eq("username", data.username.toLowerCase())
      .maybeSingle();
    if (!user) throw new Error("שם משתמש או סיסמה שגויים");
    const hash = await sha256(user.salt, data.password);
    if (hash !== user.password_hash) throw new Error("שם משתמש או סיסמה שגויים");
    const token = await createSession("admin", null);
    return { token };
  });

export const adminOverview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenOnly.extend({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireAdmin, monthRange } = await import("./attendance.server");
    await requireAdmin(data.token);
    const { from, to } = monthRange(data.month);
    const { data: employees } = await db.from("employees").select("*").order("full_name");
    const { data: records } = await db
      .from("attendance")
      .select("*, attendance_breaks(*)")
      .gte("work_date", from)
      .lt("work_date", to);
    const { count: working } = await db
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .is("exit_time", null)
      .not("entry_time", "is", null);
    const { data: openRows } = await db
      .from("attendance")
      .select("id, employee_id, work_mode, entry_time, employees(full_name), attendance_breaks(*)")
      .is("exit_time", null)
      .not("entry_time", "is", null)
      .order("entry_time", { ascending: true });
    const live = (openRows ?? []).map((r) => {
      const breaks = (r as unknown as { attendance_breaks?: { start_time: string; end_time: string | null }[] })
        .attendance_breaks ?? [];
      const openBreak = breaks.find((b) => !b.end_time) ?? null;
      return {
        id: r.id,
        employee_id: r.employee_id,
        employee_name: (r as unknown as { employees?: { full_name: string } }).employees?.full_name ?? "",
        work_mode: (r as unknown as { work_mode?: string }).work_mode ?? "site",
        entry_time: r.entry_time,
        on_break: !!openBreak,
        break_start: openBreak?.start_time ?? null,
      };
    });
    return { employees: employees ?? [], records: records ?? [], working: working ?? 0, live };
  });

export const adminAttendance = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenOnly.extend({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireAdmin, monthRange } = await import("./attendance.server");
    await requireAdmin(data.token);
    const { from, to } = monthRange(data.month);
    const { data: records } = await db
      .from("attendance")
      .select("*, employees(full_name), attendance_breaks(*)")
      .gte("work_date", from)
      .lt("work_date", to)
      .order("work_date", { ascending: false });
    return (records ?? []).map((r) => ({
      ...r,
      employee_name: (r as unknown as { employees?: { full_name: string } }).employees?.full_name ?? "",
    }));
  });

export const saveEmployee = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenOnly
      .extend({
        id: z.string().uuid().nullable(),
        full_name: z.string().trim().min(2).max(80),
        id_number: z.string().trim().min(4).max(20),
        hourly_wage: z.number().min(0).max(10000),
        travel: z.number().min(0).max(100000),
        bonus: z.number().min(0).max(1000000),
        active: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireAdmin } = await import("./attendance.server");
    await requireAdmin(data.token);
    const { token, id, ...values } = data;
    void token;
    if (id) {
      const { error } = await db.from("employees").update(values).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("employees").insert(values);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const saveAttendance = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenOnly
      .extend({
        id: z.string().uuid().nullable(),
        employee_id: z.string().uuid(),
        work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        entry_time: z.string().nullable(),
        exit_time: z.string().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireAdmin } = await import("./attendance.server");
    await requireAdmin(data.token);
    const values = {
      employee_id: data.employee_id,
      work_date: data.work_date,
      entry_time: data.entry_time ? new Date(data.entry_time).toISOString() : null,
      exit_time: data.exit_time ? new Date(data.exit_time).toISOString() : null,
    };
    if (data.id) {
      const { error } = await db.from("attendance").update(values).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("attendance").insert({ ...values, status: "pending" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setAttendanceStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenOnly.extend({ id: z.string().uuid(), status: z.enum(["pending", "approved", "rejected"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireAdmin } = await import("./attendance.server");
    await requireAdmin(data.token);
    const { error } = await db
      .from("attendance")
      .update({
        status: data.status,
        approved_by: data.status === "approved" ? "admin" : null,
        approved_at: data.status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAttendance = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenOnly.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireAdmin } = await import("./attendance.server");
    await requireAdmin(data.token);
    const { error } = await db.from("attendance").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listQrCodes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenOnly.parse(d))
  .handler(async ({ data }) => {
    const { db, requireAdmin } = await import("./attendance.server");
    await requireAdmin(data.token);
    const { data: rows } = await db.from("qr_codes").select("*").order("created_at", { ascending: false }).limit(60);
    return rows ?? [];
  });

export const createQrCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenOnly
      .extend({
        label: z.string().trim().max(60),
        valid_until: z.string().min(10),
        kind: z.enum(["qr", "home"]).default("qr"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireAdmin } = await import("./attendance.server");
    await requireAdmin(data.token);
    await db.from("qr_codes").update({ active: false }).eq("active", true).eq("kind", data.kind);
    const token =
      data.kind === "home"
        ? String(Math.floor(100000 + Math.random() * 900000))
        : "ATT-" + crypto.randomUUID();
    const { error } = await db.from("qr_codes").insert({
      token,
      label: data.label,
      kind: data.kind,
      valid_until: new Date(data.valid_until).toISOString(),
      active: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setQrActive = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenOnly.extend({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { db, requireAdmin } = await import("./attendance.server");
    await requireAdmin(data.token);
    if (data.active) {
      const { data: row } = await db.from("qr_codes").select("kind").eq("id", data.id).maybeSingle();
      await db.from("qr_codes").update({ active: false }).eq("active", true).eq("kind", row?.kind ?? "qr");
    }
    const { error } = await db.from("qr_codes").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCompany = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenOnly
      .extend({
        company_name: z.string().trim().min(2).max(80),
        logo_url: z.string().max(600000).nullable(),
        deduct_breaks: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireAdmin } = await import("./attendance.server");
    await requireAdmin(data.token);
    const { error } = await db
      .from("company_settings")
      .update({
        company_name: data.company_name,
        logo_url: data.logo_url,
        ...(data.deduct_breaks === undefined ? {} : { deduct_breaks: data.deduct_breaks }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenOnly.extend({ currentPassword: z.string().min(4), newPassword: z.string().min(6).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db, requireAdmin, sha256 } = await import("./attendance.server");
    await requireAdmin(data.token);
    const { data: user } = await db.from("admin_users").select("*").eq("username", "admin").maybeSingle();
    if (!user) throw new Error("לא נמצא מנהל");
    if ((await sha256(user.salt, data.currentPassword)) !== user.password_hash) {
      throw new Error("הסיסמה הנוכחית שגויה");
    }
    const salt = crypto.randomUUID();
    const { error } = await db
      .from("admin_users")
      .update({ salt, password_hash: await sha256(salt, data.newPassword) })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });