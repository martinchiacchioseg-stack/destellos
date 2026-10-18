import "server-only";
import sharp from "sharp";

/**
 * Imprime directamente sobre la foto el subtítulo y sello de Arlequín (Sharp + SVG).
 */
export async function estamparSubtituloArlequin(
  inputBuffer: Buffer,
  tituloArlequin: string,
  autorNombre: string
): Promise<Buffer> {
  try {
    const meta = await sharp(inputBuffer).metadata();
    const w = meta.width ?? 1200;
    const h = meta.height ?? 1200;

    // Altura proporcional para el subtítulo en el tercio inferior
    const altoBanda = Math.max(90, Math.round(h * 0.12));
    const fontSizeTitulo = Math.max(20, Math.round(altoBanda * 0.32));
    const fontSizeAutor = Math.max(14, Math.round(altoBanda * 0.22));

    const textoLimpio = tituloArlequin
      .replace(/[<>&"']/g, "")
      .trim()
      .slice(0, 75);

    const autorLimpio = autorNombre
      .replace(/[<>&"']/g, "")
      .trim()
      .slice(0, 30);

    const svgOverlay = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${altoBanda}">
        <defs>
          <linearGradient id="neonBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#FF007F"/>
            <stop offset="50%" stop-color="#00F5D4"/>
            <stop offset="100%" stop-color="#FFE600"/>
          </linearGradient>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#070b16" stop-opacity="0.88"/>
            <stop offset="100%" stop-color="#03050a" stop-opacity="0.96"/>
          </linearGradient>
        </defs>
        <rect width="${w}" height="${altoBanda}" fill="url(#bgGrad)"/>
        <rect x="0" y="0" width="${w}" height="4" fill="url(#neonBar)"/>
        
        <!-- Icono / Mascara de Arlequin -->
        <text x="${w * 0.04}" y="${altoBanda * 0.58}" font-size="${altoBanda * 0.45}">🎭</text>
        
        <!-- Titulo / Devolucion de Arlequin impreso -->
        <text x="${w * 0.04 + altoBanda * 0.55}" y="${altoBanda * 0.44}" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${fontSizeTitulo}" fill="#FFFFFF">
          ${textoLimpio}
        </text>
        
        <!-- Firma de Arlequin y Autor -->
        <text x="${w * 0.04 + altoBanda * 0.55}" y="${altoBanda * 0.78}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="${fontSizeAutor}" fill="#00F5D4" letter-spacing="1">
          ARLEQUÍN • FOTO DE ${autorLimpio.toUpperCase()}
        </text>
      </svg>
    `;

    return await sharp(inputBuffer)
      .composite([{ input: Buffer.from(svgOverlay), top: h - altoBanda, left: 0 }])
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err) {
    console.error("[estampa] Error al estampar subtítulo de Arlequín:", err);
    return inputBuffer; // Fallback al buffer original
  }
}
