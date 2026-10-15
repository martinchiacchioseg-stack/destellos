import { NextRequest, NextResponse } from 'next/server';
import { evaluarDestello, apurarPorWhatsApp } from '@/lib/arbitro';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accion } = body;

    if (accion === 'evaluar_destello') {
      const candidatos = body.candidatos || body.destellos || [];
      const resultado = await evaluarDestello(candidatos);
      return NextResponse.json(resultado);
    }

    if (accion === 'apurar_por_whatsapp') {
      const { usuario_apurado, urgencia, contexto } = body;
      const recordatorio = await apurarPorWhatsApp(usuario_apurado || 'Familiar', urgencia || 'media', contexto);
      return NextResponse.json(recordatorio);
    }

    return NextResponse.json(
      { error: 'Acción no válida. Opciones permitidas: "evaluar_destello" o "apurar_por_whatsapp"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error en /api/destellos/arbitro:', error);
    return NextResponse.json(
      { error: 'Error interno en el árbitro de Destellos.' },
      { status: 500 }
    );
  }
}
