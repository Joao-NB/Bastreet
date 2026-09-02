-- BASTREET — modelo relacional de referência (PostgreSQL 16+)
-- Este arquivo documenta a evolução do banco e não é executado pela aplicação atual.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('player', 'admin');
CREATE TYPE skill_level AS ENUM ('iniciante', 'intermediario', 'avancado');
CREATE TYPE gender_identity AS ENUM ('homem', 'mulher', 'nao_binario', 'nao_informado');
CREATE TYPE event_kind AS ENUM ('treino_grupo', 'partida_normal', 'partida_rapida', 'partida_personalizada', 'campeonato');
CREATE TYPE event_status AS ENUM ('agendado', 'confirmado', 'concluido', 'cancelado');
CREATE TYPE queue_mode AS ENUM ('normal', 'rapida');
CREATE TYPE participant_status AS ENUM ('inscrito', 'confirmado', 'presente', 'ausente', 'cancelado');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  email varchar(254) NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'player',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE player_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  birth_date date,
  height_cm smallint CHECK (height_cm BETWEEN 120 AND 250),
  position varchar(30),
  gender gender_identity NOT NULL DEFAULT 'nao_informado',
  declared_level skill_level NOT NULL DEFAULT 'iniciante',
  skill_rating smallint NOT NULL DEFAULT 1000 CHECK (skill_rating BETWEEN 0 AND 4000),
  experience_points integer NOT NULL DEFAULT 0 CHECK (experience_points >= 0),
  avatar_url text,
  city varchar(100),
  state char(2),
  latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE player_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  starts_at time,
  ends_at time,
  CONSTRAINT availability_time_order CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CONSTRAINT availability_unique UNIQUE (user_id, weekday, starts_at, ends_at)
);

CREATE TABLE courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source varchar(30),
  external_id varchar(100),
  name varchar(160) NOT NULL,
  address text,
  neighborhood varchar(100),
  city varchar(100) NOT NULL,
  state char(2) NOT NULL,
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  surface varchar(50),
  has_lighting boolean,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT court_external_unique UNIQUE (external_source, external_id)
);

CREATE TABLE training_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  title varchar(120) NOT NULL,
  description text,
  difficulty skill_level NOT NULL,
  base_xp smallint NOT NULL CHECK (base_xp > 0),
  estimated_minutes smallint CHECK (estimated_minutes BETWEEN 1 AND 300),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_id uuid REFERENCES training_catalog(id) ON DELETE SET NULL,
  court_id uuid REFERENCES courts(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  is_collective boolean NOT NULL DEFAULT false,
  xp_awarded smallint NOT NULL CHECK (xp_awarded >= 0),
  ranking_points_awarded smallint NOT NULL CHECK (ranking_points_awarded >= 0),
  evidence_url text,
  CONSTRAINT collective_requires_court CHECK (NOT is_collective OR court_id IS NOT NULL)
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES users(id),
  court_id uuid REFERENCES courts(id),
  kind event_kind NOT NULL,
  title varchar(160) NOT NULL,
  starts_at timestamptz NOT NULL,
  capacity smallint NOT NULL DEFAULT 10 CHECK (capacity BETWEEN 2 AND 100),
  status event_status NOT NULL DEFAULT 'agendado',
  min_skill_rating smallint CHECK (min_skill_rating BETWEEN 0 AND 4000),
  max_skill_rating smallint CHECK (max_skill_rating BETWEEN 0 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_rating_order CHECK (max_skill_rating IS NULL OR min_skill_rating IS NULL OR max_skill_rating >= min_skill_rating)
);

CREATE TABLE event_participants (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status participant_status NOT NULL DEFAULT 'inscrito',
  team_code char(1) CHECK (team_code IN ('A', 'B')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE court_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_out_at timestamptz,
  CONSTRAINT checkout_after_checkin CHECK (checked_out_at IS NULL OR checked_out_at >= checked_in_at)
);

CREATE TABLE matchmaking_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode queue_mode NOT NULL,
  preferred_court_id uuid REFERENCES courts(id) ON DELETE SET NULL,
  available_from timestamptz NOT NULL,
  available_until timestamptz NOT NULL,
  radius_km smallint NOT NULL DEFAULT 15 CHECK (radius_km BETWEEN 1 AND 100),
  queued_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT queue_time_order CHECK (available_until > available_from),
  CONSTRAINT one_active_queue_per_user UNIQUE (user_id)
);

CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid UNIQUE REFERENCES events(id) ON DELETE SET NULL,
  winner_team char(1) CHECK (winner_team IN ('A', 'B')),
  team_a_score smallint CHECK (team_a_score >= 0),
  team_b_score smallint CHECK (team_b_score >= 0),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE match_players (
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_code char(1) NOT NULL CHECK (team_code IN ('A', 'B')),
  skill_rating_at_match smallint NOT NULL CHECK (skill_rating_at_match BETWEEN 0 AND 4000),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE academic_semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(40) NOT NULL UNIQUE,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  is_finalized boolean NOT NULL DEFAULT false,
  CONSTRAINT semester_date_order CHECK (ends_on >= starts_on)
);

CREATE TABLE ranking_entries (
  semester_id uuid NOT NULL REFERENCES academic_semesters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_points integer NOT NULL DEFAULT 0 CHECK (training_points >= 0),
  championship_points integer NOT NULL DEFAULT 0 CHECK (championship_points >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (semester_id, user_id)
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(120),
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  sender_label varchar(120),
  is_bot boolean NOT NULL DEFAULT false,
  body varchar(2000) NOT NULL CHECK (length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_sender_present CHECK (sender_user_id IS NOT NULL OR is_bot)
);

CREATE INDEX idx_profiles_location ON player_profiles (city, state);
CREATE INDEX idx_courts_location ON courts (city, state, latitude, longitude) WHERE is_active;
CREATE INDEX idx_training_user_date ON training_sessions (user_id, performed_at DESC);
CREATE INDEX idx_events_court_start ON events (court_id, starts_at) WHERE status IN ('agendado', 'confirmado');
CREATE INDEX idx_checkins_court_date ON court_checkins (court_id, checked_in_at DESC);
CREATE INDEX idx_queue_window ON matchmaking_queue (mode, available_from, available_until);
CREATE INDEX idx_ranking_semester_points ON ranking_entries (semester_id, training_points DESC, championship_points DESC);
CREATE INDEX idx_messages_conversation_date ON messages (conversation_id, created_at DESC);

COMMENT ON TABLE ranking_entries IS 'Pontuação por semestre; não participa do balanceamento das equipes.';
COMMENT ON COLUMN training_sessions.ranking_points_awarded IS 'Treinos coletivos devem receber peso superior ao de treinos individuais, conforme regra de negócio.';
