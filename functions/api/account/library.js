// Cloudflare Pages Function — cross-device reader library (bookmarks, read-later,
// reactions). Route: GET/POST /api/account/library. Session-cookie authenticated;
// 401 (not the /api/auth/me "always 200" pattern) since this endpoint reads and
// writes real per-user data, not a routine boot check.
//
// Mirrors the existing localStorage `rtfc-lib` shape (bookmarks[], readLater[],
// reactions{article_id:[key,...]}) exactly, so the frontend can adopt a server
// response as its new local truth with no remapping.

import { getSessionUser, json, notConfigured } from "../_lib/auth.js";

async function loadLibrary(env, userId) {
  const [bookmarks, readLater, reacts] = await Promise.all([
    env.DB.prepare("SELECT article_id FROM bookmarks WHERE user_id=? ORDER BY created_at").bind(userId).all(),
    env.DB.prepare("SELECT article_id FROM read_later WHERE user_id=? ORDER BY created_at").bind(userId).all(),
    env.DB.prepare("SELECT article_id, reaction FROM reactions WHERE user_id=?").bind(userId).all(),
  ]);
  const reactions = {};
  for (const row of reacts.results || []) {
    (reactions[row.article_id] = reactions[row.article_id] || []).push(row.reaction);
  }
  return {
    bookmarks: (bookmarks.results || []).map((r) => r.article_id),
    readLater: (readLater.results || []).map((r) => r.article_id),
    reactions,
  };
}

// Idempotent add-only union: never removes an item another device already synced,
// only adds ones this device had locally that the server didn't know about yet.
async function mergeLibrary(env, userId, incoming) {
  const statements = [];
  for (const articleId of Array.isArray(incoming.bookmarks) ? incoming.bookmarks : []) {
    if (typeof articleId === "string" && articleId) {
      statements.push(env.DB.prepare("INSERT OR IGNORE INTO bookmarks (user_id, article_id) VALUES (?,?)").bind(userId, articleId));
    }
  }
  for (const articleId of Array.isArray(incoming.readLater) ? incoming.readLater : []) {
    if (typeof articleId === "string" && articleId) {
      statements.push(env.DB.prepare("INSERT OR IGNORE INTO read_later (user_id, article_id) VALUES (?,?)").bind(userId, articleId));
    }
  }
  const reactionsIn = incoming.reactions && typeof incoming.reactions === "object" ? incoming.reactions : {};
  for (const articleId of Object.keys(reactionsIn)) {
    const keys = Array.isArray(reactionsIn[articleId]) ? reactionsIn[articleId] : [];
    for (const reaction of keys) {
      if (typeof reaction === "string" && reaction) {
        statements.push(
          env.DB.prepare("INSERT OR IGNORE INTO reactions (user_id, article_id, reaction) VALUES (?,?,?)").bind(userId, articleId, reaction)
        );
      }
    }
  }
  if (statements.length) await env.DB.batch(statements);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "not_signed_in" }, 401);
  return json(await loadLibrary(env, user.id));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "not_signed_in" }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
  const action = String(body.action || "");
  const articleId = typeof body.article_id === "string" ? body.article_id : "";

  if (action === "toggle_bookmark" || action === "toggle_read_later") {
    if (!articleId) return json({ error: "bad_request" }, 400);
    const table = action === "toggle_bookmark" ? "bookmarks" : "read_later";
    const del = await env.DB.prepare(`DELETE FROM ${table} WHERE user_id=? AND article_id=?`).bind(user.id, articleId).run();
    let active = true;
    if (!del.meta || del.meta.changes === 0) {
      await env.DB.prepare(`INSERT OR IGNORE INTO ${table} (user_id, article_id) VALUES (?,?)`).bind(user.id, articleId).run();
    } else {
      active = false;
    }
    return json({ ok: true, active });
  }

  if (action === "toggle_reaction") {
    const reaction = typeof body.reaction === "string" ? body.reaction : "";
    if (!articleId || !reaction) return json({ error: "bad_request" }, 400);
    const del = await env.DB
      .prepare("DELETE FROM reactions WHERE user_id=? AND article_id=? AND reaction=?")
      .bind(user.id, articleId, reaction).run();
    let active = true;
    if (!del.meta || del.meta.changes === 0) {
      await env.DB
        .prepare("INSERT OR IGNORE INTO reactions (user_id, article_id, reaction) VALUES (?,?,?)")
        .bind(user.id, articleId, reaction).run();
    } else {
      active = false;
    }
    return json({ ok: true, active });
  }

  if (action === "merge") {
    await mergeLibrary(env, user.id, body);
    return json(await loadLibrary(env, user.id));
  }

  return json({ error: "unknown_action" }, 400);
}
