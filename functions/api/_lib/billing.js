// Shared billing helpers for functions/api/billing/*.js
//
// No Stripe SDK. The official library assumes Node and pulls in a large dependency
// tree; Pages Functions give us fetch and Web Crypto, which is all Stripe's REST API
// and webhook signing actually need. Everything here is plain fetch + form encoding.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: the browser never decides who has Plus.
// The only things that grant Plus are a verified Stripe webhook and a voucher
// redeemed server-side. `users.plan` is written here and nowhere else.

import { json } from "./auth.js";

// ── prices (cents, USD) ─────────────────────────────────────────────────────────
// Kept here rather than read from Stripe so the storefront can render before any
// network call, and so a mis-set price id can never silently change what we advertise.
// These MUST match the Stripe Price objects named in env — checkout() cross-checks.
export const PRICES = {
  monthly:  { amount: 400,  interval: "month",    label: "$4/month" },
  annual:   { amount: 3000, interval: "year",     label: "$30/year" },
  lifetime: { amount: 9000, interval: "lifetime", label: "$90 once" },
};

export const LIFETIME_CAP = 100;   // founding members, then the tier retires for good

export function stripeConfigured(env) {
  return !!(env && env.STRIPE_SECRET_KEY && env.DB);
}

// ── Stripe REST ─────────────────────────────────────────────────────────────────
// Stripe takes application/x-www-form-urlencoded with bracket notation for nesting:
//   line_items[0][price]=price_123
function formEncode(obj, prefix, out) {
  out = out || new URLSearchParams();
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object" && !Array.isArray(value)) formEncode(value, name, out);
    else if (Array.isArray(value)) value.forEach((v, i) => {
      if (typeof v === "object") formEncode(v, `${name}[${i}]`, out);
      else out.append(`${name}[${i}]`, String(v));
    });
    else out.append(name, String(value));
  }
  return out;
}

export async function stripeCall(env, path, body, method) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      authorization: "Basic " + btoa(env.STRIPE_SECRET_KEY + ":"),
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": "2024-06-20",
    },
    body: body ? formEncode(body).toString() : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) || `stripe ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── webhook signature ───────────────────────────────────────────────────────────
// Stripe signs `${timestamp}.${rawBody}` with HMAC-SHA256 and sends
//   Stripe-Signature: t=1700000000,v1=abc...,v1=def...
// Multiple v1s appear during a signing-secret rotation, so any match is valid.
//
// This is the whole security boundary for the webhook. Skip it and anyone who
// knows the URL can POST themselves a lifetime subscription.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSec) {
  if (!sigHeader || !secret) return { ok: false, reason: "missing-signature" };
  const parts = {};
  for (const piece of sigHeader.split(",")) {
    const idx = piece.indexOf("=");
    if (idx < 0) continue;
    const k = piece.slice(0, idx).trim();
    const v = piece.slice(idx + 1).trim();
    if (k === "v1") (parts.v1 = parts.v1 || []).push(v);
    else parts[k] = v;
  }
  if (!parts.t || !parts.v1 || !parts.v1.length) return { ok: false, reason: "malformed-signature" };

  // Replay window. Without it a captured-and-resent webhook stays valid forever.
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(parts.t));
  if (!Number.isFinite(age) || age > (toleranceSec || 300)) return { ok: false, reason: "timestamp-out-of-tolerance" };

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parts.t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");

  for (const candidate of parts.v1) if (timingSafeEqual(expected, candidate)) return { ok: true };
  return { ok: false, reason: "no-matching-signature" };
}

// ── entitlement ─────────────────────────────────────────────────────────────────
// The single place that answers "what does this reader actually have". Read by
// /api/auth/me and by the account page; never by anything that decides access —
// that is getSessionUser()'s job, which applies the expiry itself.
export async function entitlementFor(env, userId) {
  const user = await env.DB
    .prepare("SELECT plan, plan_source, plan_expires_at, stripe_customer_id FROM users WHERE id=?")
    .bind(userId).first();
  if (!user) return null;

  const sub = await env.DB
    .prepare(`SELECT id, status, interval, current_period_end, cancel_at_period_end
                FROM subscriptions WHERE user_id=?
               ORDER BY (status IN ('active','trialing','lifetime')) DESC, updated_at DESC LIMIT 1`)
    .bind(userId).first();

  return {
    source: user.plan === "plus" ? (user.plan_source || null) : null,
    interval: sub ? sub.interval : (user.plan_source === "voucher" ? "voucher" : null),
    expires_at: user.plan_expires_at || (sub ? sub.current_period_end : null),
    cancel_at_period_end: !!(sub && sub.cancel_at_period_end),
    status: sub ? sub.status : (user.plan === "plus" ? "active" : null),
    has_stripe: !!user.stripe_customer_id,
  };
}

export async function lifetimeSold(env) {
  const row = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM subscriptions WHERE interval='lifetime' AND status='lifetime'")
    .first();
  return (row && row.n) || 0;
}

// ── grants ──────────────────────────────────────────────────────────────────────
// The only two functions that may write users.plan.
export async function grantPlus(env, userId, source, expiresAtISO) {
  await env.DB
    .prepare("UPDATE users SET plan='plus', plan_source=?, plan_expires_at=? WHERE id=?")
    .bind(source, expiresAtISO || null, userId).run();
}

export async function revokePlus(env, userId) {
  await env.DB
    .prepare("UPDATE users SET plan='free', plan_source=NULL, plan_expires_at=NULL WHERE id=?")
    .bind(userId).run();
}

// ── voucher lookup ──────────────────────────────────────────────────────────────
export async function loadVoucher(env, rawCode) {
  const code = (rawCode || "").toString().trim().toUpperCase();
  if (!code || code.length > 64 || !/^[A-Z0-9][A-Z0-9-]*$/.test(code)) return { code, row: null, error: "invalid" };
  const row = await env.DB.prepare("SELECT * FROM vouchers WHERE code=?").bind(code).first();
  if (!row) return { code, row: null, error: "invalid" };
  if (!row.active) return { code, row, error: "expired" };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { code, row, error: "expired" };
  if (row.max_redemptions !== null && row.redeemed_count >= row.max_redemptions) {
    return { code, row, error: "exhausted" };
  }
  return { code, row, error: null };
}

export const VOUCHER_MESSAGES = {
  invalid: "We don't recognise that code. Check it and try again.",
  expired: "That code has expired.",
  used: "You've already used that code.",
  exhausted: "That code has been fully claimed.",
};

export { json };
