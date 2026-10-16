# Destellos ✨ — un clic familiar by Rolφ

Web app mobile-first integral para familias y grupos de amigos. Cada día, cada miembro sube una foto (su **"destello"**), todos adivinan quién sacó cada una, una IA (**Google Gemini**) elige el mejor destello del día y los ganadores quedan publicados en un feed privado con un **diploma de honor estampado directamente sobre la foto** mediante procesamiento en servidor con `sharp`.

---

## 🎨 Identidad, Estética y Branding
- **Nombre Oficial**: App **Destellos** — bajada: *"un clic familiar"*.
- **Sello de Marca**: Con la leyenda *"by Rolφ"* (`Rol` + letra griega `φ`, estrictamente nunca *"Rolfi"*).
- **Color Principal**: `#FF7043` (Coral cálido / atardecer familiar) combinado con fondos limpios y soporte para modo oscuro.
- **Zona Horaria de Referencia**: `America/Argentina/Buenos_Aires` (todos los cortes, cierres y cálculos se basan en este huso horario).

---

## 🚀 Arquitectura y Stack Tecnológico
- **Frontend / Backend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS.
- **Base de Datos y Storage**: Supabase (PostgreSQL con Row Level Security activado en **todas** las tablas, Storage privado con URLs firmadas) + Capa híbrida reactiva local SQLite (`data/destellos.db`) para desarrollo local y resiliencia.
- **Inteligencia Artificial**: Google Gemini API llamada **exclusivamente desde el servidor** (la clave `GEMINI_API_KEY` nunca llega al navegador).
- **Procesamiento de Imágenes en Servidor**: `sharp` para sanitización profunda (eliminación de metadatos EXIF / GPS sensible, redimensionado a máx. 1600px, compresión WebP de alta calidad) y estampado automático del diploma oficial.
- **Seguridad**:
  - `httpOnly`, `Secure` y `SameSite` cookies de sesión con JWT.
  - Rate limiting en login, subidas y llamadas a la IA.
  - Validación de esquemas en servidor con `zod`.
  - Contraseñas con `bcrypt` (mínimo 8 caracteres, validación de fortaleza con mayúsculas, números y símbolos).
  - Ninguna contraseña fija o precargada en pantalla ni en código.
  - Forzado obligatorio de cambio de contraseña en el primer acceso.

---

## 👥 Roles del Sistema
1. **Superadministrador (Único dueño)**:
   - Email: `martinchiaccio.seg@gmail.com`
   - Inicializado mediante script de seed (`node scripts/seed-superadmin.js`) o variable de entorno `SUPERADMIN_INITIAL_PASSWORD`.
   - Obligado a cambiar su contraseña en el primer ingreso.
   - Acceso exclusivo al panel `/superadmin`.
2. **Administrador de Grupo**:
   - Gestiona su propio grupo familiar/amigos (agrega miembros, cambia configuración de horarios).
   - Acceso a `/admin`.
3. **Miembro**:
   - Participa de las 3 fases del Destello Diario, Trivia y Ranking de su grupo.

---

## 🔄 El Bucle Diario: Las 3 Fases del Destello

Cada grupo funciona en un espacio aislado e independiente:

```
[ Fase 1: Subida ] ──> [ Fase 2: Adivinanza ] ──> [ Fase 3: Veredicto & Feed ]
   (Fotos ocultas)          (Asignar autores)         (Gemini + Sharp + Diploma)
```

1. **Fase 1 – Subida**:
   - Cada miembro activo sube una sola foto por día (se puede reemplazar hasta que cierre la fase).
   - La app muestra quién ya subió y quién falta con avatar e indicadores en vivo, **sin develar las fotos**.
   - Acceso directo a WhatsApp para apurar a los que faltan con mensajes cómicos y afectuosos.
   - Subida desde cámara directa o galería, con compresión en cliente y sanitización en servidor.
2. **Fase 2 – Adivinar**:
   - Se activa cuando todos los miembros activos subieron su foto o se alcanza la hora límite configurada en el grupo (ej. 22:00 hs Argentina).
   - A cada miembro se le presentan las fotos del día (excepto la suya) y debe asignar quién cree que sacó cada una sin repetir nombres.
   - **Regla de borde**: Grupos de 2 o menos miembros omiten automáticamente esta fase y avanzan directo al veredicto.
3. **Fase 3 – Veredicto & Feed**:
   - Se ejecuta de forma **idempotente** (una única vez por día y grupo mediante transacción segura).
   - **Gemini IA** analiza las fotos y elige el mejor Destello del Día (por gracia, emoción, belleza o creatividad).
   - Sistema de contingencia automática (fallback justo registrado en log) si la IA se agota o sufre timeout.
   - Se estampa en el servidor el **Diploma de Honor** con marco dorado, datos del ganador, fecha y el sello *"Destellos by Rolφ"*.
   - Se publica en el Feed del Grupo con reacciones interactivas (❤️, 👏, 😂, 🔥) y descarga directa de la imagen en alta calidad.

---

## 🏆 Sistema de Puntuación
- **Subir el destello a tiempo**: `+10 puntos`
- **Cada acierto al adivinar autor**: `+5 puntos`
- **Destello elegido por la IA**: `+20 puntos`
- **Bonus de Racha**: `+1 punto` extra por cada 3 días consecutivos de racha activa.
- **Trivia**: `+10`, `+25` o `+50 puntos` según dificultad (Fácil, Media, Difícil).

---

## 🎮 Minijuegos Modulares: Trivia Diaria
- Preguntas de opción múltiple de cultura general, cine, historia y familia en español rioplatense.
- Generadas dinámicamente por la IA o cargadas por administradores.
- Respuestas validadas estrictamente en el servidor con registro en el libro de puntos.
- Arquitectura desacoplada en `src/lib/types.ts` para conectar nuevos minijuegos sin alterar el núcleo.

---

## ⚙️ Variables de Entorno (`.env.local`)

Copiar el archivo `.env.example` a `.env.local` y completar las claves:

```env
# Gemini API (Servidor)
GEMINI_API_KEY=tu_api_key_de_google_gemini

# Superadmin Inicial
SUPERADMIN_EMAIL=martinchiaccio.seg@gmail.com
SUPERADMIN_INITIAL_PASSWORD=qwerty1234

# Supabase (Producción)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Sesiones Seguras JWT
JWT_SECRET=tu_secreto_jwt_largo_y_seguro

# Vercel Cron Secret
CRON_SECRET=tu_cron_secret_para_cierres
```

---

## 🗄️ Configuración de Supabase (SQL con RLS)

1. En el panel de tu proyecto en Supabase, dirigite a **SQL Editor**.
2. Pegá y ejecutá el contenido del archivo:
   `supabase/migrations/20261016_init_destellos_rolphi.sql`
3. Esto creará:
   - Tablas `grupos`, `usuarios`, `destellos`, `adivinanzas`, `evaluaciones_diarias`, `puntos_eventos`, `feed_posts`, `reacciones`, `trivia_preguntas`, `trivia_intentos`, `ai_logs`.
   - **Row Level Security (RLS)** activado en todas las tablas con políticas de aislamiento por `grupo_id`.
   - Storage bucket privado `destellos` para imágenes con sanitización.

---

## 🚀 Despliegue en Vercel

1. **Subir cambios a GitHub**:
   ```bash
   git add .
   git commit -m "feat: complete Destellos by Rolφ architecture"
   git push origin main
   ```
2. **Crear Proyecto en Vercel**:
   - Conectá tu repositorio `destellos`.
   - Framework preset: `Next.js`.
3. **Cargar Variables de Entorno**:
   - En **Settings -> Environment Variables**, agregá todas las variables listadas en `.env.example`.
4. **Deploy**:
   - Hacé clic en **Deploy**. El archivo `vercel.json` configurará el cron de cierre diario automáticamente a las 23:59 hs Argentina (`59 2 * * *`).

---

## 🧪 Checklist de Verificación Manual

| # | Prueba / Flujo | Resultado Esperado |
|---|---|---|
| 1 | **Seed Superadmin** (`node scripts/seed-superadmin.js`) | Crea `martinchiaccio.seg@gmail.com` con flag `debe_cambiar_password = true`. |
| 2 | **Login con contraseña inicial** | Acepta credenciales y redirige inmediatamente a `/cambiar-password`. No permite navegar a otra ruta. |
| 3 | **Validación de contraseña fuerte** | Rechaza contraseñas de menos de 8 caracteres o sin números/mayúsculas. Al ingresar una válida, actualiza el hash y redirige al panel `/superadmin`. |
| 4 | **Creación de Grupo en `/superadmin`** | Permite crear un grupo (ej: *"Familia Chiaccio"* 👨‍👩‍👧‍👦, hora límite `22:00`). |
| 5 | **Creación de Miembro con Clave Única** | Genera una contraseña aleatoria y abre un modal mostrando la clave **una sola vez**. |
| 6 | **Aislamiento Multi-Grupo** | Los miembros de un grupo no pueden ver fotos, feed ni datos de otro grupo. |
| 7 | **Fase 1 (Subida)** | El miembro sube su foto; no se muestra la foto a los demás hasta que abra la Fase 2. La imagen es procesada con `sharp` (sin GPS EXIF, máx 1600px). |
| 8 | **Fase 2 (Adivinanza)** | Aparecen las fotos anónimas de los demás. Se asignan autores sin repetir. |
| 9 | **Fase 3 (Veredicto)** | Gemini evalúa el ganador, se estampa el diploma con sharp (*"Destellos by Rolφ"*) y se publica en el Feed con reacciones. |
| 10 | **Trivia Diaria** | Permite responder la pregunta del día, valida en el servidor y suma puntos al Ranking. |
| 11 | **Compilación de Producción** | `npm run build` compila con éxito en 0 errores. |
