-- Migration: 0001_init
-- Creates the accounts schema (users, login_tokens, sessions). See db/schema.sql
-- for the annotated source of truth -- this file is what `wrangler d1 migrations
-- apply` runs against the real D1 database. Keep the two in sync.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  plan          TEXT NOT NULL DEFAULT 'free',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  stripe_customer_id         TEXT UNIQUE,
  stripe_subscription_id     TEXT UNIQUE,
  stripe_subscription_status TEXT,
  plan_current_period_end    TEXT
);

CREATE TABLE login_tokens (
  token_hash      TEXT PRIMARY KEY,
  email           TEXT NOT NULL COLLATE NOCASE,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT NOT NULL,
  used_at         TEXT,
  request_ip_hash TEXT
);
CREATE INDEX idx_login_tokens_email_created ON login_tokens(email, created_at);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL,
  revoked_at    TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
