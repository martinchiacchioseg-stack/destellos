import "server-only";
import { db, must } from "./db";
import { hoyAR } from "./fecha";
import { decir, jsonGemini } from "./gemini";
import type {
  ImpostorConfiguracion,
  ImpostorPartida,
  ImpostorJugador,
  EstadoImpostor,
} from "./types";

// ==========================================
// 1. CONFIGURACIÓN DEL GRUPO
// ==========================================

export const CONFIG_IMPOSTOR_DEFECTO: Omit<ImpostorConfiguracion, "grupo_id"> = {
  activo: false,
  modo_seguro: true,
  cantidad_impostores: 1,
  dias_no_repeticion: 60,
  hora_inicio: "00:00",
  hora_revelacion: "19:00",
  hora_cierre: "22:00",
  puntos_civil_acierta: 5,
  puntos_impostor_engana: 10,
  puntos_tiro_gracia: 7,
  penalizacion_sin_pista: -2,
  penalizacion_sin_voto: -2,
  compensacion_civil_cancelada: 2,
};

export async function obtenerConfiguracionImpostor(grupoId: string): Promise<ImpostorConfiguracion> {
  const { data } = await db()
    .from("impostor_configuracion")
    .select("*")
    .eq("grupo_id", grupoId)
    .single();

  if (data) return data as ImpostorConfiguracion;

  // Si no existe, crear con defaults
  const nuevo: ImpostorConfiguracion = {
    grupo_id: grupoId,
    ...CONFIG_IMPOSTOR_DEFECTO,
  };

  await db().from("impostor_configuracion").insert(nuevo);
  return nuevo;
}

export async function actualizarConfiguracionImpostor(
  grupoId: string,
  cambios: Partial<ImpostorConfiguracion>
): Promise<ImpostorConfiguracion> {
  const { data, error } = await db()
    .from("impostor_configuracion")
    .upsert({
      grupo_id: grupoId,
      ...cambios,
      actualizado_en: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Error al actualizar configuración de El Impostor: ${error?.message}`);
  }
  return data as ImpostorConfiguracion;
}

// ==========================================
// 2. PALABRAS DE EMERGENCIA Y GENERACIÓN CON IA
// ==========================================

const PALABRAS_EMERGENCIA_SEGURAS = [
  { palabra: "Asado", categoria: "Comidas" },
  { palabra: "Bicicleta", categoria: "Transporte" },
  { palabra: "Playa", categoria: "Lugares" },
  { palabra: "Guitarra", categoria: "Música" },
  { palabra: "Perro", categoria: "Animales" },
  { palabra: "Mate", categoria: "Costumbres" },
  { palabra: "Helado", categoria: "Postres" },
  { palabra: "Fútbol", categoria: "Deportes" },
  { palabra: "Montaña", categoria: "Naturaleza" },
  { palabra: "Café", categoria: "Bebidas" },
  { palabra: "Pizza", categoria: "Comidas" },
  { palabra: "Avión", categoria: "Transporte" },
  { palabra: "Cine", categoria: "Entretenimiento" },
  { palabra: "Biblioteca", categoria: "Lugares" },
  { palabra: "Gato", categoria: "Animales" },
];

const PALABRAS_EMERGENCIA_LIBRES = [
  { palabra: "Fernet", categoria: "Bebidas" },
  { palabra: "Boliche", categoria: "Salidas" },
  { palabra: "Resaca", categoria: "Situaciones" },
  { palabra: "Cerveza", categoria: "Bebidas" },
  { palabra: "After", categoria: "Salidas" },
  { palabra: "Asado con amigos", categoria: "Encuentros" },
  { palabra: "Tatuaje", categoria: "Estilo" },
  { palabra: "Quiniela", categoria: "Juegos" },
];

const CATEGORIAS_ROTATIVAS = [
  "Comidas y Platos",
  "Lugares y Espacios",
  "Objetos Cotidianos",
  "Actividades y Hobbies",
  "Deportes y Juegos",
  "Animales y Naturaleza",
  "Música e Instrumentos",
  "Transporte y Viajes",
];

export async function generarPalabraSecreta(
  grupoId: string,
  modoSeguro: boolean,
  diasExclusion: number = 60
): Promise<{ palabra: string; categoria: string }> {
  // 1. Obtener historial reciente para no repetir
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasExclusion);

  const { data: historial } = await db()
    .from("impostor_historial_palabras")
    .select("palabra")
    .eq("grupo_id", grupoId)
    .gte("fecha", fechaLimite.toISOString().split("T")[0]);

  const excluidas = (historial ?? []).map((h) => h.palabra.toLowerCase().trim());
  const categoriaSugerida = CATEGORIAS_ROTATIVAS[Math.floor(Math.random() * CATEGORIAS_ROTATIVAS.length)];

  // 2. Consulta a Gemini
  const prompt = `Actuá como Arlequín, anfitrión del juego social "El Impostor" en TRIBOO.
Generá una palabra secreta cotidiana para que un grupo de amigos/familia juegue a darse pistas.
REGLAS ESTRICTAS:
- Debe ser un sustantivo común o concepto cotidiano muy conocido y fácil de describir con pistas sutiles.
- Categoría recomendada: ${categoriaSugerida}.
- MODO SEGURO: ${modoSeguro ? "ACTIVADO (Estrictamente apto para menores de 8 años: prohibido alcohol, drogas, tabaco, apuestas, sexo, violencia, armas, política, religión o doble sentido)" : "DESACTIVADO (Permitido humor entre amigos adultos: salidas, cervezas, cargadas; pero NUNCA violencia, contenido sexual explícito ni ofensas)"}.
- PALABRAS RECIENTES A EXCLUIR: [${excluidas.slice(0, 40).join(", ")}].
- Formato de respuesta: SOLO un objeto JSON con dos propiedades:
{"palabra": "PalabraEjemplo", "categoria": "CategoriaEjemplo"}`;

  try {
    const res = await jsonGemini<{ palabra: string; categoria: string }>(prompt);
    if (res && res.palabra && res.categoria) {
      const limpia = res.palabra.trim();
      const limpiaNorm = limpia.toLowerCase();

      // Si no fue excluida y no es vacía
      if (limpia.length >= 2 && limpia.length <= 30 && !excluidas.includes(limpiaNorm)) {
        // En modo seguro, verificación adicional contra palabras no aptas
        if (modoSeguro) {
          const prohibidas = ["alcohol", "vino", "cerveza", "fernet", "faso", "droga", "apuesta", "casino", "bala", "arma", "muerte", "sexo"];
          const esInapropiada = prohibidas.some((p) => limpiaNorm.includes(p));
          if (!esInapropiada) {
            await registrarPalabraHistorial(grupoId, limpia, res.categoria);
            return { palabra: limpia, categoria: res.categoria.trim() };
          }
        } else {
          await registrarPalabraHistorial(grupoId, limpia, res.categoria);
          return { palabra: limpia, categoria: res.categoria.trim() };
        }
      }
    }
  } catch (err) {
    console.warn("[impostor:generarPalabraSecreta] Error llamando a Gemini:", err);
  }

  // 3. Fallback de emergencia
  const listaFallback = modoSeguro ? PALABRAS_EMERGENCIA_SEGURAS : PALABRAS_EMERGENCIA_LIBRES;
  const noRepetidas = listaFallback.filter((item) => !excluidas.includes(item.palabra.toLowerCase()));
  const elegida = noRepetidas.length > 0
    ? noRepetidas[Math.floor(Math.random() * noRepetidas.length)]
    : listaFallback[Math.floor(Math.random() * listaFallback.length)];

  await registrarPalabraHistorial(grupoId, elegida.palabra, elegida.categoria);
  return elegida;
}

async function registrarPalabraHistorial(grupoId: string, palabra: string, categoria: string) {
  try {
    await db().from("impostor_historial_palabras").insert({
      grupo_id: grupoId,
      palabra,
      categoria,
      fecha: hoyAR(),
    });
  } catch (e) {
    console.warn("[impostor] No se pudo guardar historial:", e);
  }
}

// ==========================================
// 3. SORTEO EQUITATIVO DE IMPOSTORES
// ==========================================

export async function sortearImpostorEquitativo(
  miembros: { id: string }[],
  grupoId: string
): Promise<string> {
  if (miembros.length === 0) throw new Error("No hay miembros para sortear.");
  if (miembros.length === 1) return miembros[0].id;

  // Consultar cuántas veces fue impostor cada uno en los últimos 14 días
  const hace14 = new Date();
  hace14.setDate(hace14.getDate() - 14);

  const { data: historialRoles } = await db()
    .from("impostor_jugadores")
    .select("usuario_id, partida_id, impostor_partidas(fecha)")
    .eq("rol", "impostor");

  const conteoMap: Record<string, number> = {};
  for (const m of miembros) conteoMap[m.id] = 0;

  if (historialRoles) {
    for (const r of historialRoles) {
      if (r.usuario_id && conteoMap[r.usuario_id] !== undefined) {
        conteoMap[r.usuario_id]++;
      }
    }
  }

  // Ponderación inversamente proporcional: W = 1 / (1 + veces * 2)
  const pesos: { id: string; peso: number }[] = miembros.map((m) => {
    const veces = conteoMap[m.id] || 0;
    return { id: m.id, peso: 1 / (1 + veces * 2.5) };
  });

  const pesoTotal = pesos.reduce((acc, p) => acc + p.peso, 0);
  let random = Math.random() * pesoTotal;

  for (const p of pesos) {
    if (random < p.peso) return p.id;
    random -= p.peso;
  }

  return miembros[Math.floor(Math.random() * miembros.length)].id;
}

// ==========================================
// 4. MÁQUINA DE ESTADOS Y TRANSICIONES DE RONDA
// ==========================================

export async function obtenerOIniciarRondaHoy(
  grupoId: string,
  forzarFecha?: string
): Promise<{ partida: ImpostorPartida | null; motivoPausa?: string }> {
  const fecha = forzarFecha || hoyAR();

  // 1. Verificar si el grupo tiene activo el módulo
  const config = await obtenerConfiguracionImpostor(grupoId);
  if (!config.activo) {
    return { partida: null, motivoPausa: "El módulo El Impostor está pausado en los ajustes de la Tribu." };
  }

  // 2. Verificar mínimo de jugadores (al menos 3)
  const { data: miembros } = await db()
    .from("usuarios")
    .select("id, nombre, apodo")
    .eq("grupo_id", grupoId);

  if (!miembros || miembros.length < 3) {
    return {
      partida: null,
      motivoPausa: `Se necesitan al menos 3 integrantes activos en la Tribu para jugar al Impostor (actualmente son ${miembros?.length || 0}).`,
    };
  }

  // 3. Buscar si ya existe la partida de hoy
  const { data: existente } = await db()
    .from("impostor_partidas")
    .select("*")
    .eq("grupo_id", grupoId)
    .eq("fecha", fecha)
    .single();

  if (existente) {
    return { partida: existente as ImpostorPartida };
  }

  // 4. Iniciar nueva ronda: generar palabra y sortear roles
  const palabraObj = await generarPalabraSecreta(grupoId, config.modo_seguro, config.dias_no_repeticion);
  const impostorId = await sortearImpostorEquitativo(miembros, grupoId);

  const { data: nuevaPartida, error: errPartida } = await db()
    .from("impostor_partidas")
    .insert({
      grupo_id: grupoId,
      fecha,
      estado: "fase_1_pistas",
      palabra_secreta: palabraObj.palabra,
      categoria: palabraObj.categoria,
      modo_seguro_usado: config.modo_seguro,
    })
    .select()
    .single();

  if (errPartida || !nuevaPartida) {
    throw new Error(`Error al crear partida de El Impostor: ${errPartida?.message}`);
  }

  // 5. Asignar jugadores
  const registrosJugadores = miembros.map((m) => ({
    partida_id: nuevaPartida.id,
    usuario_id: m.id,
    rol: m.id === impostorId ? "impostor" : "civil",
    puntos_obtenidos: 0,
  }));

  await db().from("impostor_jugadores").insert(registrosJugadores);

  // 6. Notificación para la tribu
  try {
    await db().from("notificaciones").insert({
      grupo_id: grupoId,
      texto: "🕵️ ¡Comenzó una nueva ronda de El Impostor! Entrá a ver tu rol secreto y subí tu pista antes de las 19:00 hs.",
      leida: false,
    });
  } catch (e) {
    console.warn("[impostor] Error al enviar notificación inicial:", e);
  }

  return { partida: nuevaPartida as ImpostorPartida };
}

// ----------------------------------------------------
// Transición a Fase 2 (19:00 hs): Revelación y Debate
// ----------------------------------------------------
export async function transicionarAFase2(partidaId: string): Promise<{
  cancelada: boolean;
  motivo?: string;
  estado: EstadoImpostor;
}> {
  const { data: partida } = await db()
    .from("impostor_partidas")
    .select("*, impostor_configuracion(*)")
    .eq("id", partidaId)
    .single();

  if (!partida) throw new Error("Partida no encontrada.");
  if (partida.estado !== "fase_1_pistas") {
    return { cancelada: partida.estado === "cancelada", estado: partida.estado };
  }

  const config = (await obtenerConfiguracionImpostor(partida.grupo_id)) || CONFIG_IMPOSTOR_DEFECTO;

  // Consultar jugadores y pistas
  const { data: jugadores } = await db()
    .from("impostor_jugadores")
    .select("*")
    .eq("partida_id", partidaId);

  const impostor = (jugadores || []).find((j) => j.rol === "impostor");

  // CASO DE AUSENCIA CRÍTICA: Si el impostor NO envió pista antes de las 19:00
  if (!impostor || !impostor.pista_texto) {
    const motivoCancel = "Ronda cancelada: el impostor no envió su pista antes de las 19:00 hs.";

    // Sanción al impostor
    if (impostor) {
      await db()
        .from("impostor_jugadores")
        .update({
          puntos_obtenidos: -5,
          motivo_puntos: "Penalización por no enviar pista como impostor",
        })
        .eq("id", impostor.id);
    }

    // Compensación a los civiles
    const civiles = (jugadores || []).filter((j) => j.rol === "civil");
    for (const c of civiles) {
      await db()
        .from("impostor_jugadores")
        .update({
          puntos_obtenidos: config.compensacion_civil_cancelada,
          motivo_puntos: "Compensación por ronda cancelada sin culpa",
        })
        .eq("id", c.id);

      // Persistir puntos en tabla global
      try {
        await db().from("puntos").insert({
          grupo_id: partida.grupo_id,
          usuario_id: c.usuario_id,
          fecha: partida.fecha,
          motivo: "El Impostor: compensación por ronda cancelada",
          puntos: config.compensacion_civil_cancelada,
        });
      } catch (e) {}
    }

    await db()
      .from("impostor_partidas")
      .update({
        estado: "cancelada",
        motivo_cancelacion: motivoCancel,
        ganador: "ninguno",
        cerrado_en: new Date().toISOString(),
      })
      .eq("id", partidaId);

    // Notificar
    await db().from("notificaciones").insert({
      grupo_id: partida.grupo_id,
      texto: "⚠️ Ronda cancelada en El Impostor: el impostor faltó a la cita. Los civiles reciben +2 pts de compensación.",
      leida: false,
    });

    return { cancelada: true, motivo: motivoCancel, estado: "cancelada" };
  }

  // Si el impostor cumplió: penalizar solo a los civiles ausentes con pista neutra
  const ausentes = (jugadores || []).filter((j) => !j.pista_texto);
  for (const a of ausentes) {
    await db()
      .from("impostor_jugadores")
      .update({
        pista_texto: "Sin pista enviada 🤷",
        puntos_obtenidos: config.penalizacion_sin_pista,
        motivo_puntos: "Penalización por no enviar pista a tiempo",
      })
      .eq("id", a.id);
  }

  // Destapar muro y pasar a Fase 2
  await db()
    .from("impostor_partidas")
    .update({ estado: "fase_2_votacion" })
    .eq("id", partidaId);

  // Notificar apertura de votación
  await db().from("notificaciones").insert({
    grupo_id: partida.grupo_id,
    texto: "🎭 ¡Muro destapado en El Impostor! Las pistas están a la vista de todos. Votá a tu sospechoso antes de las 22:00 hs.",
    leida: false,
  });

  return { cancelada: false, estado: "fase_2_votacion" };
}

// ----------------------------------------------------
// Transición a Fase 3 (22:00 hs): Veredicto y Cierre
// ----------------------------------------------------
export async function transicionarAFase3(partidaId: string): Promise<{
  ganador: "civiles" | "impostor" | "ninguno";
  desenmascarado: boolean;
  requiereTiroDeGracia: boolean;
}> {
  const { data: partida } = await db()
    .from("impostor_partidas")
    .select("*")
    .eq("id", partidaId)
    .single();

  if (!partida) throw new Error("Partida no encontrada.");
  if (partida.estado !== "fase_2_votacion") {
    return {
      ganador: partida.ganador || "ninguno",
      desenmascarado: false,
      requiereTiroDeGracia: false,
    };
  }

  const config = (await obtenerConfiguracionImpostor(partida.grupo_id)) || CONFIG_IMPOSTOR_DEFECTO;

  // Jugadores y votos
  const { data: jugadores } = await db()
    .from("impostor_jugadores")
    .select("*")
    .eq("partida_id", partidaId);

  const lista = jugadores || [];
  const impostor = lista.find((j) => j.rol === "impostor");
  if (!impostor) throw new Error("No hay impostor registrado.");

  // Penalizar a quienes no votaron
  for (const j of lista) {
    if (!j.voto_sospechoso_id) {
      await db()
        .from("impostor_jugadores")
        .update({
          puntos_obtenidos: j.puntos_obtenidos + config.penalizacion_sin_voto,
          motivo_puntos: "Penalización por no emitir voto a tiempo",
        })
        .eq("id", j.id);
    }
  }

  // Tally de votos
  const conteoVotos: Record<string, number> = {};
  for (const j of lista) {
    if (j.voto_sospechoso_id) {
      conteoVotos[j.voto_sospechoso_id] = (conteoVotos[j.voto_sospechoso_id] || 0) + 1;
    }
  }

  let maxVotos = -1;
  let masVotados: string[] = [];
  for (const [uId, count] of Object.entries(conteoVotos)) {
    if (count > maxVotos) {
      maxVotos = count;
      masVotados = [uId];
    } else if (count === maxVotos) {
      masVotados.push(uId);
    }
  }

  const votosImpostor = conteoVotos[impostor.usuario_id] || 0;
  const esElMasVotadoSolitario = masVotados.length === 1 && masVotados[0] === impostor.usuario_id;
  const hayEmpateConImpostor = masVotados.length > 1 && masVotados.includes(impostor.usuario_id);

  // REGLA: Si el impostor NO es el más votado O si hay empate en el 1° lugar (sembró la duda):
  // GANA EL IMPOSTOR.
  if (!esElMasVotadoSolitario) {
    // Victoria del Impostor
    await db()
      .from("impostor_jugadores")
      .update({
        puntos_obtenidos: impostor.puntos_obtenidos + config.puntos_impostor_engana,
        motivo_puntos: "Victoria como impostor: engañó con éxito al grupo",
      })
      .eq("id", impostor.id);

    try {
      await db().from("puntos").insert({
        grupo_id: partida.grupo_id,
        usuario_id: impostor.usuario_id,
        fecha: partida.fecha,
        motivo: "El Impostor: engaño exitoso al grupo",
        puntos: config.puntos_impostor_engana,
      });
    } catch (e) {}

    await db()
      .from("impostor_partidas")
      .update({
        estado: "fase_3_resolucion",
        ganador: "impostor",
        cerrado_en: new Date().toISOString(),
      })
      .eq("id", partidaId);

    return { ganador: "impostor", desenmascarado: false, requiereTiroDeGracia: false };
  }

  // Si fue descubierto por mayoría solitaria:
  // Se desenmascara pero tiene la ventana de Tiro de Gracia abierta
  await db()
    .from("impostor_partidas")
    .update({
      estado: "fase_3_resolucion",
      ganador: "civiles", // Temporal, a menos que acierte tiro de gracia
    })
    .eq("id", partidaId);

  // Asignar puntos a los civiles que acertaron su voto
  const civilesAcertados = lista.filter(
    (j) => j.rol === "civil" && j.voto_sospechoso_id === impostor.usuario_id
  );

  for (const c of civilesAcertados) {
    await db()
      .from("impostor_jugadores")
      .update({
        puntos_obtenidos: c.puntos_obtenidos + config.puntos_civil_acierta,
        motivo_puntos: "Voto correcto: descubrió al impostor",
      })
      .eq("id", c.id);

    try {
      await db().from("puntos").insert({
        grupo_id: partida.grupo_id,
        usuario_id: c.usuario_id,
        fecha: partida.fecha,
        motivo: "El Impostor: acierto al desenmascarar al impostor",
        puntos: config.puntos_civil_acierta,
      });
    } catch (e) {}
  }

  return { ganador: "civiles", desenmascarado: true, requiereTiroDeGracia: true };
}

// ----------------------------------------------------
// Validación del Tiro de Gracia del Impostor con IA
// ----------------------------------------------------
export async function ejecutarTiroDeGracia(
  partidaId: string,
  impostorUsuarioId: string,
  intento: string
): Promise<{ acertado: boolean; mensaje: string }> {
  const { data: partida } = await db()
    .from("impostor_partidas")
    .select("*")
    .eq("id", partidaId)
    .single();

  if (!partida) throw new Error("Partida no encontrada.");
  if (partida.estado !== "fase_3_resolucion") {
    throw new Error("El tiro de gracia solo se puede ejecutar en la fase de veredicto.");
  }
  if (partida.tiro_gracia_intento !== null) {
    throw new Error("El tiro de gracia ya fue utilizado en esta partida.");
  }

  const { data: jugador } = await db()
    .from("impostor_jugadores")
    .select("*")
    .eq("partida_id", partidaId)
    .eq("usuario_id", impostorUsuarioId)
    .single();

  if (!jugador || jugador.rol !== "impostor") {
    throw new Error("Solo el impostor puede ejecutar el tiro de gracia.");
  }

  const palabraReal = partida.palabra_secreta.trim();
  const palabraNorm = palabraReal
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const intentoNorm = intento
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let acertado = false;

  // 1. Comparación exacta normalizada
  if (intentoNorm === palabraNorm || intentoNorm.includes(palabraNorm) || palabraNorm.includes(intentoNorm)) {
    acertado = true;
  } else {
    // 2. Consulta de equivalencia semántica a Gemini
    const prompt = `Palabra secreta del juego: "${palabraReal}".
Intento del impostor en su Tiro de Gracia: "${intento.trim()}".
¿Es "${intento.trim()}" un sinónimo directo, variante dialectal rioplatense o equivalente indiscutible de "${palabraReal}"?
REGLAS:
- Si es ambiguo, forzado o solo una palabra lejanamente relacionada, responde false.
- Si es un sinónimo claro (ej. "parrillada" por "asado", "bici" por "bicicleta", "perrito" por "perro"), responde true.
Responde únicamente JSON: {"valido": true | false}`;

    try {
      const resIA = await jsonGemini<{ valido: boolean }>(prompt);
      if (resIA && resIA.valido === true) {
        acertado = true;
      }
    } catch (e) {
      console.warn("[impostor:tiroDeGracia] Error evaluando semántica con Gemini:", e);
    }
  }

  const config = await obtenerConfiguracionImpostor(partida.grupo_id);

  if (acertado) {
    // Roba la victoria o suma puntos de tiro de gracia
    await db()
      .from("impostor_jugadores")
      .update({
        puntos_obtenidos: jugador.puntos_obtenidos + config.puntos_tiro_gracia,
        motivo_puntos: `Tiro de gracia acertado: adivinó "${palabraReal}"`,
      })
      .eq("id", jugador.id);

    try {
      await db().from("puntos").insert({
        grupo_id: partida.grupo_id,
        usuario_id: impostorUsuarioId,
        fecha: partida.fecha,
        motivo: `El Impostor: acierto en Tiro de Gracia ("${palabraReal}")`,
        puntos: config.puntos_tiro_gracia,
      });
    } catch (e) {}

    await db()
      .from("impostor_partidas")
      .update({
        tiro_gracia_intento: intento.trim(),
        tiro_gracia_acertado: true,
        ganador: "impostor",
        cerrado_en: new Date().toISOString(),
      })
      .eq("id", partidaId);

    return {
      acertado: true,
      mensaje: `🎯 ¡INCREÍBLE! El impostor adivinó la palabra secreta ("${palabraReal}") con su Tiro de Gracia y robó la victoria.`,
    };
  } else {
    // Falló el tiro de gracia: ganan los civiles
    await db()
      .from("impostor_partidas")
      .update({
        tiro_gracia_intento: intento.trim(),
        tiro_gracia_acertado: false,
        ganador: "civiles",
        cerrado_en: new Date().toISOString(),
      })
      .eq("id", partidaId);

    return {
      acertado: false,
      mensaje: `❌ El impostor arriesgó "${intento.trim()}" pero la palabra secreta era "${palabraReal}". ¡Victoria absoluta para los Civiles!`,
    };
  }
}
