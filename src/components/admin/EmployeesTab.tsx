import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminOverview, saveEmployee } from "@/lib/admin.functions";
import { currentMonth, money, type Employee } from "@/lib/shared";

const empty = {
  id: null as string | null,
  full_name: "",
  id_number: "",
  hourly_wage: 0,
  travel: 0,
  bonus: 0,
  active: true,
};

export function EmployeesTab({ token }: { token: string }) {
  const overview = useServerFn(adminOverview);
  const save = useServerFn(saveEmployee);
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof empty | null>(null);

  const query = useQuery({
    queryKey: ["admin-overview", token, currentMonth()],
    queryFn: () => overview({ data: { token, month: currentMonth() } }),
  });

  const mutation = useMutation({
    mutationFn: () => save({ data: { token, ...form! } }),
    onSuccess: async () => {
      toast.success("נשמר בהצלחה");
      setForm(null);
      await qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "שמירה נכשלה"),
  });

  const employees = (query.data?.employees ?? []) as Employee[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">עובדים</h2>
        <Button onClick={() => setForm({ ...empty })}>
          <Plus className="ms-1 size-4" /> הוספת עובד
        </Button>
      </div>

      <div className="card-soft overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-secondary text-xs">
            <tr>
              <th className="p-3">שם</th>
              <th className="p-3">ת״ז</th>
              <th className="p-3">שכר שעתי</th>
              <th className="p-3">נסיעות</th>
              <th className="p-3">בונוס</th>
              <th className="p-3">סטטוס</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 font-medium">{e.full_name}</td>
                <td className="p-3">{e.id_number}</td>
                <td className="p-3">{money(Number(e.hourly_wage))}</td>
                <td className="p-3">{money(Number(e.travel))}</td>
                <td className="p-3">{money(Number(e.bonus))}</td>
                <td className="p-3">
                  <span className={e.active ? "text-success" : "text-muted-foreground"}>
                    {e.active ? "פעיל" : "לא פעיל"}
                  </span>
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm({
                        id: e.id,
                        full_name: e.full_name,
                        id_number: e.id_number,
                        hourly_wage: Number(e.hourly_wage),
                        travel: Number(e.travel),
                        bonus: Number(e.bonus),
                        active: e.active,
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  אין עובדים עדיין
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-right">{form?.id ? "עריכת עובד" : "עובד חדש"}</DialogTitle>
          </DialogHeader>
          {form ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="space-y-1">
                <Label>שם מלא</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>תעודת זהות</Label>
                <Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>שכר שעתי</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.hourly_wage}
                    onChange={(e) => setForm({ ...form, hourly_wage: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>נסיעות</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.travel}
                    onChange={(e) => setForm({ ...form, travel: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>בונוס</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.bonus}
                    onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>עובד פעיל</Label>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                שמירה
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}