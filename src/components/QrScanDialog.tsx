import { useEffect, useRef, useState } from "react";
import QrScannerLib from "qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onScan: (value: string) => void;
};

/** Camera-only barcode/QR scanner. Manual entry and image upload are not allowed. */
export function QrScanDialog({ open, title, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let scanner: QrScannerLib | null = null;
    let done = false;
    setError(null);

    scanner = new QrScannerLib(
      videoRef.current,
      (result) => {
        if (done) return;
        done = true;
        scanner?.stop();
        onScan(result.data);
      },
      { preferredCamera: "environment", highlightScanRegion: true, maxScansPerSecond: 5 },
    );

    scanner.start().catch(() => {
      setError("לא ניתן לגשת למצלמה. יש לאשר הרשאת מצלמה בדפדפן.");
    });

    return () => {
      scanner?.stop();
      scanner?.destroy();
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right">{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-center text-sm text-muted-foreground">כוונו את המצלמה לברקוד שבמקום העבודה</p>
        )}
      </DialogContent>
    </Dialog>
  );
}