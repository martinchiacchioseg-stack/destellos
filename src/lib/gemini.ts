import "server-only";
import { GoogleGenAI } from "@google/genai";
import { envOpt } from "./env";
import { ALMA_ROLF } from "./persona";

const MODELO = "gemini-2.5-flash";
let ai: GoogleGenAI | null = null;

function cliente(): GoogleGenAI | null {
  const key = envOpt("GEMINI_API_KEY");
  if (!key) return null;
  if (!ai) ai = new GoogleGenAI({ apiKey: key });
  return ai;
}

export const geminiConfigurado = () => !!envOpt("GEMINI_API_KEY");

/** Texto libre de Arlequín. Devuelve null si Gemini no está disponible (el llamador usa su fallback). */
export async function decir(instruccion: string, extra = ""): Promise<string | null> {
  const c = cliente();
  if (!c) return null;
  try {
    const r = await c.models.generateContent({
      model: MODELO,
      contents: instruccion,
      config: { systemInstruction: `${ALMA_ROLF}\n${extra}`.trim(), temperature: 0.9, maxOutputTokens: 400 },
    });
    return r.text?.trim() || null;
  } catch (e) {
    console.error("[gemini:decir]", e);
    return null;
  }
}

/** Respuesta JSON estructurada. Devuelve null ante cualquier falla. */
export async function jsonGemini<T>(instruccion: string, imagen?: { data: Buffer; mime: string }[]): Promise<T | null> {
  const c = cliente();
  if (!c) return null;
  try {
    const partes: object[] = [{ text: instruccion }];
    for (const i of imagen ?? []) partes.push({ inlineData: { mimeType: i.mime, data: i.data.toString("base64") } });
    const r = await c.models.generateContent({
      model: MODELO,
      contents: [{ role: "user", parts: partes }],
      config: {
        systemInstruction: ALMA_ROLF,
        responseMimeType: "application/json",
        temperature: 0.8,
      },
    });
    return JSON.parse(r.text ?? "null") as T;
  } catch (e) {
    console.error("[gemini:json]", e);
    return null;
  }
}
