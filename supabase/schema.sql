-- ============================================================================
-- DESTELLOS — Esquema permanente (Supabase PostgreSQL)
-- Ejecutar UNA vez en Supabase > SQL Editor. Es idempotente.
-- Arranca LIMPIO: no inserta ninguna familia ni usuario de ejemplo.
-- El acceso se hace solo desde el servidor con la service_role key;
-- RLS queda activado sin políticas, por lo que anon/authenticated no leen nada.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists grupos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  emoji         text not null default '✨',
  codigo        text not null,
  codigo_norm   text not null unique,           -- MAYÚSCULAS sin guiones/espacios
  hora_limite   text not null default '22:00',  -- HH:MM hora Argentina
  admin_nombre  text,
  admin_email   text,
  vence_en      date not null,
  tipo_grupo    text not null default 'family', -- 'family' | 'friends' | 'sports_club' | 'custom'
  modulos_activos jsonb not null default '{"flash_grupal":true,"prode_futbol":false,"tarareo_ardilla":true,"trazo_loco":true,"cerebro_fuga":true}'::jsonb,
  activo        boolean not null default true,  -- false = pausada
  creado_en     timestamptz not null default now()
);

create table if not exists usuarios (
  id                 uuid primary key default gen_random_uuid(),
  grupo_id           uuid not null references grupos(id) on delete cascade,
  nombre             text not null,
  apodo              text,
  email              text,
  whatsapp           text,
  nacimiento         date,
  foto_path          text,
  rol                text not null default 'miembro' check (rol in ('miembro','admin')),
  password_hash      text not null,
  intentos_fallidos  int not null default 0,
  bloqueado_hasta    timestamptz,
  creado_en          timestamptz not null default now()
);
create index if not exists usuarios_grupo_idx on usuarios(grupo_id);
create unique index if not exists usuarios_email_grupo_uq on usuarios(grupo_id, lower(email)) where email is not null;

create table if not exists destellos (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references grupos(id) on delete cascade,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  fecha       date not null,
  foto_path   text not null,
  descripcion text,
  creado_en   timestamptz not null default now(),
  unique (usuario_id, fecha)                    -- una foto por día por integrante
);
create index if not exists destellos_grupo_fecha_idx on destellos(grupo_id, fecha desc);

create table if not exists reacciones (
  destello_id uuid not null references destellos(id) on delete cascade,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  emoji       text not null,
  primary key (destello_id, usuario_id)
);

create table if not exists comentarios (
  id          uuid primary key default gen_random_uuid(),
  destello_id uuid not null references destellos(id) on delete cascade,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  texto       text not null,
  creado_en   timestamptz not null default now()
);

create table if not exists veredictos (
  grupo_id     uuid not null references grupos(id) on delete cascade,
  fecha        date not null,
  destello_id  uuid references destellos(id) on delete set null,
  texto        text not null,
  diploma_path text,
  creado_en    timestamptz not null default now(),
  primary key (grupo_id, fecha)
);

create table if not exists puntos (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references grupos(id) on delete cascade,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  fecha       date not null,
  motivo      text not null,                    -- 'foto' | 'ganador' | 'trivia'
  puntos      int not null,
  creado_en   timestamptz not null default now(),
  unique (usuario_id, fecha, motivo)
);
create index if not exists puntos_grupo_idx on puntos(grupo_id);

create table if not exists trivia_intentos (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references grupos(id) on delete cascade,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  fecha       date not null,
  nivel       text not null check (nivel in ('facil','medio','experto')),
  pregunta    jsonb not null,                   -- incluye la correcta; nunca sale al cliente antes de responder
  iniciada_en timestamptz not null default now(),
  respondida  boolean not null default false,
  elegida     int,
  acerto      boolean,
  puntos      int not null default 0,
  evaluacion  text,
  unique (usuario_id, fecha)                    -- un único intento diario
);

create table if not exists pizarra (
  id         uuid primary key default gen_random_uuid(),
  grupo_id   uuid references grupos(id) on delete cascade,  -- null = mensaje global
  texto      text not null,
  color      text not null default 'ambar' check (color in ('ambar','verde','rojo','celeste','magenta')),
  origen     text not null default 'arlequin' check (origen in ('arlequin','superadmin')),
  destacado  boolean not null default false,
  vence_en   timestamptz,
  creado_en  timestamptz not null default now()
);
create index if not exists pizarra_grupo_idx on pizarra(grupo_id, creado_en desc);

create table if not exists publicidades (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  texto      text,
  imagen_path text,
  enlace     text,
  ubicacion  text not null default 'home' check (ubicacion in ('home','login','trivia')),
  activa     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table if not exists notificaciones (
  id        uuid primary key default gen_random_uuid(),
  grupo_id  uuid not null references grupos(id) on delete cascade,
  texto     text not null,
  leida     boolean not null default false,
  creado_en timestamptz not null default now()
);
create index if not exists notif_grupo_idx on notificaciones(grupo_id, leida);

create table if not exists reset_codigos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  codigo_hash text not null,
  vence_en    timestamptz not null,
  usado       boolean not null default false,
  intentos    int not null default 0,
  creado_en   timestamptz not null default now()
);

-- RLS activado sin políticas: solo la service_role (servidor) puede operar.
do $$
declare t text;
begin
  foreach t in array array['grupos','usuarios','destellos','reacciones','comentarios','veredictos',
    'puntos','trivia_intentos','pizarra','publicidades','notificaciones','reset_codigos']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Bucket PRIVADO para fotos, avatares y diplomas (se entregan con URLs firmadas).
insert into storage.buckets (id, name, public)
values ('destellos', 'destellos', false)
on conflict (id) do nothing;
