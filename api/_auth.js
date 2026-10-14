// Controllo comune: la password dell'app (APP_PASSWORD) arriva nell'intestazione x-app-password.
import { timingSafeEqual } from "node:crypto";

export function passwordOk(req) {
  const attesa = Buffer.from(process.env.APP_PASSWORD || "");
  const data = Buffer.from(String(req.headers["x-app-password"] || ""));
  return attesa.length > 0 && attesa.length === data.length && timingSafeEqual(attesa, data);
}
