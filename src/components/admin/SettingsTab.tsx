import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeAdminPassword, saveCompany } from "@/lib/admin.functions";
import { getCompany } from "@/lib/employee.functions";

export function SettingsTab({ token }: { token: string }) {
  const save = useServerFn(saveCompany);
  const changePassword = useServerFn(changeAdminPassword);
  const qc = useQueryClient();
  const company = useQuery({ queryKey: ["company"], queryFn: () => getCompany() });

  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");

  useEffect(() => {
    if (company.data) {
      setName(company.data.company_name);
      setLogo(company.data.logo_url);
    }
  }, [company.data]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { token, company_name: name, logo_url: logo } }),
    onSuccess: async () => {
      toast.success("ההגדרות נשמרו");
      await qc.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePassword({ data: { token, currentPassword, newPassword } }),
    onSuccess: () => {
      toast.success("הסיסמה עודכנה");
      setCurrent("");
      setNew("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 400000) {
      toast.error("הקובץ גדול מדי (עד 400KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="card-soft space-y-4 p-5">
        <h2 className="text-lg font-bold">הגדרות חברה</h2>
        <div className="space-y-1">
          <Label>שם החברה</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>לוגו</Label>
          <div className="flex items-center gap-3">
            {logo ? <img src={logo} alt="לוגו החברה" className="h-14 w-14 rounded-md object-contain" /> : null}
            <Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
            {logo ? (
              <Button variant="ghost" onClick={() => setLogo(null)}>
                הסרה
              </Button>
            ) : null}
          </div>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          שמירה
        </Button>
      </div>

      <div className="card-soft space-y-4 p-5">
        <h2 className="text-lg font-bold">שינוי סיסמת מנהל</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>סיסמה נוכחית</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>סיסמה חדשה</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => passwordMutation.mutate()} disabled={passwordMutation.isPending}>
          עדכון סיסמה
        </Button>
      </div>
    </div>
  );
}