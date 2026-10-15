import { NextRequest, NextResponse } from 'next/server';
import { obtenerPublicidadPorUbicacion } from '@/lib/db';
import { UbicacionPublicidad } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const ubicacion = req.nextUrl.searchParams.get('ubicacion') as UbicacionPublicidad | null;
    if (!ubicacion) {
      return NextResponse.json({ error: 'Ubicación requerida.' }, { status: 400 });
    }

    const publicidad = await obtenerPublicidadPorUbicacion(ubicacion);
    return NextResponse.json({ ok: true, publicidad });
  } catch (error: any) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Error al obtener publicidad por ubicación:', error);
    return NextResponse.json({ error: 'Error al obtener publicidad.' }, { status: 500 });
  }
}
