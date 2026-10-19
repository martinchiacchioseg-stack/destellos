/**
 * Generador de URLs universales wa.me a costo $0 (P2P Nudges).
 * Permite al administrador o a cualquier jugador despachar mensajes con 1 solo toque
 * desde su propio WhatsApp nativo o WhatsApp Web, sin servidores ni APIs pagas.
 */

export interface PicadoWhatsappData {
  titulo: string;
  diaHora: string;
  lugar: string;
  lugarLink?: string;
  aliasPago?: string;
  confirmadosCount: number;
  limite: number;
  urlPicado: string;
}

/**
 * 1. Convocatoria inicial: lanza el partido e invita a anotarse en la lista.
 */
export function generarWspConvocatoria(data: PicadoWhatsappData): string {
  const texto =
    `⚽ *¡CONVOCATORIA ABIERTA: ${data.titulo.toUpperCase()}!* ⚽\n\n` +
    `🗓 *Cuándo:* ${data.diaHora}\n` +
    `📍 *Cancha:* ${data.lugar} ${data.lugarLink ? `(${data.lugarLink})` : ""}\n` +
    `👥 *Cupo:* 10 Titulares (luego lista de suplentes)\n` +
    (data.aliasPago ? `💸 *Alias para transferir:* \`${data.aliasPago}\`\n\n` : "\n") +
    `👇 *Anotate con 1 toque en la lista:* \n${data.urlPicado}\n\n` +
    `_Los primeros ${data.limite} van de titulares. ¡No duermas que se llena!_ 🏃‍♂️🔥`;

  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/**
 * 2. Alerta 24hs antes: pedido de confirmación urgente para que se bajen lesionados y suban suplentes.
 */
export function generarWspAlerta24hs(data: PicadoWhatsappData): string {
  const texto =
    `⏰ *¡ALERTA 24HS ANTES DEL PICADO!* ⏰\n\n` +
    `Partido: *${data.titulo}*\n` +
    `Confirmados al momento: *${data.confirmadosCount}/${data.limite}*\n\n` +
    `🚨 *ATENCIÓN:* Si estás lesionado, te surgió un imprevisto o no llegás, *tocá 'Me bajo' YA* en el link para que el sistema promueva automáticamente al primer suplente de la lista:\n\n` +
    `👉 ${data.urlPicado}\n\n` +
    `_No dejes al equipo con uno menos. Buen picado para todos._ ⚽🤝`;

  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/**
 * 3. Mensaje Delegado Post-Partido:
 * Redactado en TERCERA PERSONA por la IA "Arlequín" en nombre de TRIBOO.
 * Exige la foto obligatoria del equipo en el vestuario o tercer tiempo para destrabar el veredicto y la votación.
 */
export function generarWspPostPartidoArlequin(data: PicadoWhatsappData): string {
  const texto =
    `🎭 *AVISO DE ARLEQUÍN EN TRIBOO:* ¡Final del partido! 🏁🍕\n\n` +
    `Tienen 20 minutos para sacarse la foto grupal del equipo (en la cancha, vestuario o tercer tiempo) ` +
    `antes de que se enfríen las pizzas y las cervezas.\n\n` +
    `📸 *Cualquiera de los jugadores puede subir la foto obligatoria acá:* \n${data.urlPicado}\n\n` +
    `Al subirla se destraba el veredicto oficial de la jornada y la votación express de la *Figura de la Cancha* y el *Rústico/Pecho Frío*. ¡A posar, campeones! 🌟`;

  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
