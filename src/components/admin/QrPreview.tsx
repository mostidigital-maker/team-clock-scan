import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrPreview({ value, size = 220 }: { value: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 1 }).then(setSrc).catch(() => setSrc(""));
  }, [value, size]);
  if (!src) return null;
  return <img src={src} alt="ברקוד נוכחות פעיל" width={size} height={size} className="rounded-md bg-white p-2" />;
}