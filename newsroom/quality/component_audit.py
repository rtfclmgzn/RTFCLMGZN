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


class DataFileError(RuntimeError):
    """A published data file could not be read. Always fatal, never skipped."""


# Anchored on the ASSIGNMENT (`window.X = [`), not on the first `[` in the file.
# Same lesson ship_preflight.py's js_object() records: header comments in these
# files contain brackets, and slicing from the first one parses the
# DOCUMENTATION instead of the data. Last match wins so an example assignment in
# a header cannot beat the real one.
_ASSIGN = re.compile(r"window\.[A-Za-z_][A-Za-z_0-9]*\s*=\s*(?=\[)")


def _load_js_array(path: Path):
    """Parse a `window.X = [...]` data file, or die.

    THIS FUNCTION MUST NEVER RETURN AN EMPTY LIST ON FAILURE.

    It used to catch JSONDecodeError, print a note to stderr, and return `[]`.
    The note was written for guides.js, which was once hand-authored JS
    object-literal syntax (unquoted keys) that `json` could not read. guides.js
    has since been converted to strict JSON and parses fine -- see its own
    header -- so the exemption had no remaining legitimate user, and what was
    left was a catastrophe switch:

        a truncated or half-written data file -> JSONDecodeError -> `[]`
        -> zero articles audited -> "No hard issues." -> exit 0 -> push.

    Every downstream check (schema, the no-top-level-`text` invariant, component
    floors, numeric provenance) iterates the returned list, so an empty list
    passes all of them vacuously, and ship_preflight.py reads only the exit code.
    A half-written newsroom-articles.js would have sailed through the one gate
    whose entire job is to catch a half-written newsroom-articles.js. An audit
    that cannot read its input has not passed; it has failed to run.
    """
    text = path.read_text("utf-8")
    matches = list(_ASSIGN.finditer(text))
    if not matches:
        raise DataFileError(f"{path.name}: no `window.X = [` assignment found -- file truncated or renamed?")
    payload = text[matches[-1].end():].rstrip().rstrip(";")
    try:
        data = json.loads(payload)
    except ValueError as exc:  # JSONDecodeError is a subclass
        raise DataFileError(
            f"{path.name}: not parseable as JSON ({exc}). "
            "The file is truncated, mid-edit, or was written with JS object-literal "
            "syntax. Fix the file -- the audit will not proceed on partial data."
        ) from exc
    if not isinstance(data, list):
        raise DataFileError(f"{path.name}: parsed to {type(data).__name__}, expected a list")
    if not data:
        raise DataFileError(
            f"{path.name}: parsed to an EMPTY list. A published data file with zero "
            "entries is a truncation, not a clean archive."
        )
    return data


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

    # A file that is missing is the same vacuous-pass hazard as a file that will
    # not parse -- zero articles audited, "No hard issues.", exit 0. Both are
    # fatal. Both of these files are in ship_preflight's REQUIRED_FILES; neither
    # is optional.
    articles = []
    try:
        for name in ("newsroom-articles.js", "guides.js"):
            path = web / name
            if not path.exists():
                raise DataFileError(f"{name}: missing from web/data -- cannot audit an archive that isn't there")
            articles += _load_js_array(path)
    except DataFileError as exc:
        print(f"\nAUDIT DID NOT RUN -- {exc}", file=sys.stderr)
        print("  This is a FAILURE, not a skip. Nothing was checked.", file=sys.stderr)
        return 1

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
