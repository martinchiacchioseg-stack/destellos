import { api } from "@/lib/http";
import { requerirSuperadmin } from "@/lib/auth";
import { ejecutarDiagnostico } from "@/lib/diagnostico";

export const maxDuration = 60;

export const POST = api(async () => {
  await requerirSuperadmin();
  return ejecutarDiagnostico();
});
