import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  crearMensajePizarra,
  listarMensajesPizarra,
  actualizarMensajePizarra,
  eliminarMensajePizarra,
  limpiarMensajesPizarraVencidos,
} from '@/lib/db';
import { dbGetAll } from '@/lib/sqlite-store';
import { MensajePizarra } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo de Superadministrador.' }, { status: 403 });
    }

    await limpiarMensajesPizarraVencidos();
    const mensajes = dbGetAll<MensajePizarra>('boardMessages').sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ ok: true, mensajes });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al listar mensajes de la pizarra.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo de Superadministrador.' }, { status: 403 });
    }

    const { group_id, text, priority, color, scheduled_at, expires_at } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'El texto del mensaje es obligatorio.' }, { status: 400 });
    }

    if (text.trim().length > 120) {
      return NextResponse.json({ error: 'El mensaje no puede superar los 120 caracteres.' }, { status: 400 });
    }

    const nuevo = await crearMensajePizarra({
      group_id: group_id || 'all',
      text: text.trim(),
      type: 'manual',
      priority: priority || 'normal',
      color: color || 'ambar',
      author: 'superadmin',
      scheduled_at: scheduled_at || undefined,
      expires_at: expires_at || undefined,
    });

    return NextResponse.json({ ok: true, mensaje: nuevo });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear mensaje de pizarra.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo de Superadministrador.' }, { status: 403 });
    }

    const { id, text, priority, color, status, group_id, scheduled_at, expires_at } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID de mensaje requerido.' }, { status: 400 });
    }

    const actualizado = await actualizarMensajePizarra(id, {
      ...(text ? { text } : {}),
      ...(priority ? { priority } : {}),
      ...(color ? { color } : {}),
      ...(status ? { status } : {}),
      ...(group_id ? { group_id } : {}),
      ...(scheduled_at !== undefined ? { scheduled_at } : {}),
      ...(expires_at !== undefined ? { expires_at } : {}),
    });

    if (!actualizado) {
      return NextResponse.json({ error: 'Mensaje no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, mensaje: actualizado });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al actualizar mensaje de pizarra.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso exclusivo de Superadministrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID de mensaje requerido.' }, { status: 400 });
    }

    const ok = await eliminarMensajePizarra(id);
    return NextResponse.json({ ok });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar mensaje de pizarra.' }, { status: 500 });
  }
}
