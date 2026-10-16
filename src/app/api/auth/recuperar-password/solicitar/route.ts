import { NextRequest, NextResponse } from 'next/server';
import { guardarCodigoRecuperacion } from '@/lib/db';
import { checkRateLimit } from '@/lib/auth';
import { enviarCodigoRecuperacionPassword } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'ip';
    const rate = checkRateLimit(`recuperar-solicitar:${ip}`, 4, 300);
    if (!rate.permitido) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes de recuperación. Por favor aguardá unos minutos.' },
        { status: 429 }
      );
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Por favor ingresá un correo electrónico válido.' },
        { status: 400 }
      );
    }

    // Generar código numérico de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    const res = await guardarCodigoRecuperacion(email.trim(), codigo);
    if (!res.ok) {
      // Por privacidad, decimos que si la cuenta existe se envió el código
      return NextResponse.json({
        ok: true,
        mensaje: 'Si el correo está registrado, recibirás un código de verificación en tu casilla.',
      });
    }

    await enviarCodigoRecuperacionPassword({
      email: email.trim(),
      nombre: res.nombre || 'Integrante',
      codigo,
    });

    return NextResponse.json({
      ok: true,
      mensaje: 'Te enviamos un código de verificación de 6 dígitos a tu correo.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al solicitar recuperación.' }, { status: 500 });
  }
}
