import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  obtenerRondaRuletaActiva,
  abrirRondaRuleta,
  enviarPreguntaRuleta,
  girarRuleta,
  responderPreguntaRuleta,
  pasarPreguntaRuleta,
  reaccionarPreguntaRuleta,
  obtenerGrupoIdPorDefecto,
} from '@/lib/db';
import { moderarPreguntaRuleta } from '@/lib/gemini';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
  const data = await obtenerRondaRuletaActiva(grupoId);

  return NextResponse.json({
    ...data,
    usuarioActualId: session.id,
    esAdmin: session.rol === 'admin' || session.rol === 'superadmin',
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const grupoId = session.grupo_id || (await obtenerGrupoIdPorDefecto());
    const body = await req.json();
    const { accion } = body;

    if (accion === 'abrir_ronda') {
      if (session.rol !== 'admin' && session.rol !== 'superadmin') {
        return NextResponse.json({ error: 'Solo el administrador puede abrir una ronda.' }, { status: 403 });
      }
      const ronda = await abrirRondaRuleta(grupoId, body.nivelMaximo || 'picante');
      return NextResponse.json({ ok: true, ronda });
    }

    if (accion === 'enviar_pregunta') {
      const { rondaId, texto, nivel } = body;
      if (!texto || texto.trim().length < 5) {
        return NextResponse.json({ error: 'Escribí una pregunta válida.' }, { status: 400 });
      }

      // Moderación automática con Gemini
      const mod = await moderarPreguntaRuleta(texto, nivel || 'suave');
      if (!mod.aprobada) {
        return NextResponse.json(
          {
            error:
              mod.motivoRechazo ||
              'La pregunta no cumple con las normas familiares de convivencia. ¡Reformulala con buena onda!',
          },
          { status: 400 }
        );
      }

      const nueva = await enviarPreguntaRuleta(rondaId, session.id, texto, nivel || 'suave');
      return NextResponse.json({ ok: true, mensaje: '¡Pregunta anónima cargada con éxito! 🎲', pregunta: nueva });
    }

    if (accion === 'girar') {
      const { rondaId } = body;
      const ok = await girarRuleta(rondaId);
      if (!ok) {
        return NextResponse.json(
          { error: 'No hay suficientes preguntas o miembros para girar el tambor.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true, mensaje: '¡El tambor giró y se asignaron las recámaras! 🎯' });
    }

    if (accion === 'responder') {
      const { preguntaId, respuestaTexto, respuestaMediaUrl } = body;
      const res = await responderPreguntaRuleta(preguntaId, session.id, respuestaTexto, respuestaMediaUrl);
      return NextResponse.json(res);
    }

    if (accion === 'pasar') {
      const { preguntaId } = body;
      const otra = await pasarPreguntaRuleta(preguntaId, session.id);
      return NextResponse.json({ ok: true, nuevaPregunta: otra });
    }

    if (accion === 'reaccionar') {
      const { preguntaId, tipo } = body;
      const res = await reaccionarPreguntaRuleta(preguntaId, tipo);
      return NextResponse.json({ ok: true, reacciones: res });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error en /api/juegos/ruleta:', error);
    return NextResponse.json({ error: 'Error procesando Ruleta Rusa.' }, { status: 500 });
  }
}
