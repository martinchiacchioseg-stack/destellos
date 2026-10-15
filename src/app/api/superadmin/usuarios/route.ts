import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import {
  listarUsuariosGrupo,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuarioPermanente,
  buscarUsuarioPorEmail,
} from '@/lib/db';

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

    const { grupoId, email, nombre, apodo, telefono, passwordTemporal, rol } = await req.json();

    if (!grupoId || !email || !nombre || !passwordTemporal) {
      return NextResponse.json(
        { error: 'Completá todos los campos requeridos.' },
        { status: 400 }
      );
    }

    const existe = await buscarUsuarioPorEmail(email);
    if (existe) {
      const actualizado = await actualizarUsuario(existe.id, {
        nombre,
        apodo: apodo || existe.apodo,
        telefono: telefono || existe.telefono,
        rol: existe.rol === 'superadmin' ? 'superadmin' : (rol || 'miembro'),
        grupo_id: grupoId,
        passwordTemporal: passwordTemporal && passwordTemporal !== '000000' ? passwordTemporal : undefined,
        activo: true,
      });

      return NextResponse.json({
        ok: true,
        mensaje: `Usuario ${actualizado?.nombre || nombre} vinculado al grupo exitosamente.`,
        usuario: actualizado,
      });
    }

    const nuevo = await crearUsuario({
      email,
      nombre,
      apodo,
      telefono,
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

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const { id, nombre, apodo, telefono, email, rol, grupo_id, passwordTemporal } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }

    const actualizado = await actualizarUsuario(id, {
      nombre,
      apodo,
      telefono,
      email,
      rol,
      grupo_id,
      passwordTemporal,
    });

    if (!actualizado) {
      return NextResponse.json({ error: 'No se encontró el usuario.' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      mensaje: 'Usuario modificado con éxito.',
      usuario: actualizado,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al modificar usuario.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }

    // Evitar que el superadmin se borre a sí mismo accidentalmente
    if (id === session.id) {
      return NextResponse.json({ error: 'No podés eliminar tu propia cuenta de Superadmin.' }, { status: 400 });
    }

    const ok = await eliminarUsuarioPermanente(id);
    if (!ok) {
      return NextResponse.json({ error: 'No se encontró el usuario a eliminar.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, mensaje: 'Usuario eliminado permanentemente.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al eliminar usuario.' }, { status: 500 });
  }
}
