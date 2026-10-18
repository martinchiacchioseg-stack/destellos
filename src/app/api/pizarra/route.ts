import { api } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { mensajesVigentes } from "@/lib/pizarra";

export const GET = api(async () => {
  const { grupo } = await requerirUsuario();
  const pizarra = await mensajesVigentes(grupo.id);
  return { pizarra };
});
