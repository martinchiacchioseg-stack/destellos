import { NextRequest, NextResponse } from 'next/server';
import { guardarRetoDelDia } from '@/lib/db';
import { generarRetoDelDia } from '@/lib/gemini';
import { getFechaArgentina } from '@/lib/date-utils';

export async function GET(req: NextRequest) {
  // Validación opcional de CRON_SECRET si está configurado en Vercel
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Si viene de Vercel Cron, Vercel envía el secret
  }

  const fechaHoy = getFechaArgentina();
  const gen = await generarRetoDelDia(fechaHoy);

  const reto = await guardarRetoDelDia({
    fecha: fechaHoy,
    tema: gen.tema,
    descripcion: gen.descripcion,
    generado_por_ia: true,
  });

  return NextResponse.json({ ok: true, mensaje: 'Reto diario generado con éxito.', reto });
}
