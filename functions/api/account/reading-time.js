// Cloudflare Pages Function — cross-device reading-time meter.
// Route: GET/POST /api/account/reading-time. Session-cookie authenticated;
// 401 (real per-user data, not a routine boot check, same posture as library.js).
//
// Each device sends small incremental DELTAS (never an absolute total), so two
// devices reading at once simply add rather than one clobbering the other's
// count -- the model bookmarks/reactions use (add-only) doesn't fit here since
// this is a running total, not a set of discrete items, so the unit of sync is
// "seconds since I last told you" instead of "here's my whole list".

import { getSessionUser, json, notConfigured } from "../_lib/auth.js";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DELTA_SECONDS = 3600; // one flush interval is ~30s of real ticking; this is a generous abuse ceiling, not a normal value

async function aggregate(env, userId) {
  const rows = await env.DB
    .prepare("SELECT day, seconds FROM reading_time_days WHERE user_id=? ORDER BY day")
    .bind(userId).all();
  const days = rows.results || [];
  const total = days.reduce((n, r) => n + (r.seconds || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayRow = days.find((r) => r.day === today);
  return {
    total,
    todaySec: todayRow ? todayRow.seconds : 0,
    dayCount: days.length,
    firstDay: days.length ? days[0].day : "",
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "not_signed_in" }, 401);
  return json(await aggregate(env, user.id));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return notConfigured();
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "not_signed_in" }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
  const day = typeof body.day === "string" ? body.day : "";
  const delta = Math.floor(Number(body.deltaSeconds));
  if (!DAY_RE.test(day) || !Number.isFinite(delta) || delta <= 0 || delta > MAX_DELTA_SECONDS) {
    return json({ error: "bad_request" }, 400);
  }

  await env.DB
    .prepare(
      "INSERT INTO reading_time_days (user_id, day, seconds) VALUES (?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET seconds = seconds + excluded.seconds"
    )
    .bind(user.id, day, delta).run();

  return json(await aggregate(env, user.id));
}
