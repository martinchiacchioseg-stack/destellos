import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { listarUsuariosGrupo, crearUsuario, buscarUsuarioPorEmail } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const grupoId = searchParams.get('grupoId');
  if (!grupoId) {
    return NextResponse.json({ error: 'ID de grupo requerido.' }, { status: 400 });
  }

  const usuarios = await listarUsuariosGrupo(grupoId);
  return NextResponse.json({ usuarios });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const { grupoId, email, nombre, apodo, passwordTemporal, rol } = await req.json();

    if (!grupoId || !email || !nombre || !passwordTemporal) {
      return NextResponse.json(
        { error: 'Completá todos los campos requeridos.' },
        { status: 400 }
      );
    }

    const existe = await buscarUsuarioPorEmail(email);
    if (existe) {
      return NextResponse.json({ error: 'Ya existe un usuario con este correo.' }, { status: 400 });
    }

    const nuevo = await crearUsuario({
      email,
      nombre,
      apodo,
      passwordTemporal,
      rol: rol || 'miembro',
      grupo_id: grupoId,
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Usuario ${nuevo.nombre} creado para el grupo. Deberá cambiar su clave al ingresar.`,
      usuario: nuevo,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear usuario.' }, { status: 500 });
  }
}
