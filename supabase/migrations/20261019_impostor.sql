-- Migración para "El Impostor Asíncrono"

CREATE TABLE IF NOT EXISTS impostor_configuracion (
  grupo_id UUID PRIMARY KEY REFERENCES grupos(id) ON DELETE CASCADE,
  activo BOOLEAN NOT NULL DEFAULT FALSE,
  modo_seguro BOOLEAN NOT NULL DEFAULT TRUE,
  cantidad_impostores INTEGER NOT NULL DEFAULT 1,
  dias_no_repeticion INTEGER NOT NULL DEFAULT 60,
  hora_inicio TIME NOT NULL DEFAULT '00:00',
  hora_revelacion TIME NOT NULL DEFAULT '19:00',
  hora_cierre TIME NOT NULL DEFAULT '22:00',
  puntos_civil_acierta INTEGER NOT NULL DEFAULT 5,
  puntos_impostor_engana INTEGER NOT NULL DEFAULT 10,
  puntos_tiro_gracia INTEGER NOT NULL DEFAULT 7,
  penalizacion_sin_pista INTEGER NOT NULL DEFAULT -2,
  penalizacion_sin_voto INTEGER NOT NULL DEFAULT -2,
  compensacion_civil_cancelada INTEGER NOT NULL DEFAULT 2,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS impostor_partidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('fase_1_pistas', 'fase_2_votacion', 'fase_3_resolucion', 'cancelada')) DEFAULT 'fase_1_pistas',
  palabra_secreta TEXT NOT NULL,
  categoria TEXT NOT NULL,
  modo_seguro_usado BOOLEAN NOT NULL DEFAULT TRUE,
  ganador TEXT CHECK (ganador IN ('civiles', 'impostor', 'ninguno')),
  tiro_gracia_intento TEXT,
  tiro_gracia_acertado BOOLEAN,
  motivo_cancelacion TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cerrado_en TIMESTAMPTZ,
  UNIQUE(grupo_id, fecha)
);

CREATE TABLE IF NOT EXISTS impostor_jugadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID NOT NULL REFERENCES impostor_partidas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('civil', 'impostor')),
  pista_texto TEXT,
  pista_foto_url TEXT,
  pista_enviada_at TIMESTAMPTZ,
  voto_sospechoso_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  voto_enviado_at TIMESTAMPTZ,
  puntos_obtenidos INTEGER NOT NULL DEFAULT 0,
  motivo_puntos TEXT,
  UNIQUE(partida_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS impostor_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID NOT NULL REFERENCES impostor_partidas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS impostor_historial_palabras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  palabra TEXT NOT NULL,
  categoria TEXT,
  fecha DATE NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_impostor_partidas_grupo_fecha ON impostor_partidas(grupo_id, fecha);
CREATE INDEX IF NOT EXISTS idx_impostor_jugadores_partida ON impostor_jugadores(partida_id);
CREATE INDEX IF NOT EXISTS idx_impostor_jugadores_usuario ON impostor_jugadores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_impostor_comentarios_partida ON impostor_comentarios(partida_id);
