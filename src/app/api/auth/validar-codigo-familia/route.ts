import { NextRequest, NextResponse } from 'next/server';
import { buscarGrupoPorCodigo } from '@/lib/db';
import { checkRateLimit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anon';
    const rate = checkRateLimit(`validar-codigo:${ip}`, 10, 60);
    if (!rate.permitido) {
      return NextResponse.json(
        { error: `Demasiados intentos. Por favor aguardá ${rate.segundosRestantes} segundos.` },
        { status: 429 }
      );
    }

    const { codigo } = await req.json();
    if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
      return NextResponse.json(
        { error: 'Por favor ingresá el código de tu familia.' },
        { status: 400 }
      );
    }

    const grupo = await buscarGrupoPorCodigo(codigo);
    if (!grupo) {
      return NextResponse.json(
        {
          error:
            'El código ingresado no corresponde a ninguna familia activa. Verificá con el administrador de tu grupo familiar.',
        },
        { status: 404 }
      );
    }

    // Validación estricta de Licencia Familiar
    if (grupo.licencia_activa === false || !grupo.activo) {
      return NextResponse.json(
        {
          error: `La licencia de la familia "${grupo.nombre}" se encuentra temporalmente suspendida. Comunicate con el administrador para reactivar el acceso.`,
        },
        { status: 403 }
      );
    }

    if (grupo.fecha_vencimiento) {
      const hoy = new Date().toISOString().split('T')[0];
      if (grupo.fecha_vencimiento < hoy) {
        return NextResponse.json(
          {
            error: `La licencia de la familia "${grupo.nombre}" venció el ${grupo.fecha_vencimiento}. Comunicate con el administrador para renovarla y seguir compartiendo destellos.`,
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      mensaje: `¡Bienvenido a la familia ${grupo.nombre}!`,
      grupo: {
        id: grupo.id,
        nombre: grupo.nombre,
        emoji_or_logo: grupo.emoji_or_logo || '✨',
        hora_limite: grupo.hora_limite || '22:00',
        descripcion: grupo.descripcion || '',
        admin_nombre: grupo.admin_nombre || 'el Administrador',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al verificar el código de familia.' },
      { status: 500 }
    );
  }
}
