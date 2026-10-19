import "server-only";
import { GoogleGenAI } from "@google/genai";
import { envOpt } from "./env";
import { ALMA_ROLF } from "./persona";

const MODELOS = ["gemini-2.0-flash", "gemini-1.5-flash"];
let ai: GoogleGenAI | null = null;

function obtenerKey(): string | null {
  return (
    envOpt("GEMINI_API_KEY") ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    null
  );
}

function cliente(): GoogleGenAI | null {
  const key = obtenerKey();
  if (!key) return null;
  if (!ai) ai = new GoogleGenAI({ apiKey: key });
  return ai;
}

export const geminiConfigurado = () => !!obtenerKey();

/** Texto libre de Arlequín. Devuelve null si Gemini no está disponible (el llamador usa su fallback). */
export async function decir(instruccion: string, extra = ""): Promise<string | null> {
  const c = cliente();
  if (!c) return null;

  for (const modelo of MODELOS) {
    try {
      const r = await c.models.generateContent({
        model: modelo,
        contents: instruccion,
        config: { systemInstruction: `${ALMA_ROLF}\n${extra}`.trim(), temperature: 0.9, maxOutputTokens: 400 },
      });
      const t = r.text?.trim();
      if (t) return t;
    } catch (e) {
      console.warn(`[gemini:decir con ${modelo}]`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/** Respuesta JSON estructurada. Devuelve null ante cualquier falla. */
export async function jsonGemini<T>(instruccion: string, imagen?: { data: Buffer; mime: string }[]): Promise<T | null> {
  const c = cliente();
  if (!c) return null;

  for (const modelo of MODELOS) {
    try {
      const partes: object[] = [{ text: instruccion }];
      for (const i of imagen ?? []) partes.push({ inlineData: { mimeType: i.mime, data: i.data.toString("base64") } });
      const r = await c.models.generateContent({
        model: modelo,
        contents: [{ role: "user", parts: partes }],
        config: {
          systemInstruction: ALMA_ROLF,
          responseMimeType: "application/json",
          temperature: 0.85,
        },
      });
      const raw = r.text?.trim() ?? "null";
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`[gemini:json con ${modelo}]`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}
