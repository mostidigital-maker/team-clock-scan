import { useEffect, useRef, useState } from "react";
import QrScannerLib from "qr-scanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onScan: (value: string) => void;
};

/**
 * Camera-only QR scanner.
 * No manual entry and no image upload.
 */
export function QrScanDialog({
  open,
  title,
  onClose,
  onScan,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScannerLib | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      setError(null);
      setStarting(true);

      // Wait until the Dialog/video element is actually mounted.
      await new Promise((resolve) => setTimeout(resolve, 150));

      const video = videoRef.current;

      if (!video || cancelled) {
        setStarting(false);
        return;
      }

      try {
        // Make sure camera access is available.
        if (!window.isSecureContext) {
          throw new Error(
            "האתר חייב לפעול באמצעות HTTPS כדי להשתמש במצלמה."
          );
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "הדפדפן אינו תומך בגישה למצלמה."
          );
        }

        // Explicitly request camera permission.
        // This should trigger the browser's camera permission dialog.
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        // Stop the temporary permission stream.
        testStream.getTracks().forEach((track) => track.stop());

        if (cancelled) return;

        const scanner = new QrScannerLib(
          video,
          (result) => {
            if (cancelled) return;

            const value =
              typeof result === "string"
                ? result
                : result.data;

            scanner.stop();

            onScan(value);
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 10,
          }
        );

        scannerRef.current = scanner;

        await scanner.start();

        if (!cancelled) {
          setStarting(false);
        }
      } catch (err) {
        console.error("QR scanner error:", err);

        if (cancelled) return;

        setStarting(false);

        const message =
          err instanceof Error ? err.message : "";

        if (
          message.includes("Permission") ||
          message.includes("NotAllowed") ||
          message.includes("denied")
        ) {
          setError(
            "יש לאפשר גישה למצלמה כדי לדווח כניסה או יציאה."
          );
        } else if (
          message.includes("NotFound") ||
          message.includes("camera")
        ) {
          setError(
            "לא נמצאה מצלמה במכשיר."
          );
        } else {
          setError(
            "לא ניתן לפתוח את המצלמה. יש לאשר הרשאת מצלמה בדפדפן ולנסות שוב."
          );
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;

      const scanner = scannerRef.current;

      if (scanner) {
        scanner.stop();
        scanner.destroy();
        scannerRef.current = null;
      }

      const video = videoRef.current;

      if (video?.srcObject instanceof MediaStream) {
        video.srcObject
          .getTracks()
          .forEach((track) => track.stop());

        video.srcObject = null;
      }
    };
  }, [open, onScan]);

  const handleRetry = () => {
    setError(null);

    // Close and reopen the scanner component.
    onClose();

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("retry-qr-scanner")
      );
    }, 100);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-black aspect-square">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {starting && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-center p-4">
                פותח מצלמה...
              </div>
            )}
          </div>

          {error ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full rounded-lg bg-black px-4 py-3 text-white"
              >
                נסה שוב
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              כוונו את המצלמה לברקוד שבמקום העבודה
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
