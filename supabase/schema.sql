-- ==============================================================================
-- DESTELLOS ("un clic familiar")
-- Esquema de Base de Datos para Supabase (PostgreSQL)
-- Zona Horaria de referencia: America/Argentina/Buenos_Aires
-- ==============================================================================

-- Habilitar extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: grupos
CREATE TABLE IF NOT EXISTS public.grupos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(120) NOT NULL,
    codigo_invitacion VARCHAR(20) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW())
);

-- 2. TABLA: usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    apodo VARCHAR(60),
    avatar_url TEXT,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('superadmin', 'admin', 'miembro')),
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL,
    debe_cambiar_password BOOLEAN DEFAULT TRUE,
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMP WITH TIME ZONE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW())
);

-- 3. TABLA: retos_diarios
CREATE TABLE IF NOT EXISTS public.retos_diarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tema VARCHAR(200) NOT NULL,
    descripcion TEXT,
    generado_por_ia BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW()),
    CONSTRAINT uq_reto_grupo_fecha UNIQUE (grupo_id, fecha)
);

-- 4. TABLA: destellos (subidas diarias: 1 por miembro por día)
CREATE TABLE IF NOT EXISTS public.destellos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    tipo_media VARCHAR(10) NOT NULL CHECK (tipo_media IN ('foto', 'video')),
    pie_de_foto TEXT,
    cumple_reto BOOLEAN DEFAULT FALSE,
    reto_verificacion_detalle TEXT,
    es_destello_del_dia BOOLEAN DEFAULT FALSE,
    votos_comunidad INTEGER DEFAULT 0,
    es_favorito_comunidad BOOLEAN DEFAULT FALSE,
    moderado BOOLEAN DEFAULT FALSE,
    motivo_moderacion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW()),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW()),
    CONSTRAINT uq_destello_usuario_fecha UNIQUE (grupo_id, usuario_id, fecha)
);

-- 5. TABLA: evaluaciones_diarias (cierre del día con Gemini)
CREATE TABLE IF NOT EXISTS public.evaluaciones_diarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    destello_ganador_id UUID REFERENCES public.destellos(id) ON DELETE SET NULL,
    destello_favorito_id UUID REFERENCES public.destellos(id) ON DELETE SET NULL,
    total_participantes INTEGER DEFAULT 0,
    cerrado BOOLEAN DEFAULT FALSE,
    cerrado_en TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_evaluacion_grupo_fecha UNIQUE (grupo_id, fecha)
);

-- 6. TABLA: puntos_eventos (tabla genérica y centralizada de puntos)
CREATE TABLE IF NOT EXISTS public.puntos_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    puntos INTEGER NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    referencia_id UUID,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW())
);

-- 7. TABLA: juego_adivina_intentos (Mini-juego 2: Adiviná quién la sacó)
CREATE TABLE IF NOT EXISTS public.juego_adivina_intentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    destello_id UUID NOT NULL REFERENCES public.destellos(id) ON DELETE CASCADE,
    autor_adivinado_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    es_correcto BOOLEAN NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW()),
    CONSTRAINT uq_adivina_usuario_destello UNIQUE (usuario_id, destello_id)
);

-- 8. TABLA: juego_votos_cruzados (Mini-juego 4: Votación comunitaria del día)
CREATE TABLE IF NOT EXISTS public.juego_votos_cruzados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    votante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    destello_id UUID NOT NULL REFERENCES public.destellos(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW()),
    CONSTRAINT uq_voto_votante_fecha UNIQUE (grupo_id, fecha, votante_id)
);

-- 9. TABLA: juego_foto_pasado (Mini-juego 3: Foto del Pasado)
CREATE TABLE IF NOT EXISTS public.juego_foto_pasado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    semana VARCHAR(10) NOT NULL, -- Ej: '2026-W42'
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    anio_real INTEGER NOT NULL,
    lugar_real VARCHAR(200) NOT NULL,
    pista TEXT,
    cerrada BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW()),
    CONSTRAINT uq_foto_pasado_semana_usuario UNIQUE (grupo_id, semana, usuario_id)
);

-- 10. TABLA: juego_foto_pasado_adivinanzas (Respuestas a Foto del Pasado)
CREATE TABLE IF NOT EXISTS public.juego_foto_pasado_adivinanzas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    foto_pasado_id UUID NOT NULL REFERENCES public.juego_foto_pasado(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    anio_adivinado INTEGER NOT NULL,
    lugar_adivinado VARCHAR(200),
    puntos_obtenidos INTEGER DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Argentina/Buenos_Aires', NOW()),
    CONSTRAINT uq_adivinanza_foto_usuario UNIQUE (foto_pasado_id, usuario_id)
);

-- Índices de alto rendimiento para consultas móviles
CREATE INDEX IF NOT EXISTS idx_destellos_grupo_fecha ON public.destellos(grupo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_destellos_usuario ON public.destellos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_puntos_grupo_usuario ON public.puntos_eventos(grupo_id, usuario_id);
CREATE INDEX IF NOT EXISTS idx_puntos_fecha ON public.puntos_eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_retos_grupo_fecha ON public.retos_diarios(grupo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_grupo_fecha ON public.evaluaciones_diarias(grupo_id, fecha);

-- Habilitar RLS (Row Level Security) si se requiere
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destellos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retos_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puntos_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones_diarias ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para Service Role (API de Next.js) y lectura pública para miembros autenticados
CREATE POLICY "Permitir todo al service_role" ON public.grupos FOR ALL USING (true);
CREATE POLICY "Permitir todo al service_role" ON public.usuarios FOR ALL USING (true);
CREATE POLICY "Permitir todo al service_role" ON public.destellos FOR ALL USING (true);
CREATE POLICY "Permitir todo al service_role" ON public.retos_diarios FOR ALL USING (true);
CREATE POLICY "Permitir todo al service_role" ON public.puntos_eventos FOR ALL USING (true);
CREATE POLICY "Permitir todo al service_role" ON public.evaluaciones_diarias FOR ALL USING (true);
