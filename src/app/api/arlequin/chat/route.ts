import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { charlarConArlequin } from '@/lib/gemini';
import { dbGet } from '@/lib/sqlite-store';
import { Grupo, MensajeChatArlequin } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { mensaje, historial } = await req.json();

    if (!mensaje || typeof mensaje !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido.' }, { status: 400 });
    }

    let grupoNombre = 'Destellos';
    if (session.grupo_id) {
      const g = dbGet<Grupo>('grupos', session.grupo_id);
      if (g) grupoNombre = g.nombre;
    }

    const respuesta = await charlarConArlequin(
      session.nombre || session.apodo || 'amigo',
      grupoNombre,
      mensaje.trim(),
      Array.isArray(historial) ? historial : []
    );

    const mensajeRespuesta: MensajeChatArlequin = {
      id: 'arl-' + Date.now(),
      remitente: 'arlequin',
      texto: respuesta,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      mensaje: mensajeRespuesta,
    });
  } catch (error: any) {
    console.error('Error en /api/arlequin/chat:', error);
    return NextResponse.json({ error: 'Error al charlar con Arlequín.' }, { status: 500 });
  }
}
