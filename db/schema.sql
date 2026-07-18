-- RTFCLMGZN accounts schema (Cloudflare D1 / SQLite).
-- Source of truth for the tables in db/migrations/0001_init.sql -- keep both in sync.
--
-- Auth model: email magic-link only, no passwords. A raw secret (login token or
-- session id) exists in exactly two places -- the emailed link, or the browser's
-- HttpOnly cookie -- and is never written here in raw form, only its SHA-256 hash.
-- That way a database read never yields a usable credential.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,              -- uuid v4 (crypto.randomUUID())
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  plan          TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'plus' -- mirrors the site's existing l.account.plan values
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  -- Stripe-ready, additive, nullable: untouched by the account/auth phase, written only
  -- once billing is wired (webhook handler updates these; no migration needed then).
  stripe_customer_id         TEXT UNIQUE,
  stripe_subscription_id     TEXT UNIQUE,
  stripe_subscription_status TEXT,             -- mirrors Stripe's own status enum verbatim
  plan_current_period_end    TEXT
);

CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash      TEXT PRIMARY KEY,            -- sha-256 hex of the raw token
  email           TEXT NOT NULL COLLATE NOCASE, -- stored even before a users row exists
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT NOT NULL,               -- created_at + 15 minutes
  used_at         TEXT,                        -- NULL until consumed; set once, enforces single-use
  request_ip_hash TEXT                         -- sha-256 of the requesting IP, for abuse forensics only
);
CREATE INDEX IF NOT EXISTS idx_login_tokens_email_created ON login_tokens(email, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,              -- sha-256 hex of the raw session secret
  user_id       TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL,                 -- created_at + 30 days
  revoked_at    TEXT                           -- set on logout; NULL = active
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
