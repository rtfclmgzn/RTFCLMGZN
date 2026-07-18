# RTFCLMGZN accounts database (Cloudflare D1)

One-time setup to provision the database the auth endpoints in `functions/api/auth/` read/write. Mirrors the pattern already used for `functions/api/tts.js`'s `ELEVENLABS_KEY`: production runtime access is a Cloudflare Pages dashboard binding, not a config file in this repo. Provisioning and migrating the database itself is the one place the `wrangler` CLI is unavoidable.

## Setup

1. Install Node.js if you don't already have it (wrangler is an npm package; this repo has no other Node tooling).
2. `npx wrangler login` — authenticates wrangler against your Cloudflare account once.
3. `npx wrangler d1 create rtfclmgzn` — creates the database, prints a `database_id`. Keep that id.
4. In the Cloudflare Pages dashboard → this project → Settings → Functions → D1 database bindings: add a binding named `DB` pointing at the database you just created. Functions access it as `env.DB`.
5. `npx wrangler d1 migrations apply rtfclmgzn --remote` — applies `db/migrations/0001_init.sql` to the real database.

## Making schema changes later

Add a new file to `db/migrations/` (e.g. `0002_add_x.sql`), update `db/schema.sql` to match (it's the annotated source of truth; migrations are the literal statements wrangler runs), then `npx wrangler d1 migrations apply rtfclmgzn --remote` again.
