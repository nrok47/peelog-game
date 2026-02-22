-- Supabase schema for Ghost Generals (minimal)

-- Users / players (basic)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Species templates (optional static)
CREATE TABLE IF NOT EXISTS species (
  id text PRIMARY KEY,
  name text NOT NULL,
  base_stats jsonb NOT NULL,
  starting_skills jsonb DEFAULT '[]'::jsonb
);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  power int DEFAULT 0,
  chance numeric DEFAULT 0,
  cooldown int DEFAULT 0,
  target text DEFAULT 'enemy',
  description text
);

-- Ghosts owned by users
CREATE TABLE IF NOT EXISTS ghosts (
  id text PRIMARY KEY,
  owner uuid REFERENCES users(id) ON DELETE CASCADE,
  species_id text REFERENCES species(id),
  name text NOT NULL,
  level int DEFAULT 1,
  xp int DEFAULT 0,
  stats jsonb NOT NULL,
  current_hp int NOT NULL,
  skill_slots jsonb DEFAULT '[]'::jsonb,
  passive_effects jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Eggs
CREATE TABLE IF NOT EXISTS eggs (
  id text PRIMARY KEY,
  owner uuid REFERENCES users(id) ON DELETE CASCADE,
  species_pool jsonb NOT NULL,
  hatch_time timestamptz NOT NULL,
  progress numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Battle logs: store per-event rows for step-by-step replay
CREATE TABLE IF NOT EXISTS battle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id text NOT NULL,
  turn int NOT NULL,
  timestamp timestamptz DEFAULT now(),
  actor_id text,
  action text,
  target_id text,
  detail jsonb,
  value int,
  hp_before int,
  hp_after int
);

-- Simple indexes
CREATE INDEX IF NOT EXISTS idx_battle_logs_battleid ON battle_logs(battle_id);
CREATE INDEX IF NOT EXISTS idx_ghosts_owner ON ghosts(owner);
