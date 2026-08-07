import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const db = supabaseAdmin;

export async function sha256(salt: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(salt + password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SESSION_DAYS = 30;

export async function createSession(kind: "employee" | "admin", employeeId: string | null) {
  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  const { error } = await db
    .from("app_sessions")
    .insert({ token, kind, employee_id: employeeId, expires_at: expires });
  if (error) throw new Error(error.message);
  return token;
}

export async function requireEmployee(token: string) {
  const { data } = await db
    .from("app_sessions")
    .select("employee_id, kind, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.kind !== "employee" || !data.employee_id || new Date(data.expires_at) < new Date()) {
    throw new Error("UNAUTHORIZED");
  }
  const { data: employee } = await db
    .from("employees")
    .select("*")
    .eq("id", data.employee_id)
    .maybeSingle();
  if (!employee || !employee.active) throw new Error("UNAUTHORIZED");
  return employee;
}

export async function requireAdmin(token: string) {
  const { data } = await db
    .from("app_sessions")
    .select("kind, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.kind !== "admin" || new Date(data.expires_at) < new Date()) {
    throw new Error("UNAUTHORIZED");
  }
  return true;
}

export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1));
  const end = new Date(Date.UTC(y!, m!, 1));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export async function validateQr(qrToken: string) {
  const { data } = await db
    .from("qr_codes")
    .select("*")
    .eq("token", qrToken.trim())
    .maybeSingle();
  if (!data) throw new Error("QR_INVALID");
  const now = new Date();
  if (!data.active || new Date(data.valid_from) > now || new Date(data.valid_until) < now) {
    throw new Error("QR_EXPIRED");
  }
  return data;
}