# Destellos ✨ ("un clic familiar")

Una web app mobile-first integral para familias y grupos de amigos. Cada miembro sube **una foto o video por día**, y un asistente inteligente con **Gemini** elige el "Destello del Día" (por gracia, belleza, creatividad o emoción) sin develar los motivos. Además, cuenta con mini-juegos comunitarios, ranking en vivo, muro de colgados, ruleta rusa interactiva con moderación por IA, prode automático de fútbol, monetización con anuncios patrocinados y control multi-familia para el Superadministrador.

---

## 🎨 Identidad, Estética y Branding
- **Identidad Oficial**: Los logotipos oficiales alternan de forma suave y automática cada 5 segundos entre *"Destellos Chiacchio's"* y *"Destellos - un clic familiar by Rolφ"*, con el icono oficial de la app en la pestaña del navegador.
- **Diseño**: Cálido, moderno y alegre, inspirado en álbumes de recuerdos polaroid y sensación de juego amistoso.
- **Paleta**: Tonos suaves de durazno, crema, coral y ámbar, con acentos vibrantes y modo oscuro elegante.
- **Tipografía**: Nunito redondeada y amigable, legible para todas las edades.
- **Idioma**: Español rioplatense cercano y afectuoso (*"¡Qué hacés!", "Apurar por WhatsApp", "Muro de los Colgados", "Adiviná quién la sacó"*).

---

## 🌟 Módulos y Funcionalidades Principales

### 1. Pantalla "Hoy" (`/`)
- **Saludo personalizado y fecha** en hora de Argentina (`America/Argentina/Buenos_Aires`).
- **Contador de Racha Diaria (Streak)** 🔥: Muestra los días consecutivos subiendo fotos.
- **Revelado del Destello de Ayer 🏆**: Tarjeta con botón de misterio; al tocarlo se dispara confeti y se devela la foto ganadora elegida por Gemini con su corona dorada.
- **Apurar por WhatsApp 📲**: Lista de miembros que todavía no subieron su destello hoy, con botón directo a WhatsApp (`wa.me`) con textos rioplatenses humorísticos para apurarlos.
- **Muro de los Colgados 👻**: Si alguien no subió su foto el día anterior, aparece con un simpático fantasmita recordatorio.
- **Efecto Desenfocado (Blur) 🔒**: Fotos de otros miembros con desenfoque suave hasta que el usuario suba la suya o hasta que todos los miembros hayan cumplido la consigna diaria.
- **Subida y Reemplazo**: Botón táctil para subir 1 foto o video corto (máx. 30s / 50MB), con compresión automática en Canvas en el cliente y opción de reemplazarla hasta las 23:59 hs.

### 2. Pestaña "Juegos" (`/juegos`)
- 🎲 **Ruleta Rusa (Etapa 6)**:
  - Fase de preguntas anónimas con niveles: *Suave 🌿*, *Picante 🌶️* y *Extra Picante 🔥*.
  - **Moderación en tiempo real por Gemini**: La IA analiza cada pregunta y rechaza preguntas ofensivas o humillantes sugiriendo reformularlas.
  - **Tambor de revólver interactivo de 6 recámaras**: Cilindro 3D giratorio con efectos de sonido mecánicos vía Web Audio API (con botón para silenciar).
  - **La Bala 💥**: Una recámara aleatoria tiene bala; si sale, la consigna exige responder obligatoriamente con foto o video.
  - Botón de **"Pasar"** (1 vez por ronda) y feed de respuestas con reacciones: 😂, 🔥, ❤️ (+2 pts por responder, +3 más reaccionada, +1 pregunta destacada).
- ⚽ **Prode del Fin de Semana (Etapa 7)**:
  - Fixture de la Liga Profesional de Fútbol con escudos de equipos, horarios en hora de Argentina y botones *Local (L)*, *Empate (X)* o *Visitante (V)* y marcadores opcionales para bonus.
  - Sincronización automática vía cron / API y panel admin para corrección manual.
- 🎯 **Reto del Día (Etapa 4)**: Consigna creativa generada por IA cada mañana (+2 pts al cumplirla).
- 🗳️ **Votación Cruzada (Etapa 4)**: Duelo de fotos entre miembros para premiar al favorito del grupo (+1 pt por votar, +5 pts al más votado).
- 🕵️ **Adiviná Quién la Sacó (Etapa 5)**: Fotos del grupo sin firma; adiviná de quién es cada una (+1 pt por acierto).
- 🕰️ **Foto del Pasado (Etapa 8)**: Foto retro de la semana con pista; los miembros adivinan el año (+3 pts año exacto, +1 aprox).

### 3. Pestaña "Ranking" (`/ranking`)
- **Podio Animado de 3 Puestos**:
  - 1º Lugar: Pedestal dorado con corona dorada 👑.
  - 2º Lugar: Pedestal plateado 🥈.
  - 3º Lugar: Pedestal bronce 🥉.
- Pestañas conmutables: **Hoy (Diario)**, **Semana** y **Total Histórico**.
- Distintivo para el usuario activo ("¡Sos vos! ✨"), insignias de destellos ganados y contador de rachas.

### 4. Pestaña "Galería" (`/galeria`)
- Cuadrícula polaroid de fotos de días anteriores con efecto de cinta washi tape y coronas de ganadores.
- Visor Lightbox a pantalla completa con navegación táctil y datos de la foto.
- Filtros por mes y año.

### 5. Panel de Superadmin Multi-Familia (`/superadmin`)
- **Familias / Grupos**: Creación de nuevas familias/grupos con código de invitación único.
- **Gestión de Usuarios por Familia**: Creación de miembros o administradores para cualquier familia con asignación de contraseña temporal y flag obligatorio `debe_cambiar_password = true`.
- **Gestor de Publicidades & Sponsors**:
  - Creación de anuncios con título, texto explicativo, imagen y enlace web.
  - Ubicación configurable:
    1. `post_subida`: Anuncio con cuenta regresiva de 5 segundos que se muestra inmediatamente tras subir la foto, confirmando la subida al terminar el tiempo.
    2. `foto_ganadora`: Anuncio ubicado debajo de la foto ganadora de ayer en la pantalla Hoy.
    3. `prode`: Anuncio banner en el Prode del fin de semana.
- **Ajuste de Reglas**: Nivel máximo de picante en Ruleta Rusa, desenfoque de fotos y bonus de marcador en Prode.

---

## 🔒 Roles y Seguridad
- **Superadmin**: `martinchiaccio.seg@gmail.com` (leído de variables de entorno, hasheado con bcrypt).
- **Administrador**: Gestiona los miembros de su propia familia.
- **Miembro**: Participante del grupo familiar.
- **Cambio Obligatorio de Contraseña**: En el primer ingreso, cualquier usuario (incluido el superadmin inicial) es derivado a `/cambiar-password` (mínimo 8 caracteres, distinta de la temporal).

---

## 🚀 Despliegue en Vercel

### Paso 1: Subir a GitHub
```bash
git remote add origin https://github.com/tu-usuario/destellos.git
git branch -M main
git push -u origin main
```

### Paso 2: Importar en Vercel
1. Ingresá a [vercel.com](https://vercel.com) y hacé clic en **Add New Project**.
2. Seleccioná el repositorio de `destellos`.
3. Configurá el Framework Preset como **Next.js**.

### Paso 3: Configurar Variables de Entorno en Vercel
Agregá las siguientes variables en **Settings -> Environment Variables**:

| Variable | Valor / Descripción |
| :--- | :--- |
| `GEMINI_API_KEY` | Clave de API de Google Gemini |
| `SUPERADMIN_EMAIL` | `martinchiaccio.seg@gmail.com` |
| `SUPERADMIN_INITIAL_PASSWORD` | `qwerty1234` |
| `JWT_SECRET` | Una clave secreta alfanumérica larga |
| `CRON_SECRET` | Clave para proteger los endpoints de Vercel Cron |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase *(opcional si usás SQLite/Memory)* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase |

### Paso 4: Desplegar
Hacé clic en **Deploy**. Los crons configurados en `vercel.json` se programarán automáticamente:
- `0 9 * * *`: 06:00 AM Argentina (Generación del reto del día por Gemini).
- `59 2 * * *`: 23:59 PM Argentina (Cierre del día, evaluación y elección del Destello del Día con otorgamiento de puntos).

---

## 🛠️ Desarrollo Local
```bash
# Instalar dependencias
npm install

# Compilar proyecto y verificar tipos
npm run build

# Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:3000`.
