import "server-only";
import { envOpt } from "./env";

export const mailConfigurado = () => !!envOpt("RESEND_API_KEY");

/** Envía un email vía Resend. Devuelve false (sin romper el flujo) si no está configurado o falla. */
export async function enviarMail(opts: { para: string; asunto: string; texto: string; html?: string }): Promise<boolean> {
  const key = envOpt("RESEND_API_KEY");
  if (!key || !opts.para) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: envOpt("MAIL_FROM") ?? "Destellos <onboarding@resend.dev>",
        to: [opts.para],
        subject: opts.asunto,
        text: opts.texto,
        html: opts.html,
      }),
    });
    if (!r.ok) console.error("[mail]", r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.error("[mail]", e);
    return false;
  }
}

export const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
