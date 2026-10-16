import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { obtenerRetoDelDia, guardarRetoDelDia } from '@/lib/db';
import { generarRetoDelDia } from '@/lib/gemini';
import { getFechaArgentina } from '@/lib/date-utils';

export async function GET() {
  const fechaHoy = getFechaArgentina();
  let reto = await obtenerRetoDelDia(fechaHoy);

  if (!reto) {
    // Si no está generado para hoy, lo generamos en el momento
    const gen = await generarRetoDelDia(fechaHoy);
    reto = await guardarRetoDelDia({
      fecha: fechaHoy,
      tema: gen.tema,
      descripcion: gen.descripcion,
      generado_por_ia: true,
    });
  }

  return NextResponse.json({ reto });
}

export async function POST() {
  const session = await getCurrentSession();
  if (!session || (session.rol !== 'admin' && session.rol !== 'superadmin')) {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  const fechaHoy = getFechaArgentina();
  const gen = await generarRetoDelDia(fechaHoy);
  const nuevoReto = await guardarRetoDelDia({
    fecha: fechaHoy,
    tema: gen.tema,
    descripcion: gen.descripcion,
    generado_por_ia: true,
  });

  return NextResponse.json({ ok: true, reto: nuevoReto });
}
