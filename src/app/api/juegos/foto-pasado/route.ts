import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  obtenerFotoPasadoSemanal,
  subirFotoPasado,
  registrarAdivinanzaFotoPasado,
  haAdivinadoFotoPasado,
  obtenerGrupoIdPorDefecto,
} from '@/lib/db';
import { getSemanaArgentina } from '@/lib/date-utils';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
  const semana = getSemanaArgentina();

  const foto = await obtenerFotoPasadoSemanal(grupoId, semana);
  let miAdivinanza = null;

  if (foto) {
    miAdivinanza = await haAdivinadoFotoPasado(foto.id, session.id);
  }

  return NextResponse.json({
    semana,
    foto: foto
      ? {
          id: foto.id,
          media_url: foto.media_url,
          pista: foto.pista,
          autor_nombre: foto.autor_nombre,
          autor_apodo: foto.autor_apodo,
          esPropia: foto.usuario_id === session.id,
          // Solo mostrar año y lugar si ya adivinó o es propia
          anio_real: miAdivinanza || foto.usuario_id === session.id ? foto.anio_real : undefined,
          lugar_real: miAdivinanza || foto.usuario_id === session.id ? foto.lugar_real : undefined,
        }
      : null,
    miAdivinanza,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
    const semana = getSemanaArgentina();
    const body = await req.json();
    const { accion } = body;

    if (accion === 'subir') {
      const { media_url, anio_real, lugar_real, pista } = body;
      if (!media_url || !anio_real || !lugar_real) {
        return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
      }

      const foto = await subirFotoPasado({
        grupo_id: grupoId,
        semana,
        usuario_id: session.id,
        media_url,
        anio_real: Number(anio_real),
        lugar_real,
        pista,
      });

      return NextResponse.json({ ok: true, mensaje: '¡Foto del pasado subida con éxito! 🕰️', foto });
    }

    if (accion === 'adivinar') {
      const { fotoPasadoId, anioAdivinado, lugarAdivinado } = body;
      if (!fotoPasadoId || !anioAdivinado) {
        return NextResponse.json({ error: 'Completá tu estimación de año.' }, { status: 400 });
      }

      const res = await registrarAdivinanzaFotoPasado(
        fotoPasadoId,
        session.id,
        Number(anioAdivinado),
        lugarAdivinado
      );

      return NextResponse.json({
        ok: true,
        mensaje:
          res.diferencia === 0
            ? '¡EXACTO! Le pegaste justo al año (+3 puntos) 🎯'
            : res.diferencia <= 2
            ? `¡Estuviste muy cerca (diferencia de ${res.diferencia} año/s, +1 punto)! 👏`
            : `¡Casi! Era el año ${res.anioReal}. ¡Buen intento!`,
        ...res,
      });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error procesando Foto del Pasado.' }, { status: 500 });
  }
}
