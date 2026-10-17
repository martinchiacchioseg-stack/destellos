import { z } from "zod";
import { api } from "@/lib/http";
import { db, must } from "@/lib/db";
import { grupoPorCodigo, licenciaPermiteAcceso } from "@/lib/grupos";
import { hashPassword } from "@/lib/auth";
import { crearSesion } from "@/lib/session";
import { ApiError } from "@/lib/env";
import { subirImagen, borrarArchivos } from "@/lib/storage";
import { soloDigitos } from "@/lib/usuarios";
import { decir } from "@/lib/gemini";
import { enviarMail, escapar } from "@/lib/mail";
import { firmar } from "@/lib/storage";

const Campos = z.object({
  codigo: z.string().min(2),
  nombre: z.string().trim().min(2, "Escribí tu nombre completo.").max(80),
  apodo: z.string().trim().max(30).optional(),
  nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida.").optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().email("Email inválido.").max(120).optional().or(z.literal("")),
  password: z.string().min(6, "La clave debe tener al menos 6 caracteres.").max(100),
});

const vacio = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() ? v : undefined);

/** Alta de un nuevo integrante (rol miembro) y aviso al administrador. */
export const POST = api(async (req: Request) => {
  const fd = await req.formData();
  const c = Campos.parse({
    codigo: vacio(fd.get("codigo")),
    nombre: vacio(fd.get("nombre")),
    apodo: vacio(fd.get("apodo")),
    nacimiento: vacio(fd.get("nacimiento")),
    whatsapp: vacio(fd.get("whatsapp")),
    email: vacio(fd.get("email")),
    password: vacio(fd.get("password")),
  });
  const g = await grupoPorCodigo(c.codigo);
  if (!g) throw new ApiError(404, "No encontramos esa familia.");
  if (!licenciaPermiteAcceso(g)) throw new ApiError(402, "El espacio de esta familia está en pausa.");

  const wa = c.whatsapp ? soloDigitos(c.whatsapp) : "";
  if (c.whatsapp && wa.length < 8) throw new ApiError(400, "El WhatsApp parece incompleto.");

  // Evitar duplicados dentro de la familia.
  const existentes = must(await db().from("usuarios").select("email,whatsapp").eq("grupo_id", g.id)) ?? [];
  for (const e of existentes as { email: string | null; whatsapp: string | null }[]) {
    if (c.email && e.email?.toLowerCase() === c.email.toLowerCase()) throw new ApiError(409, "Ese email ya está registrado en la familia.");
    if (wa && e.whatsapp && soloDigitos(e.whatsapp) === wa) throw new ApiError(409, "Ese WhatsApp ya está registrado en la familia.");
  }

  const foto = fd.get("foto");
  let fotoPath: string | null = null;
  if (foto instanceof File && foto.size > 0) fotoPath = await subirImagen(foto, "avatars", 600);

  const ins = await db()
    .from("usuarios")
    .insert({
      grupo_id: g.id,
      nombre: c.nombre,
      apodo: c.apodo || null,
      nacimiento: c.nacimiento || null,
      whatsapp: wa || null,
      email: c.email ? c.email.toLowerCase() : null,
      foto_path: fotoPath,
      rol: "miembro",
      password_hash: await hashPassword(c.password),
    })
    .select("id")
    .single();
  if (ins.error) {
    await borrarArchivos([fotoPath]);
    throw new Error(`DB: ${ins.error.message}`);
  }

  // Aviso al administrador: campanita in-app + email cálido redactado por Gemini.
  const nombreVisible = c.apodo || c.nombre;
  await db().from("notificaciones").insert({ grupo_id: g.id, texto: `${c.nombre} se sumó a la familia 🎉` });
  if (g.admin_email) {
    const cuerpo =
      (await decir(
        `Escribí un mail breve y cálido para ${g.admin_nombre || "el administrador"} avisando que ${c.nombre} ("${nombreVisible}") ` +
          `se sumó a la familia ${g.nombre} en Destellos. Sin firma ni asunto, solo el cuerpo.`,
      )) ?? `${c.nombre} se sumó a la familia ${g.nombre}. ¡Bienvenidos todos!`;
    const urlFoto = fotoPath ? (await firmar([fotoPath]))[fotoPath] : null;
    await enviarMail({
      para: g.admin_email,
      asunto: `${c.nombre} se sumó a ${g.nombre} 🎭`,
      texto: `${cuerpo}\n\nWhatsApp: ${c.whatsapp || "no informado"}`,
      html: `<p>${escapar(cuerpo).replace(/\n/g, "<br>")}</p><p><b>${escapar(c.nombre)}</b><br>WhatsApp: ${escapar(c.whatsapp || "no informado")}</p>${
        urlFoto ? `<p><img src="${urlFoto}" width="160" style="border-radius:12px"></p>` : ""
      }`,
    });
  }

  await crearSesion(ins.data.id);
  return { ok: true };
});
