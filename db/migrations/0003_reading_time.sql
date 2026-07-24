-- Migration: 0003_reading_time
-- Cross-device reading-time meter: per-day second totals, summed and merged
-- from every signed-in device instead of each device keeping its own timer.
-- See db/schema.sql for the annotated source of truth.

CREATE TABLE reading_time_days (
  user_id     TEXT NOT NULL REFERENCES users(id),
  day         TEXT NOT NULL,   -- 'YYYY-MM-DD', UTC, matches the client's tmToday()
  seconds     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX idx_reading_time_user ON reading_time_days(user_id);
