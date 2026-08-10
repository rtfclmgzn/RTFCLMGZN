-- RTFCLMGZN — billing schema (migration 002)
--
--   wrangler d1 execute rtfclmgzn --remote --file=db/002_billing.sql
--
-- Extends the existing users/sessions tables from the magic-link auth. Nothing here
-- drops or rewrites an existing column, so it is safe to run against live data.
-- Every statement is written to be re-runnable except the ALTERs, which D1 will
-- reject on a second run with "duplicate column name" — that error is expected and
-- harmless; the rest of the file still applies.

-- ── users: how this reader got Plus, and when it lapses ──────────────────────────
--  plan            already exists: 'free' | 'plus'
--  plan_source     'stripe' | 'voucher' | 'comp'   (NULL while free)
--  plan_expires_at NULL means no expiry — an active subscription or a lifetime grant.
--                  A timestamp means it lapses then, which is how voucher trials end
--                  without any scheduled job: getSessionUser() compares it on every
--                  request and simply stops returning 'plus'.
ALTER TABLE users ADD COLUMN plan_source TEXT;
ALTER TABLE users ADD COLUMN plan_expires_at TEXT;
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- ── subscriptions: one row per Stripe subscription, plus lifetime purchases ──────
-- The webhook is the only writer. `id` is Stripe's own id, so replaying an event
-- overwrites rather than duplicates.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    TEXT PRIMARY KEY,
  user_id               INTEGER NOT NULL,
  status                TEXT NOT NULL,          -- active|trialing|past_due|canceled|incomplete|lifetime
  interval              TEXT,                   -- month|year|lifetime
  price_id              TEXT,
  current_period_end    TEXT,
  cancel_at_period_end  INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_interval ON subscriptions(interval);

-- ── vouchers ────────────────────────────────────────────────────────────────────
-- kind:
--   'lifetime'    -> free Plus forever.            value unused
--   'free_days'   -> free Plus for N days.         value = days (90 / 180 / 365 …)
--   'percent_off' -> N% off at checkout.           value = percent, needs stripe_coupon_id
--   'amount_off'  -> N cents off at checkout.      value = cents,   needs stripe_coupon_id
--
-- The first two are ACCESS grants: handled entirely here, no card, no Stripe, no
-- checkout. The last two are DISCOUNTS: they only mean anything during a Stripe
-- checkout, so they carry a Stripe coupon id and are applied there.
--
-- code is stored UPPERCASE and compared uppercase; the reader may type any case.
CREATE TABLE IF NOT EXISTS vouchers (
  code             TEXT PRIMARY KEY,
  kind             TEXT NOT NULL CHECK (kind IN ('lifetime','free_days','percent_off','amount_off')),
  value            INTEGER,
  stripe_coupon_id TEXT,
  max_redemptions  INTEGER,                     -- NULL = unlimited
  redeemed_count   INTEGER NOT NULL DEFAULT 0,
  expires_at       TEXT,                        -- the CODE stops working after this
  note             TEXT,                        -- who it was for; shown only in admin listings
  batch            TEXT,                        -- lets you retire a whole run at once
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vouchers_batch ON vouchers(batch);

-- One redemption per person per code. The UNIQUE constraint is the actual enforcement —
-- checking first and inserting later would race under concurrent requests.
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

-- ── stripe_events: idempotency ──────────────────────────────────────────────────
-- Stripe retries webhooks and will happily deliver the same event twice. Insert the
-- id first; if it collides, the event has already been handled and we return 200
-- without doing the work again. Without this, a retried checkout.session.completed
-- could burn a second founding-lifetime slot for one purchase.
CREATE TABLE IF NOT EXISTS stripe_events (
  id          TEXT PRIMARY KEY,
  type        TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
