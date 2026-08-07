import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminAttendance, adminOverview, deleteAttendance, saveAttendance, setAttendanceStatus } from "@/lib/admin.functions";
import { currentMonth, fmtDate, fmtTime, hoursOf, statusLabel, type AttendanceRow, type Employee } from "@/lib/shared";

function toLocalInput(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

type FormState = {
  id: string | null;
  employee_id: string;
  work_date: string;
  entry_time: string;
  exit_time: string;
};

export function AttendanceTab({ token, month, setMonth }: { token: string; month: string; setMonth: (m: string) => void }) {
  const listFn = useServerFn(adminAttendance);
  const overviewFn = useServerFn(adminOverview);
  const saveFn = useServerFn(saveAttendance);
  const statusFn = useServerFn(setAttendanceStatus);
  const deleteFn = useServerFn(deleteAttendance);
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  const records = useQuery({
    queryKey: ["admin-attendance", token, month],
    queryFn: () => listFn({ data: { token, month } }),
  });
  const employees = useQuery({
    queryKey: ["admin-overview", token, currentMonth()],
    queryFn: () => overviewFn({ data: { token, month: currentMonth() } }),
  });

  const rows = (records.data ?? []) as AttendanceRow[];
  const employeeList = (employees.data?.employees ?? []) as Employee[];

  const refresh = () => qc.invalidateQueries();

  const saveMutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          token,
          id: form!.id,
          employee_id: form!.employee_id,
          work_date: form!.work_date,
          entry_time: form!.entry_time || null,
          exit_time: form!.exit_time || null,
        },
      }),
    onSuccess: async () => {
      toast.success("נשמר");
      setForm(null);
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" | "pending" }) => statusFn({ data: { token, ...v } }),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { token, id } }),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">נוכחות</h2>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          <Button
            onClick={() =>
              setForm({
                id: null,
                employee_id: employeeList[0]?.id ?? "",
                work_date: new Date().toISOString().slice(0, 10),
                entry_time: "",
                exit_time: "",
              })
            }
          >
            <Plus className="ms-1 size-4" /> רישום ידני
          </Button>
        </div>
      </div>

      <div className="card-soft overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-secondary text-xs">
            <tr>
              <th className="p-3">עובד</th>
              <th className="p-3">תאריך</th>
              <th className="p-3">כניסה</th>
              <th className="p-3">יציאה</th>
              <th className="p-3">שעות</th>
              <th className="p-3">מיקום</th>
              <th className="p-3">סטטוס</th>
              <th className="p-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.employee_name}</td>
                <td className="p-3">{fmtDate(r.work_date)}</td>
                <td className="p-3">{fmtTime(r.entry_time)}</td>
                <td className="p-3">{fmtTime(r.exit_time)}</td>
                <td className="p-3 font-bold">{hoursOf(r).toFixed(2)}</td>
                <td className="p-3">
                  {r.entry_latitude ? (
                    <a
                      className="inline-flex items-center gap-1 text-primary underline"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps?q=${r.entry_latitude},${r.entry_longitude}`}
                    >
                      <MapPin className="size-3" /> מפה
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={
                      r.status === "approved" ? "text-success" : r.status === "rejected" ? "text-destructive" : ""
                    }
                  >
                    {statusLabel(r.status)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="אישור"
                      onClick={() => statusMutation.mutate({ id: r.id, status: "approved" })}
                    >
                      <Check className="size-4 text-success" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="ביטול אישור"
                      onClick={() => statusMutation.mutate({ id: r.id, status: "pending" })}
                    >
                      <X className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="עריכה"
                      onClick={() =>
                        setForm({
                          id: r.id,
                          employee_id: r.employee_id,
                          work_date: r.work_date,
                          entry_time: toLocalInput(r.entry_time),
                          exit_time: toLocalInput(r.exit_time),
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="מחיקה" onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  אין רישומים בחודש זה
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-right">{form?.id ? "עריכת שעות" : "רישום נוכחות ידני"}</DialogTitle>
          </DialogHeader>
          {form ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-1">
                <Label>עובד</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  required
                >
                  {employeeList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>תאריך</Label>
                <Input
                  type="date"
                  value={form.work_date}
                  onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>כניסה</Label>
                  <Input
                    type="datetime-local"
                    value={form.entry_time}
                    onChange={(e) => setForm({ ...form, entry_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>יציאה</Label>
                  <Input
                    type="datetime-local"
                    value={form.exit_time}
                    onChange={(e) => setForm({ ...form, exit_time: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                שמירה
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}