# Turning on payments

Everything in the code is written and deployed-ready. What's left is account setup that
only you can do — I can write code that reads a secret, but I'm not going to handle your
Stripe keys, and you shouldn't paste them to anyone either.

Budget about 30 minutes.

## What we settled on

| | Price | Notes |
|---|---|---|
| **Annual** | **$30/year** | The headline. $2.50/month equivalent. |
| Monthly | $4/month | Exists, but $48/year — annual is deliberately the better deal. |
| Founding Lifetime | $90 once | One-time. Capped at the **first 100**, then it disappears from the site by itself. |

Why annual leads: a monthly product billed monthly is a churn trap — someone pays, reads
the issue in an hour, has nothing for 29 days, and cancels. Annual matches the cadence.

Why not $8: every issue prints what it cost to make (Issue 002 says $2.28). A reader who
sees that and is asked for $96/year does the arithmetic. Your own Ledger page is an
argument for a modest price, and $30/year sits just above Wired's ~$30 while staying
well under The New Yorker's ~$120.

## 1. Stripe

1. Create the account at dashboard.stripe.com and finish activation (bank details, business
   info). Test mode works for everything below; nothing takes real money until you activate.
2. **Product catalogue → Add product**: "RTFCLMGZN Plus". Add three prices:
   - $4.00 USD, recurring monthly
   - $30.00 USD, recurring yearly
   - $90.00 USD, **one-time** ← this one is not a subscription
3. Copy the three price ids (they look like `price_1AbC...`).
4. **Developers → API keys** → copy the **secret** key (`sk_live_...` or `sk_test_...`).
5. **Developers → Webhooks → Add endpoint**:
   - URL: `https://rtfclmgzn.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `invoice.payment_failed`
   - Copy the **signing secret** (`whsec_...`).
6. **Settings → Billing → Customer portal**: turn it on, and allow cancellation and payment
   method updates. That page is what the "Manage billing" button opens.

## 2. Cloudflare

Pages project → Settings → Environment variables. Add these as **encrypted** secrets, for
both Production and Preview:

```
STRIPE_SECRET_KEY        sk_live_...
STRIPE_WEBHOOK_SECRET    whsec_...
STRIPE_PRICE_MONTHLY     price_...
STRIPE_PRICE_ANNUAL      price_...
STRIPE_PRICE_LIFETIME    price_...
```

The `DB` binding for D1 already exists — that's what auth uses.

Until `STRIPE_SECRET_KEY` and the two subscription price ids are set, `/api/billing/config`
returns `enabled:false` and the site shows the prices with the buttons disabled and an
honest line saying checkout isn't live. Nothing breaks; it just doesn't sell.

## 3. Migrate the database

```
wrangler d1 execute rtfclmgzn --remote --file=db/002_billing.sql
```

The three `ALTER TABLE` lines fail with "duplicate column name" if you run it twice. That's
expected and harmless — the rest still applies.

**Run this before deploying**, or at least soon after. The code is written to survive the
wrong order (`getSessionUser` falls back to the old query if the new columns are missing),
so a deploy without the migration degrades to "no billing metadata" rather than signing
everyone out. But nobody can subscribe until it's run.

## 4. Test before going live

In Stripe **test mode**, with test keys in Preview:

- Card `4242 4242 4242 4242`, any future expiry, any CVC → a successful subscription.
- Card `4000 0000 0000 0341` → attaches but fails on charge, so you can watch
  `invoice.payment_failed` arrive and confirm access is *not* cut off immediately (that's
  deliberate — Stripe retries a failed card for about two weeks, and cutting a paying
  subscriber off on the first failure costs more goodwill than the fortnight is worth).
- Cancel from the portal → check the account page says "ends 12 March 2027" rather than
  dropping access that instant.

Watch the webhook deliveries in the Stripe dashboard. A red delivery with `bad-signature`
means `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint.

## 5. Voucher codes

Two different things, and the difference matters:

**Access codes** — `lifetime` and `free-months`. These grant Plus directly on the account
page. No card, no Stripe, no checkout. A three-month code that doesn't ask for a card is a
genuinely better offer than a Stripe trial that does, and it stops on its own: the grant
writes an expiry date and `getSessionUser` compares it on every request. No cron job to
forget to run.

**Discount codes** — `percent` and `amount`. These only mean something inside a checkout,
so each needs a Stripe coupon. Create the coupon in Stripe first (Product catalogue →
Coupons), then pass its id with `--coupon`. Redeeming one grants nothing; it's remembered
and applied when the reader picks a plan.

Mint them:

```
python agents/billing/mint_vouchers.py lifetime      --count 5  --note "press"
python agents/billing/mint_vouchers.py free-months 3  --count 50 --batch launch-3mo
python agents/billing/mint_vouchers.py free-months 6  --count 20
python agents/billing/mint_vouchers.py free-months 12 --count 10 --note "founding readers"
python agents/billing/mint_vouchers.py percent 50     --count 25 --coupon <id> --expires 2026-12-31
```

Each run writes two files under `agents/billing/issued/`: a `.csv` of codes to hand out, and
a `.sql` to apply. **Nothing is live until you run the wrangler command it prints.** That's
on purpose — minting fifty lifetime codes should be something you look at before it's real.

Useful flags: `--uses 0` for an unlimited-use code (a launch promo), `--uses 1` for
one-per-person (the default), `--expires` to make the code itself stop working, `--batch` to
label a run so you can retire the whole thing later:

```sql
UPDATE vouchers SET active=0 WHERE batch='launch-3mo';
```

## What the code guarantees

- **The browser never decides who has Plus.** `users.plan` is written in exactly three
  places: the verified webhook, voucher redemption, and expiry lapse. The old
  `rtfcPlan('plus')` — which was a free subscription for anyone who opened the console —
  is deleted.
- **The webhook verifies every signature** (HMAC-SHA256 over `timestamp.body`, constant-time
  compare, 5-minute replay window). An unverified request is rejected before a row is read.
- **Events are idempotent.** Stripe retries; a replayed `checkout.session.completed` can't
  burn a second founding slot.
- **The lifetime cap is checked twice** — at checkout and again in the webhook. If someone
  slips through to 101, the purchase is honoured and logged, because charging someone and
  then locking them out is a worse failure than going one over a self-imposed cap.
- **Voucher races are handled by constraints, not by checking first.** `UNIQUE(code,user_id)`
  stops double redemption; a guarded `UPDATE` stops the last slot going twice.

## What isn't done

- **Tax.** Stripe Tax handles VAT/sales tax and is a checkbox in the dashboard, but whether
  you need it depends on where you sell and how much. Worth ten minutes with an accountant
  before you take money from the EU or UK.
- **Terms and refund policy.** The site's terms still say no payments are collected. That
  clause now hides itself once billing is live, but you need real terms and a refund line
  before charging anyone. I'd suggest a plain 14-day no-questions refund.
- **Dunning emails.** Stripe can send them; turn it on in Settings → Billing → Subscriptions.
- **Receipts.** Also a Stripe setting, off by default.
