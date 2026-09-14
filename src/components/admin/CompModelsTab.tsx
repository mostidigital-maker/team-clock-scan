import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteCompModel, listCompModels, saveCompModel } from "@/lib/admin.functions";
import { sortTiers, tierLabel, tierRange, type CompModel, type CompTier } from "@/lib/shared";

type Form = { id: string | null; name: string; active: boolean; tiers: CompTier[] };

const emptyForm: Form = {
  id: null,
  name: "",
  active: true,
  tiers: [{ min_sales: 0, max_sales: null, kind: "percent", value: 0 }],
};

export function CompModelsTab({ token }: { token: string }) {
  const list = useServerFn(listCompModels);
  const save = useServerFn(saveCompModel);
  const remove = useServerFn(deleteCompModel);
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const query = useQuery({ queryKey: ["comp-models", token], queryFn: () => list({ data: { token } }) });
  const models = (query.data ?? []) as CompModel[];

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          token,
          id: form!.id,
          name: form!.name,
          active: form!.active,
          tiers: form!.tiers.map((t) => ({
            min_sales: Math.max(0, Math.round(Number(t.min_sales) || 0)),
            max_sales: t.max_sales === null ? null : Math.max(0, Math.round(Number(t.max_sales) || 0)),
            kind: t.kind,
            value: Math.max(0, Number(t.value) || 0),
          })),
        },
      }),
    onSuccess: async () => {
      toast.success("המודל נשמר");
      setForm(null);
      await qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "שמירה נכשלה"),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { token, id } }),
    onSuccess: async () => {
      toast.success("המודל נמחק");
      await qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "מחיקה נכשלה"),
  });

  const setTier = (i: number, patch: Partial<CompTier>) =>
    setForm((f) => (f ? { ...f, tiers: f.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) } : f));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">מודלי תגמול</h2>
        <Button onClick={() => setForm({ ...emptyForm, tiers: [...emptyForm.tiers] })}>
          <Plus className="ms-1 size-4" /> מודל חדש
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {models.map((m) => (
          <div key={m.id} className="card-soft space-y-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.active ? "פעיל" : "לא פעיל"}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({
                      id: m.id,
                      name: m.name,
                      active: m.active,
                      tiers: sortTiers(m.tiers ?? []).map((t) => ({ ...t })),
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`למחוק את המודל "${m.name}"?`)) del.mutate(m.id);
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {sortTiers(m.tiers ?? []).map((t, i) => (
                <li key={i} className="flex justify-between border-t pt-1">
                  <span>{tierRange(t)} מכירות</span>
                  <span className="font-medium">{tierLabel(t)}</span>
                </li>
              ))}
              {(m.tiers ?? []).length === 0 ? <li className="text-muted-foreground">ללא מדרגות</li> : null}
            </ul>
          </div>
        ))}
        {models.length === 0 ? <p className="text-muted-foreground">אין מודלים עדיין</p> : null}
      </div>

      <Dialog open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">{form?.id ? "עריכת מודל" : "מודל חדש"}</DialogTitle>
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
                <Label>שם המודל</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>מודל פעיל</Label>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>

              <div className="space-y-2">
                <Label>מדרגות תגמול</Label>
                {form.tiers.map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2 rounded-md border p-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">ממכירות</span>
                      <Input
                        type="number"
                        min="0"
                        value={t.min_sales}
                        onChange={(e) => setTier(i, { min_sales: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">עד (ריק = ומעלה)</span>
                      <Input
                        type="number"
                        min="0"
                        value={t.max_sales ?? ""}
                        onChange={(e) => setTier(i, { max_sales: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">סוג</span>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                        value={t.kind}
                        onChange={(e) => setTier(i, { kind: e.target.value as "percent" | "fixed" })}
                      >
                        <option value="percent">אחוז מהפוטנציאל</option>
                        <option value="fixed">סכום קבוע</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">ערך</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={t.value}
                        onChange={(e) => setTier(i, { value: Number(e.target.value) })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, tiers: form.tiers.filter((_, idx) => idx !== i) })}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      tiers: [...form.tiers, { min_sales: 0, max_sales: null, kind: "percent", value: 0 }],
                    })
                  }
                >
                  <Plus className="ms-1 size-4" /> הוספת מדרגה
                </Button>
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
