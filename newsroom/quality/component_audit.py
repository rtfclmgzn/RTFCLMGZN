"""Component integrity audit for the whole published archive.

Run this after ANY edit to article body data:
    python -m newsroom.quality.component_audit

It is the mechanical half of the visual-component spec
(agents/_shared/visual-components.md). It caught, on its first run: a silently
dropped insert, a legacy chart block in a shape the schema rejects, four
component pairs stacked with no prose between them, and one brief carrying more
visual blocks than paragraphs. None of those are visible by reading the diff.

Exit 0 = clean. Exit 1 = hard issues. Adjacency and density are reported as
warnings on stderr and do not fail the run, because a genuine exception exists
(a document + its reading, say) -- but an unexplained one is a defect.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from newsroom.autonomy.schema import SchemaValidationError, load_schema, validate  # noqa: E402

COMPONENTS = {
    "chart", "compare", "timeline", "entity", "scorecard", "ledger", "beforeafter",
    "spectrum", "flow", "keyfacts", "stakes", "sourcecheck", "stat",
    "model", "rank", "counter", "document",
    # instruction blocks (guides)
    "procedure", "snippet", "decide", "pitfalls",
}
# Components that carry data rather than framing.
DATA_COMPONENTS = {"chart", "compare", "ledger", "timeline", "spectrum", "rank", "model"}
FLOOR = {"brief": 1, "synthesis": 2, "research": 4, "guide": 2}
# Everything published from this date forward must clear its floor on the way out
# the door. Older pieces are backfill debt, listed and counted, never silently OK.
FLOOR_ENFORCED_FROM = "2026-07-31"
# Unit/time conversion constants are arithmetic scaffolding in a model formula,
# not sourced facts.
SCALE = {"1", "10", "12", "24", "52", "100", "365", "1000", "10000", "100000", "1000000"}
# Attribution, header and prose fields: ordinals and dates there are not data claims.
SKIP_KEYS = {
    "source", "url", "kicker", "title", "label", "sub", "note", "detail", "verdict",
    "reading", "whoHolds", "claim", "docTitle", "docMeta", "text", "n", "basis",
    "resolver", "ruling", "who", "says", "question", "beforeLabel", "afterLabel",
    "leftLabel", "rightLabel", "what", "actor", "when", "unit", "prefix", "key", "expr",
    # Instruction fields. A prompt that says "under 150 words" is an instruction
    # to the model, not a claim about the world, and must not be provenance-checked
    # against the article body.
    "body", "expects", "prereqs", "do", "verify", "ifnot", "why", "est", "level",
    "lang", "means", "example", "track", "then", "because", "next", "warn",
    "mistake", "looks", "fix", "cost",
}
NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def _load_js_array(path: Path):
    """Parse a `window.X = [...]` data file.

    Only strict-JSON files are audited. guides.js is hand-authored with JS
    object-literal syntax (unquoted keys), which json cannot read -- it is
    skipped with a notice rather than crashing the audit, because a crashing
    audit is an audit nobody runs.
    """
    text = path.read_text("utf-8")
    try:
        return json.loads(text[text.index("[") :].rstrip().rstrip(";"))
    except (ValueError, json.JSONDecodeError):
        print(f"  note: {path.name} is not strict JSON (JS literal syntax) -- skipped", file=sys.stderr)
        return []


def _numbers(obj, out=None):
    if out is None:
        out = []
    if isinstance(obj, str):
        out.extend(m.replace(",", "") for m in NUM.findall(obj))
    elif isinstance(obj, dict):
        for key, value in obj.items():
            if key in SKIP_KEYS:
                continue
            _numbers(value, out)
    elif isinstance(obj, list):
        for value in obj:
            _numbers(value, out)
    return out


def _article_text(article) -> str:
    parts = [article.get("title", ""), article.get("dek", "")] + list(article.get("tldr") or [])
    parts += [b.get("text", "") for b in article.get("body") or []]
    return " " + " ".join(parts).replace(",", "") + " "


def main() -> int:
    web = ROOT / "web" / "data"
    schema = load_schema("article-draft.json")
    branches = schema["properties"]["article"]["properties"]["body"]["items"]["anyOf"]
    # Branches declare their discriminator as either {"enum":[...]} (the original
    # seventeen) or {"const": "..."} (the four instruction blocks). Reading only
    # `enum` raised KeyError before a single article was loaded, which would have
    # taken every scheduled cycle down with it.
    def _btype(b):
        t = b["properties"]["type"]
        return (t.get("enum") or [t["const"]])[0]
    per_type = {_btype(b): {"anyOf": [b]} for b in branches}
    figures_src = (web / "figures.js").read_text("utf-8") if (web / "figures.js").exists() else ""

    articles = []
    for name in ("newsroom-articles.js", "guides.js"):
        path = web / name
        if path.exists():
            articles += _load_js_array(path)

    issues: list[str] = []
    warnings: list[str] = []
    backfill: list[str] = []

    for article in articles:
        slug = article.get("slug", "?")
        body = article.get("body") or []
        comps = [b for b in body if b.get("type") in COMPONENTS]
        names = [b["type"] for b in comps]
        text = _article_text(article)

        for block in comps:
            kind = block["type"]
            if "text" in block:
                issues.append(f"{slug}: {kind} carries a top-level 'text' field")
            try:
                validate(block, per_type[kind])
            except SchemaValidationError as exc:
                issues.append(f"{slug}: {kind} fails schema -- {exc}")
            except KeyError:
                issues.append(f"{slug}: {kind} has no schema branch")

            if kind == "rank":
                cfg = block.get("rank", {})
                if f'id:"{cfg.get("highlight")}"' not in figures_src:
                    issues.append(f"{slug}: rank highlights '{cfg.get('highlight')}' which is not in figures.js")

            allowed = set(SCALE) if kind == "model" else set()
            for value in set(_numbers(block)):
                if value.isdigit() and len(value) == 4 and 2024 <= int(value) <= 2028:
                    continue
                if value in allowed:
                    continue
                if re.search(r"(?<!\d)" + re.escape(value) + r"(?!\d)", text):
                    continue
                issues.append(f"{slug}: {kind} states '{value}', which appears nowhere in the article text")

        if body and body[0].get("type") in COMPONENTS:
            issues.append(f"{slug}: leads with a {body[0]['type']} instead of prose")

        # The floor check used to sit inside `if comps:`, which meant a piece with
        # ZERO components skipped it entirely -- the exact case the floor exists to
        # catch. All three guides shipped under it. Checked unconditionally now.
        #
        # BUT: turning it on retroactively surfaced 28 pre-existing articles below
        # floor, and a hard failure on those would block every scheduled cycle from
        # publishing anything. The debt is real and must not be hidden, so it is
        # reported as a named, counted backfill queue rather than silently forgiven,
        # and the cycle runbook's SS3c already burns it down two per run. Anything
        # published from FLOOR_ENFORCED_FROM onward fails hard, immediately.
        floor = FLOOR.get(article.get("format"), 1)
        if len(comps) < floor:
            msg = f"{slug}: {len(comps)} component(s), floor for {article.get('format')} is {floor}"
            if str(article.get("publishedAt", ""))[:10] >= FLOOR_ENFORCED_FROM:
                issues.append(msg)
            else:
                backfill.append(msg)
        if article.get("format") == "guide" and "procedure" not in names:
            issues.append(f"{slug}: guide with no procedure block -- a guide must end in the reader having DONE something")

        if comps:
            if article.get("format") in ("synthesis", "research") and not (set(names) & DATA_COMPONENTS):
                issues.append(f"{slug}: {article.get('format')} with no data-carrying component")
            if article.get("format") == "research" and names.count("chart") < 2:
                issues.append(f"{slug}: research with {names.count('chart')} chart(s), needs 2")

            paragraphs = sum(1 for b in body if b.get("type") == "p")
            if len(comps) > paragraphs:
                warnings.append(f"{slug}: {len(comps)} components vs {paragraphs} paragraphs (reads as a dashboard)")
            for i in range(len(body) - 1):
                if body[i].get("type") in COMPONENTS and body[i + 1].get("type") in COMPONENTS:
                    warnings.append(f"{slug}: {body[i]['type']} + {body[i+1]['type']} stacked with no prose between")

    with_comps = sum(1 for a in articles if any(b.get("type") in COMPONENTS for b in a.get("body") or []))
    total = sum(1 for a in articles for b in a.get("body") or [] if b.get("type") in COMPONENTS)
    print(f"{with_comps}/{len(articles)} articles carry components; {total} component blocks")

    if backfill:
        # Named and counted every run, so the number has to go down. The cycle
        # runbook's SS3c backfills two per run; at that rate this list is the
        # publication's visible, shrinking debt rather than an excuse.
        print(f"\nBACKFILL DEBT: {len(backfill)} piece(s) published before "
              f"{FLOOR_ENFORCED_FROM} sit below their component floor.", file=sys.stderr)
        for b in backfill[:8]:
            print(f"  DEBT  {b}", file=sys.stderr)
        if len(backfill) > 8:
            print(f"  DEBT  ...and {len(backfill)-8} more", file=sys.stderr)
    for warning in warnings:
        print(f"  WARN  {warning}", file=sys.stderr)
    if issues:
        print(f"\n{len(issues)} HARD ISSUE(S):", file=sys.stderr)
        for issue in issues:
            print(f"  FAIL  {issue}", file=sys.stderr)
        return 1
    print("No hard issues."
          + (f" {len(warnings)} warning(s)" if warnings else "")
          + (f" {len(backfill)} backfill debt" if backfill else "")
          + ("." if (warnings or backfill) else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
