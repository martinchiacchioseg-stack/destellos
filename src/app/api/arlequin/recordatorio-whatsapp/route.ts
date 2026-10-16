import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { generarRecordatorioHumorWhatsApp } from '@/lib/gemini';
import { dbGet, dbGetAll } from '@/lib/sqlite-store';
import { Grupo, Usuario } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { usuarioFaltanteId, nombreFaltante, telefono } = await req.json();

    let nombre = nombreFaltante;
    let tel = telefono;

    if (usuarioFaltanteId) {
      const u = dbGet<Usuario>('usuarios', usuarioFaltanteId);
      if (u) {
        nombre = nombre || u.apodo || u.nombre;
        tel = tel || u.whatsapp || u.telefono;
      }
    }

    if (!nombre) {
      return NextResponse.json({ error: 'Nombre de la persona requerido.' }, { status: 400 });
    }

    let grupoNombre = 'Familia';
    let horaLimite = '22:00';
    if (session.grupo_id) {
      const g = dbGet<Grupo>('grupos', session.grupo_id);
      if (g) {
        grupoNombre = g.nombre;
        horaLimite = g.hora_limite || '22:00';
      }
    }

    const texto = await generarRecordatorioHumorWhatsApp(nombre, horaLimite, grupoNombre);

    let whatsappUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    if (tel) {
      const limpio = tel.replace(/[^0-9]/g, '');
      if (limpio) {
        whatsappUrl = `https://wa.me/${limpio}?text=${encodeURIComponent(texto)}`;
      }
    }

    return NextResponse.json({
      ok: true,
      texto,
      whatsappUrl,
    });
  } catch (error: any) {
    console.error('Error en /api/arlequin/recordatorio-whatsapp:', error);
    return NextResponse.json({ error: 'Error al generar recordatorio.' }, { status: 500 });
  }
}
