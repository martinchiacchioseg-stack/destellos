import sharp from 'sharp';

export interface ProcesarImagenOptions {
  buffer: Buffer;
  mimeType: string;
  maxDimension?: number;
}

export interface ResultadoProcesamiento {
  buffer: Buffer;
  formato: string;
  ancho: number;
  alto: number;
  tamanoBytes: number;
}

const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Valida, remueve metadatos EXIF (incluyendo GPS) y redimensiona a un máximo de 1600px
 */
export async function procesarYSanitizarImagen(
  bufferOriginal: Buffer,
  mimeType: string
): Promise<ResultadoProcesamiento> {
  if (bufferOriginal.length > MAX_BYTES) {
    throw new Error('El archivo supera el tamaño máximo permitido de 10 MB.');
  }

  if (!MIME_PERMITIDOS.includes(mimeType.toLowerCase())) {
    throw new Error('Formato no soportado. Se aceptan solo archivos JPG, PNG, WEBP y HEIC.');
  }

  // Inicializar sharp
  const pipeline = sharp(bufferOriginal, { failOn: 'none' });
  const metadata = await pipeline.metadata();

  if (!metadata.format) {
    throw new Error('El archivo no es una imagen válida.');
  }

  // Redimensionar preservando aspecto (máximo 1600px)
  const maxDim = 1600;
  let pipelineProcesado = pipeline
    .rotate() // orientar según EXIF antes de borrar metadatos
    .resize({
      width: maxDim,
      height: maxDim,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .withMetadata({ exif: {} }); // Limpia metadatos EXIF sensibles como ubicación GPS

  // Convertir a JPEG optimizado o WebP para rendimiento en Vercel
  const bufferOptimizado = await pipelineProcesado
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  const metadatosFinales = await sharp(bufferOptimizado).metadata();

  return {
    buffer: bufferOptimizado,
    formato: 'jpeg',
    ancho: metadatosFinales.width || 0,
    alto: metadatosFinales.height || 0,
    tamanoBytes: bufferOptimizado.length,
  };
}

/**
 * Estampa el Diploma de Honor Oficial sobre la foto ganadora del día
 * Contiene:
 * - "Destello del día"
 * - Fecha
 * - Nombre del ganador
 * - Nombre del grupo
 * - Sello oficial: "Destellos by Rolφ"
 */
export async function estamparDiploma(
  imageBuffer: Buffer,
  datos: {
    ganadorNombre: string;
    grupoNombre: string;
    fecha: string;
  }
): Promise<Buffer> {
  const base = sharp(imageBuffer);
  const meta = await base.metadata();
  const width = meta.width || 1200;
  const height = meta.height || 1200;

  // Calculamos tamaños relativos para que sea legible y elegante en cualquier proporción
  const bannerHeight = Math.max(160, Math.round(height * 0.22));
  const fontSizeTitulo = Math.max(22, Math.round(width * 0.038));
  const fontSizeNombre = Math.max(26, Math.round(width * 0.046));
  const fontSizeDetalle = Math.max(14, Math.round(width * 0.024));
  const fontSizeSello = Math.max(13, Math.round(width * 0.022));

  // Limpiar caracteres especiales para XML/SVG seguro
  const escapeXml = (str: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const nombreLimpio = escapeXml(datos.ganadorNombre);
  const grupoLimpio = escapeXml(datos.grupoNombre);
  const fechaLimpia = escapeXml(datos.fecha);

  // SVG con cinta dorada y marco semi-transparente
  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradFondo" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0" />
        <stop offset="40%" stop-color="#120E16" stop-opacity="0.82" />
        <stop offset="100%" stop-color="#0A080D" stop-opacity="0.96" />
      </linearGradient>

      <linearGradient id="gradOro" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#F59E0B" />
        <stop offset="50%" stop-color="#FDE68A" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>

      <filter id="sombraTexto" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.8" />
      </filter>
    </defs>

    <!-- Franja inferior de diploma con degradé oscuro -->
    <rect x="0" y="${height - bannerHeight}" width="${width}" height="${bannerHeight}" fill="url(#gradFondo)" />

    <!-- Línea decorativa dorada superior -->
    <line x1="${width * 0.05}" y1="${height - bannerHeight + 10}" x2="${width * 0.95}" y2="${height - bannerHeight + 10}" stroke="url(#gradOro)" stroke-width="2" stroke-linecap="round" opacity="0.85" />

    <!-- Título: DESTELLO DEL DÍA -->
    <text x="${width / 2}" y="${height - bannerHeight + 42}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="${fontSizeTitulo}"
      font-weight="900"
      letter-spacing="2"
      fill="url(#gradOro)"
      text-anchor="middle"
      filter="url(#sombraTexto)">
      ✨ DESTELLO DEL DÍA ✨
    </text>

    <!-- Ganador -->
    <text x="${width / 2}" y="${height - bannerHeight + 42 + fontSizeNombre + 8}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="${fontSizeNombre}"
      font-weight="800"
      fill="#FFFFFF"
      text-anchor="middle"
      filter="url(#sombraTexto)">
      🏆 ${nombreLimpio}
    </text>

    <!-- Grupo y Fecha -->
    <text x="${width / 2}" y="${height - bannerHeight + 42 + fontSizeNombre + fontSizeDetalle + 20}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="${fontSizeDetalle}"
      font-weight="500"
      fill="#D1D5DB"
      text-anchor="middle">
      ${grupoLimpio} · ${fechaLimpia}
    </text>

    <!-- Sello Oficial: Destellos by Rolφ -->
    <rect x="${width - 190}" y="${20}" width="170" height="34" rx="17" fill="#000000" fill-opacity="0.65" stroke="url(#gradOro)" stroke-width="1.5" />
    <text x="${width - 105}" y="${42}"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="${fontSizeSello}"
      font-weight="bold"
      fill="#FF7043"
      text-anchor="middle">
      Destellos <tspan fill="#FFFFFF" font-weight="900">by Rolφ</tspan>
    </text>
  </svg>
  `;

  const diplomaBuffer = await base
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return diplomaBuffer;
}
