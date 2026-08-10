-- RTFCLMGZN - billing schema, tables only (migration 002b)
--
--   wrangler d1 execute rtfclmgzn --remote --file=db/002b_billing_tables.sql
--
-- WHY THIS FILE EXISTS
-- 002_billing.sql opens with three ALTER TABLE lines. Its header claimed a repeat
-- run would fail on "duplicate column name" but that the rest of the file would
-- still apply. That was wrong. D1 aborts the whole file on the first error and
-- rolls back, so on the second run NOTHING after the ALTERs was ever created --
-- no vouchers table, which is why RTFC-FOUNDER did not work.
--
-- Everything here is CREATE ... IF NOT EXISTS, so this file is safe to run any
-- number of times, on a fresh database or a half-migrated one. Run 002_billing.sql
-- once on a brand-new database for the ALTERs; run this one whenever.

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    TEXT PRIMARY KEY,
  user_id               INTEGER NOT NULL,
  status                TEXT NOT NULL,
  interval              TEXT,
  price_id              TEXT,
  current_period_end    TEXT,
  cancel_at_period_end  INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_interval ON subscriptions(interval);

CREATE TABLE IF NOT EXISTS vouchers (
  code             TEXT PRIMARY KEY,
  kind             TEXT NOT NULL CHECK (kind IN ('lifetime','free_days','percent_off','amount_off')),
  value            INTEGER,
  stripe_coupon_id TEXT,
  max_redemptions  INTEGER,
  redeemed_count   INTEGER NOT NULL DEFAULT 0,
  expires_at       TEXT,
  note             TEXT,
  batch            TEXT,
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vouchers_batch ON vouchers(batch);

CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL,
  user_id     INTEGER NOT NULL,
  redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (code, user_id),
  FOREIGN KEY (code) REFERENCES vouchers(code),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON voucher_redemptions(user_id);

CREATE TABLE IF NOT EXISTS stripe_events (
  id          TEXT PRIMARY KEY,
  type        TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
