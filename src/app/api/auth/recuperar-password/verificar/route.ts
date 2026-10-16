import { NextRequest, NextResponse } from 'next/server';
import { validarYAplicarNuevaPassword } from '@/lib/db';
import { hashPassword, validarFortalezaPassword, checkRateLimit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'ip';
    const rate = checkRateLimit(`recuperar-verificar:${ip}`, 5, 300);
    if (!rate.permitido) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Por favor aguardá 5 minutos.' },
        { status: 429 }
      );
    }

    const { email, codigo, nuevaPassword } = await req.json();

    if (!email || !codigo || !nuevaPassword) {
      return NextResponse.json(
        { error: 'Completá tu correo, código de 6 dígitos y la nueva contraseña.' },
        { status: 400 }
      );
    }

    const valPass = validarFortalezaPassword(nuevaPassword);
    if (!valPass.esValida) {
      return NextResponse.json({ error: valPass.error }, { status: 400 });
    }

    const nuevoHash = await hashPassword(nuevaPassword.trim());
    const res = await validarYAplicarNuevaPassword(email.trim(), codigo.trim(), nuevoHash);

    if (!res.ok) {
      return NextResponse.json({ error: res.error || 'Código incorrecto o expirado.' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      mensaje: '¡Tu contraseña ha sido restablecida con éxito! Ya podés ingresar.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al verificar código.' }, { status: 500 });
  }
}
