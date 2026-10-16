/**
 * Servicio de Envíos de Correo para Destellos — un clic familiar by Rolφ
 * - Avisos al administrador cuando se suma un nuevo integrante (con foto y mensaje cálido)
 * - Envío de código de recuperación de contraseña de 6 dígitos
 */

export interface EnviarAvisoAdminParams {
  adminEmail: string;
  adminNombre: string;
  grupoNombre: string;
  nuevoMiembroNombre: string;
  nuevoMiembroApodo?: string;
  nuevoMiembroFoto?: string;
  nuevoMiembroWhatsapp?: string;
  nuevoMiembroNacimiento?: string;
  mensajeGemini: string;
}

export async function enviarAvisoNuevoIntegranteAdmin(params: EnviarAvisoAdminParams): Promise<{ ok: boolean }> {
  const {
    adminEmail,
    adminNombre,
    grupoNombre,
    nuevoMiembroNombre,
    nuevoMiembroApodo,
    nuevoMiembroFoto,
    nuevoMiembroWhatsapp,
    mensajeGemini,
  } = params;

  const subject = `✨ ¡Nuevo integrante en la familia ${grupoNombre}! — ${nuevoMiembroNombre}`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #fed7aa; box-shadow: 0 4px 20px rgba(255, 112, 67, 0.08);">
      <div style="background: linear-gradient(135deg, #FF7043, #F4511E); padding: 28px 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Destellos</h1>
        <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9;">un clic familiar by Rolφ</p>
      </div>

      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; color: #1f2937; line-height: 1.5; margin-top: 0;">
          ¡Hola <strong>${adminNombre}</strong>!
        </p>

        <div style="background-color: #fff7ed; border-left: 4px solid #FF7043; padding: 14px 16px; border-radius: 12px; margin: 18px 0; font-size: 14px; color: #9a3412; font-style: italic;">
          "${mensajeGemini}"
        </div>

        <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; padding: 16px; margin: 20px 0; display: flex; align-items: center; gap: 16px;">
          ${
            nuevoMiembroFoto
              ? `<img src="${nuevoMiembroFoto}" alt="${nuevoMiembroNombre}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #FF7043;" />`
              : `<div style="width: 64px; height: 64px; border-radius: 50%; background-color: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; text-align: center; line-height: 64px;">${nuevoMiembroNombre.charAt(0)}</div>`
          }
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #111827;">${nuevoMiembroNombre} ${nuevoMiembroApodo ? `<span style="font-weight: normal; color: #6b7280;">("${nuevoMiembroApodo}")</span>` : ''}</h3>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #4b5563;">
              <strong>Rol:</strong> Miembro familiar<br/>
              ${nuevoMiembroWhatsapp ? `<strong>WhatsApp:</strong> ${nuevoMiembroWhatsapp}<br/>` : ''}
              <strong>Familia:</strong> ${grupoNombre}
            </p>
          </div>
        </div>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
          Este integrante ya tiene acceso a la galería, puede subir sus destellos y participar en todos los juegos diarios del grupo.
        </p>
      </div>

      <div style="background-color: #fafaf9; padding: 16px 24px; text-align: center; border-top: 1px solid #f3f4f6; font-size: 11px; color: #9ca3af;">
        Destellos — Creado con afecto familiar by <strong>Rolφ</strong>.<br/>
        Este es un aviso automático para el administrador de la familia.
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`[EMAIL DISPARADO AL ADMINISTRADOR]`);
  console.log(`Para: ${adminEmail}`);
  console.log(`Asunto: ${subject}`);
  console.log(`Mensaje IA: ${mensajeGemini}`);
  console.log(`======================================================\n`);

  // Si existe servicio SMTP o Resend en env, se puede enviar realmente
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Destellos by Rolφ <notificaciones@destellos.app>',
          to: adminEmail,
          subject,
          html: htmlContent,
        }),
      });
    } catch (e) {
      console.warn('[Email] Error enviando por Resend:', e);
    }
  }

  return { ok: true };
}

export interface EnviarCodigoRecuperacionParams {
  email: string;
  nombre: string;
  codigo: string;
}

export async function enviarCodigoRecuperacionPassword(params: EnviarCodigoRecuperacionParams): Promise<{ ok: boolean }> {
  const { email, nombre, codigo } = params;
  const subject = `🔐 Código de recuperación para Destellos: ${codigo}`;

  console.log(`\n======================================================`);
  console.log(`[EMAIL RECUPERACIÓN DE CONTRASEÑA]`);
  console.log(`Para: ${email} (${nombre})`);
  console.log(`Código de 6 dígitos: ${codigo} (Válido por 15 minutos)`);
  console.log(`======================================================\n`);

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Destellos by Rolφ <seguridad@destellos.app>',
          to: email,
          subject,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 20px;">
              <h2 style="color: #FF7043; margin-top: 0;">Recuperación de Contraseña</h2>
              <p>Hola <strong>${nombre}</strong>,</p>
              <p>Tu código de verificación para cambiar tu contraseña en Destellos es:</p>
              <div style="background-color: #fff7ed; padding: 16px; border-radius: 12px; font-size: 28px; font-weight: 900; letter-spacing: 6px; text-align: center; color: #ea580c; font-family: monospace;">
                ${codigo}
              </div>
              <p style="font-size: 12px; color: #6b7280; margin-top: 16px;">
                Este código expira en 15 minutos. Si no solicitaste este cambio, podés ignorar este mensaje.
              </p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.warn('[Email] Error enviando por Resend:', e);
    }
  }

  return { ok: true };
}
