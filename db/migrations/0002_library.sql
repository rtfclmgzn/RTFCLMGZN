-- Migration: 0002_library
-- Adds cross-device reader library: bookmarks, read-later, and reactions.
-- See db/schema.sql for the annotated source of truth.

CREATE TABLE bookmarks (
  user_id     TEXT NOT NULL REFERENCES users(id),
  article_id  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, article_id)
);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);

CREATE TABLE read_later (
  user_id     TEXT NOT NULL REFERENCES users(id),
  article_id  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, article_id)
);
CREATE INDEX idx_read_later_user ON read_later(user_id);

CREATE TABLE reactions (
  user_id     TEXT NOT NULL REFERENCES users(id),
  article_id  TEXT NOT NULL,
  reaction    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, article_id, reaction)
);
CREATE INDEX idx_reactions_user ON reactions(user_id);
