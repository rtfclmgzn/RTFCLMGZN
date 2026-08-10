#!/usr/bin/env python3
"""RTFCLMGZN — mint voucher codes.

    python agents/billing/mint_vouchers.py lifetime      --count 5  --note "press"
    python agents/billing/mint_vouchers.py free-months 3 --count 50 --batch launch-3mo
    python agents/billing/mint_vouchers.py free-months 12 --count 10 --note "founding readers"
    python agents/billing/mint_vouchers.py percent 50    --count 25 --coupon <stripe_coupon_id>
    python agents/billing/mint_vouchers.py amount 1000   --count 10 --coupon <stripe_coupon_id>

Writes a .sql file you apply with wrangler, and a .csv of the codes to hand out:

    wrangler d1 execute rtfclmgzn --remote --file=<the .sql it prints>

It does NOT talk to D1 or Stripe itself. That is deliberate — minting a batch of
lifetime codes should be a thing you look at before it becomes real, not a side effect
of running a script.

ACCESS vs DISCOUNT
  lifetime, free-months   grant Plus directly. No Stripe involvement, no card. These
                          work through /api/billing/redeem on the account page.
  percent, amount         are discounts. They only mean something inside a Stripe
                          checkout, so each needs a Stripe coupon id (--coupon). Create
                          the coupon in the Stripe dashboard first (Product catalogue ->
                          Coupons), then pass its id here. Redeeming one grants nothing;
                          it is remembered and applied when the reader picks a plan.

Codes avoid look-alike characters (no O/0, I/1/L) because these get read aloud, written
on cards, and retyped from photographs.
"""
import argparse, csv, datetime, os, secrets, sys

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"   # no I, L, O, 0, 1
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "issued")


def make_code(prefix, groups=3, size=4):
    body = "-".join(
        "".join(secrets.choice(ALPHABET) for _ in range(size)) for _ in range(groups)
    )
    return f"{prefix}-{body}" if prefix else body


def sql_escape(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def main():
    ap = argparse.ArgumentParser(description="Mint RTFCLMGZN voucher codes.")
    ap.add_argument("kind", choices=["lifetime", "free-months", "percent", "amount"])
    ap.add_argument("value", nargs="?", type=int,
                    help="months for free-months; percent for percent; CENTS for amount")
    ap.add_argument("--count", type=int, default=1, help="how many distinct codes to mint")
    ap.add_argument("--uses", type=int, default=1,
                    help="redemptions allowed PER CODE (0 = unlimited). Default 1.")
    ap.add_argument("--coupon", help="Stripe coupon id — required for percent/amount")
    ap.add_argument("--expires", help="date the CODES stop working, YYYY-MM-DD")
    ap.add_argument("--note", default="", help="who these are for; admin-only")
    ap.add_argument("--batch", help="label so a whole run can be retired at once")
    ap.add_argument("--prefix", default="RTFC", help="code prefix (default RTFC)")
    a = ap.parse_args()

    if a.kind in ("free-months", "percent", "amount") and a.value is None:
        sys.exit(f"'{a.kind}' needs a value — see --help for the units.")
    if a.kind in ("percent", "amount") and not a.coupon:
        sys.exit("percent/amount codes are discounts and need --coupon <stripe_coupon_id>.\n"
                 "Create the coupon in Stripe first; this script does not create it for you.")
    if a.kind == "percent" and not (1 <= a.value <= 100):
        sys.exit("percent must be 1-100.")
    if a.count < 1:
        sys.exit("--count must be at least 1.")

    if a.kind == "lifetime":
        db_kind, db_value = "lifetime", None
    elif a.kind == "free-months":
        db_kind, db_value = "free_days", a.value * 30
    elif a.kind == "percent":
        db_kind, db_value = "percent_off", a.value
    else:
        db_kind, db_value = "amount_off", a.value

    max_red = None if a.uses == 0 else a.uses
    expires = None
    if a.expires:
        try:
            expires = datetime.datetime.strptime(a.expires, "%Y-%m-%d").strftime("%Y-%m-%d 23:59:59")
        except ValueError:
            sys.exit("--expires must look like 2026-12-31")

    batch = a.batch or f"{a.kind}-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}"

    codes, seen = [], set()
    while len(codes) < a.count:
        c = make_code(a.prefix)
        if c not in seen:
            seen.add(c)
            codes.append(c)

    os.makedirs(OUT_DIR, exist_ok=True)
    stem = os.path.join(OUT_DIR, batch)

    with open(stem + ".sql", "w", encoding="utf-8", newline="\n") as f:
        f.write(f"-- RTFCLMGZN vouchers — batch {batch}\n")
        f.write(f"-- kind={db_kind} value={db_value} uses_per_code={a.uses or 'unlimited'} "
                f"count={a.count}\n")
        if a.note:
            f.write(f"-- note: {a.note}\n")
        f.write(f"-- apply:  wrangler d1 execute rtfclmgzn --remote --file={stem}.sql\n")
        f.write(f"-- retire: UPDATE vouchers SET active=0 WHERE batch={sql_escape(batch)};\n\n")
        for c in codes:
            f.write(
                "INSERT INTO vouchers (code, kind, value, stripe_coupon_id, max_redemptions, "
                "expires_at, note, batch) VALUES ("
                f"{sql_escape(c)}, {sql_escape(db_kind)}, "
                f"{db_value if db_value is not None else 'NULL'}, {sql_escape(a.coupon)}, "
                f"{max_red if max_red is not None else 'NULL'}, {sql_escape(expires)}, "
                f"{sql_escape(a.note or None)}, {sql_escape(batch)});\n"
            )

    with open(stem + ".csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["code", "kind", "value", "uses", "expires", "note"])
        for c in codes:
            w.writerow([c, db_kind, db_value, a.uses or "unlimited", a.expires or "", a.note])

    # Built branch-by-branch, not as a dict literal: a dict would evaluate every arm,
    # and the amount arm divides a value that is None for lifetime codes.
    if db_kind == "lifetime":
        human = "Plus for life"
    elif db_kind == "free_days":
        human = f"{a.value} month{'s' if a.value != 1 else ''} of Plus, free"
    elif db_kind == "percent_off":
        human = f"{a.value}% off at checkout"
    else:
        human = f"${a.value / 100:.2f} off at checkout"

    print()
    print(f"  {a.count} code(s) — {human}")
    print(f"  uses per code: {a.uses or 'unlimited'}"
          + (f"   expires: {a.expires}" if a.expires else "   no expiry"))
    print(f"  batch: {batch}")
    print()
    for c in codes[:10]:
        print("   ", c)
    if len(codes) > 10:
        print(f"    … and {len(codes) - 10} more in the csv")
    print()
    print(f"  codes:  {stem}.csv")
    print(f"  apply:  wrangler d1 execute rtfclmgzn --remote --file={stem}.sql")
    print()
    print("  Nothing is live until you run that command.")
    print()


if __name__ == "__main__":
    main()
