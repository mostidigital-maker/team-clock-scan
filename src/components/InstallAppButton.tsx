import { useEffect, useState } from "react";
import { Download, Share, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document));

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      setPromptEvent(null);
      return;
    }
    setShowHelp(true);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick}>
        <Download className="ms-1 size-4" /> התקנת האפליקציה
      </Button>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>התקנת האפליקציה במכשיר</DialogTitle>
          </DialogHeader>

          {isIos ? (
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Share className="mt-0.5 size-4 shrink-0" />
                <span>פתחו את האתר בדפדפן Safari והקישו על כפתור השיתוף בתחתית המסך.</span>
              </li>
              <li className="flex items-start gap-2">
                <Plus className="mt-0.5 size-4 shrink-0" />
                <span>גללו ובחרו באפשרות «הוסף למסך הבית».</span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="mt-0.5 size-4 shrink-0" />
                <span>אשרו בלחיצה על «הוסף» — סמל האפליקציה יופיע במסך הבית.</span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm">
              <li>1. פתחו את תפריט הדפדפן (שלוש נקודות בפינה העליונה).</li>
              <li>2. בחרו «התקן אפליקציה» או «הוספה למסך הבית».</li>
              <li>3. אשרו — סמל האפליקציה יתווסף למסך הבית של המכשיר.</li>
            </ol>
          )}

          <p className="text-xs text-muted-foreground">
            לאחר ההתקנה ניתן לדווח כניסה ויציאה ישירות מסמל האפליקציה, ללא פתיחת דפדפן.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}