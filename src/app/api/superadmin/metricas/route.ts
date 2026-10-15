import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { listarGrupos, listarTodosLosUsuarios, listarGaleria } from '@/lib/db';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Acceso exclusivo para Superadmin.' }, { status: 403 });
  }

  const grupos = await listarGrupos();
  const usuarios = await listarTodosLosUsuarios();
  const destellos = await listarGaleria('grupo-familia-perez-001', 500);

  const totalUsuarios = usuarios.length;
  const totalGrupos = grupos.length;
  const totalAdmins = usuarios.filter((u) => u.rol === 'admin').length;
  const totalMiembros = usuarios.filter((u) => u.rol === 'miembro').length;

  return NextResponse.json({
    totalGrupos,
    totalUsuarios,
    totalAdmins,
    totalMiembros,
    totalDestellos: destellos.length,
    superadminEmail: session.email,
  });
}
