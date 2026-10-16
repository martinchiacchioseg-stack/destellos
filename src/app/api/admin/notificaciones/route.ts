import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  listarNotificacionesAdmin,
  contarNotificacionesNoLeidasAdmin,
  marcarNotificacionesLeidas,
} from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const notificaciones = await listarNotificacionesAdmin(
      session.rol === 'superadmin' ? undefined : session.id,
      session.grupo_id || undefined
    );
    const noLeidas = await contarNotificacionesNoLeidasAdmin(
      session.rol === 'superadmin' ? undefined : session.id,
      session.grupo_id || undefined
    );

    return NextResponse.json({
      notificaciones,
      noLeidas,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error cargando notificaciones.' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    await marcarNotificacionesLeidas(
      session.rol === 'superadmin' ? undefined : session.id,
      session.grupo_id || undefined
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error marcando notificaciones.' }, { status: 500 });
  }
}
