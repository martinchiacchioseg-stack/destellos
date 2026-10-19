import { api } from "@/lib/http";
import { requerirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  obtenerConfiguracionImpostor,
  obtenerOIniciarRondaHoy,
} from "@/lib/impostor";
import { hoyAR } from "@/lib/fecha";

/**
 * GET /api/impostor
 * Devuelve el estado actual de la ronda de El Impostor para el usuario y su grupo.
 * Cumple con REGLA DE CEGUERA ESTRICTA en backend:
 * - En Fase 1: las pistas ajenas se ocultan al 100%.
 * - La palabra secreta JAMÁS se envía si el usuario es el impostor.
 * - Los votos ajenos JAMÁS se envían hasta la Fase 3.
 */
export const GET = api(async (req: Request) => {
  const { grupo, usuario, esSuper } = await requerirUsuario();
  const esAdmin = usuario.rol === "admin" || esSuper;

  // 1. Obtener configuración del grupo
  const config = await obtenerConfiguracionImpostor(grupo.id);
  if (!config.activo) {
    return {
      activo: false,
      mensaje: "El Impostor no está activo en esta Tribu.",
      esAdmin,
    };
  }

  // 2. Obtener o iniciar la partida de hoy
  const { partida, motivoPausa } = await obtenerOIniciarRondaHoy(grupo.id);
  if (!partida) {
    return {
      activo: true,
      enPausa: true,
      motivoPausa,
      esAdmin,
      config,
    };
  }

  // 3. Obtener datos de jugadores con información pública de usuarios
  const { data: jugadores } = await db()
    .from("impostor_jugadores")
    .select("*, usuarios(id, nombre, apodo, foto_path)")
    .eq("partida_id", partida.id);

  const miRegistro = (jugadores || []).find((j) => j.usuario_id === usuario.id);
  const soyImpostor = miRegistro?.rol === "impostor";

  // 4. Aplicar filtros de seguridad según la fase
  const estado = partida.estado;
  const esFase1 = estado === "fase_1_pistas";
  const esFase2 = estado === "fase_2_votacion";
  const esFase3 = estado === "fase_3_resolucion";
  const esCancelada = estado === "cancelada";

  // CEGUERA ESTRICTA DE PALABRA: Si es impostor, jamás ve la palabra
  const palabraVisible = soyImpostor ? null : partida.palabra_secreta;

  // CEGUERA ESTRICTA DE PISTAS:
  // En Fase 1 solo ve su propia pista. En Fase 2 en adelante se ven todas en orden aleatorio determinístico.
  let pistasParaCliente = (jugadores || []).map((j: any) => {
    const esElMismo = j.usuario_id === usuario.id;
    const tienePista = !!j.pista_texto;

    if (esFase1) {
      return {
        usuarioId: j.usuario_id,
        nombre: j.usuarios?.apodo || j.usuarios?.nombre || "Jugador",
        tienePista,
        pistaTexto: esElMismo ? j.pista_texto : null, // CEGUERA
        pistaFotoUrl: esElMismo ? j.pista_foto_url : null,
        esElMismo,
      };
    }

    // En Fase 2 y 3 las pistas están a la vista
    return {
      usuarioId: j.usuario_id,
      nombre: j.usuarios?.apodo || j.usuarios?.nombre || "Jugador",
      tienePista,
      pistaTexto: j.pista_texto || "Sin pista enviada 🤷",
      pistaFotoUrl: j.pista_foto_url,
      esElMismo,
      // Revelación de votos y roles solo en Fase 3
      votoSospechosoId: esFase3 ? j.voto_sospechoso_id : (esElMismo ? j.voto_sospechoso_id : null),
      rol: esFase3 ? j.rol : (esElMismo ? j.rol : null),
      puntosObtenidos: esFase3 || esCancelada ? j.puntos_obtenidos : 0,
      motivoPuntos: esFase3 || esCancelada ? j.motivo_puntos : null,
    };
  });

  // En Fase 2 desordenamos las pistas con una semilla fija (para no delatar la hora de envío)
  if (esFase2) {
    pistasParaCliente = pistasParaCliente.sort((a, b) => {
      const hashA = (a.usuarioId + partida.id).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hashB = (b.usuarioId + partida.id).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return hashA - hashB;
    });
  }

  // Ranking acumulado semanal/mensual del grupo en El Impostor
  const { data: historialPuntos } = await db()
    .from("impostor_jugadores")
    .select("usuario_id, puntos_obtenidos, usuarios(nombre, apodo)")
    .limit(100);

  const tablaRanking: Record<string, { nombre: string; puntos: number; partidas: number }> = {};
  for (const hp of (historialPuntos || []) as any[]) {
    if (!tablaRanking[hp.usuario_id]) {
      tablaRanking[hp.usuario_id] = {
        nombre: hp.usuarios?.apodo || hp.usuarios?.nombre || "Jugador",
        puntos: 0,
        partidas: 0,
      };
    }
    tablaRanking[hp.usuario_id].puntos += hp.puntos_obtenidos || 0;
    tablaRanking[hp.usuario_id].partidas++;
  }

  const rankingOrdenado = Object.entries(tablaRanking)
    .map(([uId, r]) => ({ usuarioId: uId, ...r }))
    .sort((a, b) => b.puntos - a.puntos);

  return {
    activo: true,
    enPausa: false,
    esAdmin,
    config,
    partida: {
      id: partida.id,
      fecha: partida.fecha,
      estado: partida.estado,
      categoria: partida.categoria,
      palabraSecreta: palabraVisible,
      modoSeguroUsado: partida.modo_seguro_usado,
      ganador: partida.ganador,
      tiroGraciaIntento: partida.tiro_gracia_intento,
      tiroGraciaAcertado: partida.tiro_gracia_acertado,
      motivoCancelacion: partida.motivo_cancelacion,
    },
    miRol: miRegistro?.rol || "civil",
    soyImpostor,
    miPista: {
      texto: miRegistro?.pista_texto || null,
      fotoUrl: miRegistro?.pista_foto_url || null,
      enviada: !!miRegistro?.pista_texto,
    },
    miVoto: miRegistro?.voto_sospechoso_id || null,
    jugadores: pistasParaCliente,
    totalJugadores: jugadores?.length || 0,
    totalPistasEnviadas: (jugadores || []).filter((j) => !!j.pista_texto).length,
    ranking: rankingOrdenado,
  };
});
