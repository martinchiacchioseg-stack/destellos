-- ==============================================================================
-- DESTELLOS — "un clic familiar" by Rolφ
-- Migración PostgreSQL / Supabase con Row Level Security (RLS) completo
-- Versión: 20261016_init_destellos_rolphi.sql
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla GROUPS
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    emoji_or_logo TEXT DEFAULT '✨',
    cutoff_time TIME NOT NULL DEFAULT '22:00:00',
    invitation_code TEXT UNIQUE,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'pausado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla PROFILES (Extensión de auth.users o usuarios independientes)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'miembro' CHECK (role IN ('superadmin', 'admin', 'miembro')),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    blocked_until TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    streak INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla DESTELLOS (Fotos del día)
CREATE TABLE IF NOT EXISTS public.destellos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    diploma_url TEXT,
    caption TEXT,
    phase TEXT NOT NULL DEFAULT 'subida' CHECK (phase IN ('subida', 'adivinanza', 'veredicto', 'cerrado')),
    is_winner BOOLEAN NOT NULL DEFAULT FALSE,
    diploma_title TEXT,
    moderated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_destello_usuario_fecha UNIQUE (user_id, date)
);

-- 5. Tabla GUESSES (Adivinanzas de quién sacó cada foto)
CREATE TABLE IF NOT EXISTS public.guesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    guesser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    destello_id UUID NOT NULL REFERENCES public.destellos(id) ON DELETE CASCADE,
    guessed_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_adivinanza_foto_adivinador UNIQUE (destello_id, guesser_id)
);

-- 6. Tabla DAILY_RESULTS (Veredicto diario idempotente)
CREATE TABLE IF NOT EXISTS public.daily_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    winner_destello_id UUID REFERENCES public.destellos(id) ON DELETE SET NULL,
    winner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    diploma_title TEXT,
    total_participants INTEGER NOT NULL DEFAULT 0,
    ai_chosen BOOLEAN NOT NULL DEFAULT TRUE,
    closed BOOLEAN NOT NULL DEFAULT TRUE,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_resultado_grupo_fecha UNIQUE (group_id, date)
);

-- 7. Tabla POINTS_LEDGER (Libro de puntos auditable)
CREATE TABLE IF NOT EXISTS public.points_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    event_type TEXT NOT NULL,
    points INTEGER NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Tabla FEED_POSTS (Publicaciones del muro con foto y diploma)
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    destello_id UUID NOT NULL REFERENCES public.destellos(id) ON DELETE CASCADE,
    winner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    winner_name TEXT NOT NULL,
    date DATE NOT NULL,
    diploma_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tabla REACTIONS (Reacciones con emojis en el feed)
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reaccion_post_usuario_emoji UNIQUE (feed_post_id, user_id, emoji)
);

-- 10. Tabla TRIVIA_QUESTIONS (Preguntas generadas por Gemini o manuales)
CREATE TABLE IF NOT EXISTS public.trivia_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('facil', 'medio', 'dificil')),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation TEXT,
    fun_fact TEXT,
    points_win INTEGER NOT NULL DEFAULT 10,
    points_penalty INTEGER NOT NULL DEFAULT 0,
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Tabla TRIVIA_ANSWERS (Intentos de respuesta de trivia)
CREATE TABLE IF NOT EXISTS public.trivia_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.trivia_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    selected_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_earned INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_trivia_intento_usuario_fecha UNIQUE (user_id, group_id, date)
);

-- 12. Tabla AI_LOGS (Auditoría de ejecuciones de Gemini)
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    action_type TEXT NOT NULL,
    prompt_summary TEXT,
    ai_response TEXT,
    winner_destello_id UUID,
    fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_group ON public.profiles(group_id);
CREATE INDEX IF NOT EXISTS idx_destellos_group_date ON public.destellos(group_id, date);
CREATE INDEX IF NOT EXISTS idx_guesses_destello ON public.guesses(destello_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON public.points_ledger(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feed_posts_group ON public.feed_posts(group_id, created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- ==============================================================================
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destellos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- Funciones auxiliares para RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_group_id()
RETURNS UUID AS $$
    SELECT group_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas GROUPS: Superadmin todo; Miembros solo leen su propio grupo
CREATE POLICY "Superadmin full access on groups" ON public.groups
    FOR ALL USING (public.current_user_role() = 'superadmin');

CREATE POLICY "Members can view their own group" ON public.groups
    FOR SELECT USING (id = public.current_user_group_id());

-- Políticas PROFILES: Superadmin todo; Miembros leen perfiles de su propio grupo
CREATE POLICY "Superadmin full access on profiles" ON public.profiles
    FOR ALL USING (public.current_user_role() = 'superadmin');

CREATE POLICY "Users can view members of their group" ON public.profiles
    FOR SELECT USING (group_id = public.current_user_group_id());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Políticas DESTELLOS: Miembros solo de su grupo
CREATE POLICY "Superadmin full access on destellos" ON public.destellos
    FOR ALL USING (public.current_user_role() = 'superadmin');

CREATE POLICY "Members view group destellos" ON public.destellos
    FOR SELECT USING (group_id = public.current_user_group_id());

CREATE POLICY "Members insert their own destello" ON public.destellos
    FOR INSERT WITH CHECK (
        group_id = public.current_user_group_id() AND
        user_id = auth.uid()
    );

CREATE POLICY "Members update their own destello" ON public.destellos
    FOR UPDATE USING (
        group_id = public.current_user_group_id() AND
        user_id = auth.uid()
    );

-- Políticas FEED_POSTS
CREATE POLICY "Members view their group feed" ON public.feed_posts
    FOR SELECT USING (group_id = public.current_user_group_id() OR public.current_user_role() = 'superadmin');
