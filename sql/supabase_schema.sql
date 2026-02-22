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

-- Profiles (used by server as 'profiles')
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  username text UNIQUE NOT NULL,
  gold int DEFAULT 0,
  energy int DEFAULT 100,
  max_energy int DEFAULT 100,
  income_per_sec numeric DEFAULT 0,
  defense_layer int DEFAULT 0,
  last_energy_update bigint DEFAULT 0,
  last_income_claim bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Player ghosts table (server expects 'player_ghosts')
CREATE TABLE IF NOT EXISTS player_ghosts (
  id text PRIMARY KEY,
  owner_id text REFERENCES profiles(id) ON DELETE CASCADE,
  ghost_type text,
  level int DEFAULT 1,
  exp int DEFAULT 0,
  str int DEFAULT 0,
  agi int DEFAULT 0,
  int int DEFAULT 0,
  vit int DEFAULT 0,
  head_item_id text,
  armor_item_id text,
  feet_item_id text,
  skill_1_id text,
  skill_2_id text,
  created_at timestamptz DEFAULT now()
);

-- Inventory table (used by server)
CREATE TABLE IF NOT EXISTS inventory (
  id text PRIMARY KEY,
  owner_id text REFERENCES profiles(id) ON DELETE CASCADE,
  item_name text,
  item_type text,
  slot text,
  stat_bonus text,
  income_bonus int DEFAULT 0,
  is_equipped int DEFAULT 0,
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
  -- Generic event fields (for event-based logs)
  battle_id text,
  turn int,
  timestamp timestamptz DEFAULT now(),
  actor_id text,
  action text,
  target_id text,
  detail jsonb,
  value int,
  hp_before int,
  hp_after int,
  -- Server-friendly summary fields (kept for compatibility with existing code)
  attacker_id text,
  defender_id text,
  winner_id text,
  gold_stolen int,
  battle_details text
);

-- Ensure columns exist (idempotent) in case table was created earlier without fields
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS battle_id text;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS turn int;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS timestamp timestamptz DEFAULT now();
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS actor_id text;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS action text;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS target_id text;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS detail jsonb;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS value int;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS hp_before int;
ALTER TABLE battle_logs ADD COLUMN IF NOT EXISTS hp_after int;

-- Simple indexes (safe if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'battle_logs') THEN
    IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'battle_logs'::regclass AND attname = 'battle_id') THEN
      CREATE INDEX IF NOT EXISTS idx_battle_logs_battleid ON battle_logs(battle_id);
    END IF;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ghosts') THEN
    IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'ghosts'::regclass AND attname = 'owner') THEN
      CREATE INDEX IF NOT EXISTS idx_ghosts_owner ON ghosts(owner);
    END IF;
  END IF;
END$$;
