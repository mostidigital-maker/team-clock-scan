import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrPreview } from "@/components/admin/QrPreview";
import { createQrCode, listQrCodes, setQrActive } from "@/lib/admin.functions";
import type { QrCode } from "@/lib/shared";

function defaultUntil() {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function QrTab({ token }: { token: string }) {
  const list = useServerFn(listQrCodes);
  const create = useServerFn(createQrCode);
  const toggle = useServerFn(setQrActive);
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [validUntil, setValidUntil] = useState(defaultUntil());
  const [homeLabel, setHomeLabel] = useState("");
  const [homeUntil, setHomeUntil] = useState(defaultUntil());

  const query = useQuery({ queryKey: ["qr-codes", token], queryFn: () => list({ data: { token } }) });
  const all = (query.data ?? []) as QrCode[];
  const codes = all.filter((c) => (c.kind ?? "qr") === "qr");
  const homeCodes = all.filter((c) => c.kind === "home");
  const active = codes.find((c) => c.active && new Date(c.valid_until) > new Date());
  const activeHome = homeCodes.find((c) => c.active && new Date(c.valid_until) > new Date());

  const createMutation = useMutation({
    mutationFn: () => create({ data: { token, label, valid_until: validUntil, kind: "qr" } }),
    onSuccess: async () => {
      toast.success("נוצר ברקוד חדש");
      setLabel("");
      await qc.invalidateQueries({ queryKey: ["qr-codes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createHomeMutation = useMutation({
    mutationFn: () => create({ data: { token, label: homeLabel, valid_until: homeUntil, kind: "home" } }),
    onSuccess: async () => {
      toast.success("נוצר קוד עבודה מהבית");
      setHomeLabel("");
      await qc.invalidateQueries({ queryKey: ["qr-codes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: { token, ...v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qr-codes"] }),
  });

  return (
    <div className="space-y-4">
      <div className="card-soft p-5">
        <h2 className="text-lg font-bold">הברקוד הפעיל</h2>
        {active ? (
          <div className="mt-4 flex flex-col items-center gap-3 text-center">
            <QrPreview value={active.token} />
            <p className="text-sm font-medium">{active.label || "ללא תיאור"}</p>
            <p className="text-xs text-muted-foreground">
              בתוקף עד: {new Date(active.valid_until).toLocaleString("he-IL")}
            </p>
            <Button variant="outline" onClick={() => window.print()}>
              הדפסה
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">אין ברקוד פעיל. צרו ברקוד חדש למטה.</p>
        )}
      </div>

      <div className="card-soft space-y-3 p-5">
        <h3 className="font-bold">יצירת ברקוד חדש</h3>
        <p className="text-xs text-muted-foreground">יצירת ברקוד חדש מבטלת אוטומטית את הברקוד הקודם.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>תיאור</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="למשל: כניסה ראשית" />
          </div>
          <div className="space-y-1">
            <Label>בתוקף עד</Label>
            <Input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          יצירת ברקוד
        </Button>
      </div>

      <div className="card-soft space-y-3 p-5">
        <h2 className="text-lg font-bold">קוד עבודה מהבית</h2>
        {activeHome ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="rounded-lg bg-secondary px-6 py-4 text-4xl font-extrabold tracking-widest">
              {activeHome.token}
            </p>
            <p className="text-sm font-medium">{activeHome.label || "ללא תיאור"}</p>
            <p className="text-xs text-muted-foreground">
              בתוקף עד: {new Date(activeHome.valid_until).toLocaleString("he-IL")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">אין קוד פעיל לעבודה מהבית. צרו קוד חדש למטה.</p>
        )}
        <p className="text-xs text-muted-foreground">יצירת קוד חדש מבטלת אוטומטית את הקוד הקודם.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>תיאור</Label>
            <Input value={homeLabel} onChange={(e) => setHomeLabel(e.target.value)} placeholder="למשל: קוד יומי" />
          </div>
          <div className="space-y-1">
            <Label>בתוקף עד</Label>
            <Input type="datetime-local" value={homeUntil} onChange={(e) => setHomeUntil(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => createHomeMutation.mutate()} disabled={createHomeMutation.isPending}>
          יצירת קוד
        </Button>
        {homeCodes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-secondary text-xs">
                <tr>
                  <th className="p-3">קוד</th>
                  <th className="p-3">תיאור</th>
                  <th className="p-3">בתוקף עד</th>
                  <th className="p-3">סטטוס</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {homeCodes.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-bold tracking-widest">{c.token}</td>
                    <td className="p-3">{c.label || "—"}</td>
                    <td className="p-3">{new Date(c.valid_until).toLocaleString("he-IL")}</td>
                    <td className="p-3">{c.active ? "פעיל" : "מבוטל"}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
                      >
                        {c.active ? "ביטול" : "הפעלה"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="card-soft overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-secondary text-xs">
            <tr>
              <th className="p-3">תיאור</th>
              <th className="p-3">נוצר</th>
              <th className="p-3">בתוקף עד</th>
              <th className="p-3">סטטוס</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.label || "—"}</td>
                <td className="p-3">{new Date(c.valid_from).toLocaleDateString("he-IL")}</td>
                <td className="p-3">{new Date(c.valid_until).toLocaleString("he-IL")}</td>
                <td className="p-3">{c.active ? "פעיל" : "מבוטל"}</td>
                <td className="p-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
                  >
                    {c.active ? "ביטול" : "הפעלה"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}