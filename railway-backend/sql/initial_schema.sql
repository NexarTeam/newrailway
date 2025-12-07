-- Users table (replaces users.json)
CREATE TABLE IF NOT EXISTS users (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                       TEXT UNIQUE NOT NULL,
  username                    TEXT UNIQUE NOT NULL,
  password_hash               TEXT NOT NULL,
  avatar_url                  TEXT DEFAULT '',
  bio                         TEXT DEFAULT '',
  verified                    BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token          TEXT,
  password_reset_token        TEXT,
  password_reset_token_expiry BIGINT,
  wallet_balance              DECIMAL(10,2) DEFAULT 0,
  owned_games                 TEXT[] DEFAULT '{}',
  role                        TEXT DEFAULT 'user',
  is_developer                BOOLEAN DEFAULT FALSE,
  developer_profile           JSONB,
  stripe_customer_id          TEXT,
  nexar_plus_subscription_id  TEXT,
  nexar_plus_status           TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Friends list (replaces friends.json)
CREATE TABLE IF NOT EXISTS friends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages / chat (replaces messages.json)
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Achievements (replaces achievements.json)
CREATE TABLE IF NOT EXISTS achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

-- Cloud saves (replaces cloud_saves.json)
CREATE TABLE IF NOT EXISTS cloud_saves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id     TEXT NOT NULL,
  save_name   TEXT NOT NULL,
  save_data   JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, game_id, save_name)
);

-- Wallet transactions (replaces wallet_transactions.json)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount       DECIMAL(10,2) NOT NULL,
  type         TEXT NOT NULL,
  description  TEXT,
  reference_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Developer games (replaces developerGames.json)
CREATE TABLE IF NOT EXISTS developer_games (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      TEXT UNIQUE NOT NULL,
  developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  genre        TEXT,
  tags         TEXT[] DEFAULT '{}',
  price        DECIMAL(10,2) DEFAULT 0,
  cover_image  TEXT,
  screenshots  TEXT[] DEFAULT '{}',
  version      TEXT DEFAULT '1.0.0',
  status       TEXT DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game trials (replaces game_trials.json)
CREATE TABLE IF NOT EXISTS game_trials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id       TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, game_id)
);
