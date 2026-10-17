# DESTELLOS — Un clic familiar (by Rolφ)

Plataforma móvil y web de encuentro diario para familias privadas.
- **Sello y alma permanente**: `by Rolφ` (homenaje al padre del creador).
- **Personaje escénico**: Arlequín (antifaz lúdico, corazón y calidez barrial rioplatense de Rolφ).
- **Producción**: Vercel (Next.js Serverless) + Supabase (PostgreSQL permanente + Storage privado).

---

## 🌟 Principios Fundamentales

1. **El Alma de Rolφ es Sagrada e Intocable**:
   - El pie de página con el logo y la leyenda `by Rolφ` es permanente en toda la aplicación.
   - Aloja el portal secreto de acceso para el Superadministrador (3 clics rápidos).
   - Arlequín es la voz visible y el juego; Rolφ es la bondad, el afecto paternal y los guardrails éticos: nunca juzgar, jamás agredir, siempre cuidar y conciliar con humor entrañable.
2. **Cero Datos Demo (Clean Slate) & Persistencia Indestructible**:
   - Conexión directa a Supabase PostgreSQL. Cero archivos efímeros en `/tmp`.
   - No existen grupos ficticios ni usuarios de ejemplo.
   - Modificación y eliminación permanente de cualquier familia o integrante, con borrado en cascada e higienización de Storage.
3. **Dinámica Exclusiva**:
   - **La Foto del Día**: Un destello diario por integrante antes de la hora límite. Veredicto diario asistido por Gemini con ternura y Diploma de Honor estampado en servidor con Sharp (+5 puntos ganador, +1 punto por foto).
   - **Trivia Diaria de Arlequín**: Un turno diario (renueva 00:00 hs), 3 niveles (Fácil 15s +1pt, Medio 20s +3pts, Experto 25s +5pts), evaluación personalizada con humor rioplatense y botón de reinicio para pruebas de superadmin.

---

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16.4+ (App Router con Turbopack) & React 19.
- **Base de Datos & Storage**: Supabase (`@supabase/supabase-js`) con PostgreSQL y Storage privado con URLs firmadas (1h).
- **Inteligencia Artificial**: Google Gen AI SDK (`@google/genai`) con modelo `gemini-2.5-flash`.
- **Procesamiento de Imágenes**: `sharp` (compresión optimizada y estampado de diplomas).
- **Estilos & Animaciones**: Tailwind CSS v4, `@tailwindcss/postcss`, `framer-motion`, `canvas-confetti`, `lucide-react`.
- **Seguridad**: `jose` (JWT firmado en cookies HTTP-Only, SameSite=Lax, Secure), `bcryptjs` (hashing seguro), `zod` (validaciones estrictas).
- **Reportes**: `jspdf` para exportación de auditorías técnicas descargables en PDF.

---

## 🚀 Puesta en Marcha

### 1. Variables de Entorno (`.env.local` en desarrollo o en Vercel Settings)

Configurar según `.env.example`:

```bash
# Supabase (Project Settings > API)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_secret_key

# Sesiones seguras (mínimo 32 caracteres)
SESSION_SECRET=tu_secreto_aleatorio_muy_largo_y_seguro

# Superadmin (credenciales en servidor; el hash se genera con bcryptjs)
SUPERADMIN_EMAIL=martinchiacchio.seg@gmail.com
SUPERADMIN_PASSWORD_HASH=$2a$12$...

# Google Gemini API
GEMINI_API_KEY=tu_gemini_api_key

# Resend Email (recuperación de clave y avisos al administrador)
RESEND_API_KEY=re_...
MAIL_FROM="Destellos <no-reply@tudominio.com>"

# Vercel Crons
CRON_SECRET=destellos_cron_secret_2026
```

> **Generar hash bcrypt para el Superadministrador**:
> ```bash
> node -e "console.log(require('bcryptjs').hashSync('TuClaveSecreta', 12))"
> ```

### 2. Inicializar la Base de Datos

Abrir la consola de Supabase -> **SQL Editor** y ejecutar el contenido de:
```
supabase/schema.sql
```
Crea todas las tablas con Row Level Security activado, índices únicos, restricciones de integridad y el bucket privado `destellos`. Arranca limpia, sin datos ficticios.

### 3. Desarrollo y Compilación Local

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Compilación de producción
npm run build
```

---

## 🔒 Acceso Secreto del Superadministrador

En la interfaz pública no existe la palabra "superadministrador" ni accesos directos visibles.
1. Ir al pie de página donde dice `by Rolφ`.
2. Hacer **tres (3) clics rápidos consecutivos** sobre la leyenda.
3. Se despliega el modal seguro para ingresar con `SUPERADMIN_EMAIL` y su clave.
4. El panel permite:
   - Crear, modificar y eliminar familias (con control de licencias de 1 mes, 3 meses, 1 año).
   - Gestionar integrantes, resetear contraseñas, desbloquear y modo prueba ("Entrar como…").
   - Publicar avisos destacados en el Cartel LED Vintage (Pizarra Dot Matrix).
   - Administrar publicidades y banners.
   - Ejecutar la **Herramienta de Diagnóstico Integral** y **Descargar Diagnóstico PDF**.
