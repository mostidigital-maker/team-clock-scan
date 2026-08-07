export function getPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("הדפדפן אינו תומך באיתור מיקום"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => reject(new Error("נדרשת הרשאת מיקום כדי לדווח נוכחות")),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}