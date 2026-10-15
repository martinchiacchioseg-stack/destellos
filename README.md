# Destellos ✨ ("un clic familiar")

Una web app mobile-first para familias y grupos de amigos. Cada miembro sube **una foto o video por día**, y un asistente inteligente con **Gemini** elige el "Destello del Día" sin explicar el motivo, otorgando puntos a su autor. Además, incluye mini-juegos comunitarios en una arquitectura extensible.

---

## 🎨 Identidad y Estética
- **Diseño**: Cálido, alegre y moderno, inspirado en álbumes de fotos familiares y recuerdos cotidianos.
- **Paleta**: Tonos crema, durazno, coral y ámbar, con acentos vibrantes y modo oscuro integrado.
- **Tipografía**: Nunito redondeada y legible para todas las edades.
- **Idioma**: Español rioplatense cercano y afectuoso (*"¡Tu destello fue el elegido!", "Adiviná quién la sacó"*).

---

## 🚀 Estado: ETAPA 1 (Base, Estética, Roles y Autenticación)

### Lo que quedó implementado:
1. **Base y Estructura**:
   - Next.js 16 (App Router) + Tailwind CSS configurado con estética mobile-first.
   - Navegación inferior fija (*Hoy, Juegos, Ranking, Galería*).
   - Encabezado con logo `Destellos✨`, bajada *"un clic familiar"*, contador de puntos y acceso a perfil.
   - Configuración de crons para Vercel en `vercel.json` con zona horaria `America/Argentina/Buenos_Aires`.
2. **Base de Datos y Puntos**:
   - Script SQL completo para Supabase en `supabase/schema.sql` con Row Level Security (RLS) e índices.
   - Tabla genérica de eventos de puntos (`puntos_eventos`) para sumar juegos fácilmente sin romper nada.
3. **Roles y Autenticación**:
   - **Superadmin**: Configurado vía variables de entorno (`SUPERADMIN_EMAIL` y `SUPERADMIN_INITIAL_PASSWORD`), hasheado en bcrypt, nunca expuesto en código cliente. Gestiona grupos y administradores (`/superadmin`).
   - **Administrador**: Gestiona miembros de su grupo familiar, resetea contraseñas y administra accesos (`/admin`).
   - **Miembro**: Acceso a subidas y feed del grupo.
4. **Seguridad y Flujo de Contraseñas**:
   - Hasheo de contraseñas con `bcryptjs`.
   - Sesiones seguras con cookies `httpOnly` firmadas con JWT (`jose`).
   - **Cambio obligatorio (`debe_cambiar_password = true`)**: Todo nuevo usuario y el superadmin inicial en su primer ingreso son derivados obligatoriamente a `/cambiar-password` (mínimo 8 caracteres, distinta a la temporal).
   - Bloqueo por intentos fallidos (protección contra fuerza bruta tras 5 intentos).
   - Rutas protegidas mediante `middleware.ts` en frontend y backend.

---

## 🔑 Credenciales para Probar la Etapa 1

En la pantalla de login (`/login`) contás con botones de acceso rápido para probar cada rol:

| Rol | Email | Contraseña Inicial | Comportamiento |
| :--- | :--- | :--- | :--- |
| **Superadmin** | `martinchiaccio.seg@gmail.com` | `qwerty1234` | Exige cambio obligatorio a min. 8 caracteres; luego da acceso a `/superadmin`. |
| **Administrador** | `mama.perez@destellos.ar` | `familia2026` | Acceso directo a `/` y al panel de gestión de miembros `/admin`. |
| **Miembro** | `nico.perez@destellos.ar` | `familia2026` | Acceso directo como participante familiar. |

---

## 🛠️ Configuración de Variables de Entorno

Creá un archivo `.env.local` basado en `.env.example`:

```env
# Gemini API
GEMINI_API_KEY=tu_api_key_de_gemini

# Superadmin Inicial
SUPERADMIN_EMAIL=martinchiaccio.seg@gmail.com
SUPERADMIN_INITIAL_PASSWORD=qwerty1234

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Sesiones JWT
JWT_SECRET=tu_clave_secreta_jwt_2026

# Crons de Vercel
CRON_SECRET=tu_cron_secret
```

---

## 🚢 Despliegue en Vercel

1. Subí el repositorio a GitHub o GitLab.
2. Importá el proyecto en [Vercel](https://vercel.com).
3. Configurá las variables de entorno listadas arriba en la pestaña **Settings > Environment Variables**.
4. En Supabase:
   - Creá un proyecto nuevo.
   - Abrí el **SQL Editor** y ejecutá el archivo [supabase/schema.sql](file:///C:/Users/marti/.gemini/antigravity/scratch/destellos/supabase/schema.sql).
5. Desplegá el proyecto en Vercel.
