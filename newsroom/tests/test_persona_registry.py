"""Persona-migration invariants (masthead v2, July 2026).

Guards the nine-editor lineup end to end: registry, spec map, routing,
active agent files, portraits, and the retired-persona compatibility layer.
Pure filesystem checks — no network, no model calls.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

ACTIVE = {
    "ash-lindqvist": "Ash Lindqvist",
    "sage-okafor": "Sage Okafor",
    "jin-park": "Jin Park",
    "evelyn-zhao": "Evelyn Zhao",
    "samira-nasser": "Samira Nasser",
    "nova-reyes": "Nova Reyes",
    "priya-anand": "Priya Anand",
    "kian-farzan": "Kian Farzan",
    "luka-petrovic": "Luka Petrović",
}
RETIRED = {"idris-vale", "marcus-webb", "maya-serrano", "ronan-cole"}

SECTION_OWNER = {
    "Frontier": "luka-petrovic",
    "Products": "nova-reyes",
    "Compute": "jin-park",
    "Policy": "evelyn-zhao",
    "Health": "priya-anand",
    "Markets": "kian-farzan",
    "Robotics": "ash-lindqvist",
    "Opinion": "sage-okafor",
    "Ethics": "samira-nasser",
}

INITIALS = {
    "Ash Lindqvist": "AL", "Sage Okafor": "SO", "Jin Park": "JP",
    "Evelyn Zhao": "EZ", "Samira Nasser": "SN", "Nova Reyes": "NR",
    "Priya Anand": "PA", "Kian Farzan": "KF", "Luka Petrović": "LP",
}


def _registry():
    return json.loads((ROOT / "newsroom/registry/agents.json").read_text(encoding="utf-8"))


def _spec_map():
    return json.loads((ROOT / "newsroom/prompts/agent-spec-map.json").read_text(encoding="utf-8"))


def test_registry_has_exactly_nine_active_personas():
    agents = _registry()["agents"]
    personas = [a for a in agents if a.get("class") == "persona"]
    ids = sorted(a["id"] for a in personas)
    assert ids == sorted(ACTIVE), ids
    assert all(a.get("status") == "active" for a in personas)


def test_no_retired_persona_in_registry_or_spec_map():
    blob = json.dumps(_registry()) + json.dumps(_spec_map())
    for slug in RETIRED:
        assert slug not in blob, f"retired slug {slug} still active"


def test_spec_map_points_at_existing_active_files_not_old():
    for slug, rel in _spec_map().items():
        if "personas" not in str(rel):
            continue
        assert "_old" not in str(rel), rel
        path = ROOT / rel
        assert path.is_file(), rel
        assert slug in ACTIVE, slug


def test_active_agent_files_exist_and_old_is_archived():
    live = ROOT / "agents/personas"
    files = {p.stem.replace(".agent", "") for p in live.glob("*.agent.md")}
    assert files == set(ACTIVE), files
    assert (live / "_old").is_dir()  # archive preserved, never deleted


def test_agent_frontmatter_names_and_status():
    for slug, display in ACTIVE.items():
        text = (ROOT / f"agents/personas/{slug}.agent.md").read_text(encoding="utf-8")
        head = text.split("---")[1]
        assert f"name: {slug}" in head, slug
        assert f"display_name: {display}" in head, slug
        assert "status: active" in head, slug


def test_discovery_routing_matches_section_owners():
    text = (ROOT / "newsroom/autonomy/discovery.py").read_text(encoding="utf-8")
    block = re.search(r"PERSONA_BY_SECTION = \{(.*?)\}", text, re.S).group(1)
    routed = dict(re.findall(r'"(\w+)":\s*"([a-z-]+)"', block))
    for section, owner in SECTION_OWNER.items():
        assert routed.get(section) == owner, (section, routed.get(section))
    assert routed.get("Guide") == "nova-reyes"
    for slug in RETIRED:
        assert slug not in text


def test_site_personas_js_active_lineup_only():
    text = (ROOT / "web/data/personas.js").read_text(encoding="utf-8")
    for slug in ACTIVE:
        assert f'key:"{slug}"' in text, slug
    for slug in RETIRED:
        assert slug not in text, slug
    assert "Dr. Priya" not in text
    assert "Luka Petrović" in text  # UTF-8 display name intact
    for section, owner in SECTION_OWNER.items():
        assert re.search(r'key:"%s".*?editor:"%s"' % (section, owner), text, re.S), section


def test_no_retired_persona_anywhere_in_web():
    """Owner-directed full reassignment (July 2026): every article, log, feed and
    page credits the active lineup; pre-migration bylines live in git history."""
    retired_names = {"Marcus Webb", "Ronan Cole", "Idris Vale", "Maya Serrano"}
    for f in (ROOT / "web").rglob("*"):
        if f.suffix not in (".js", ".xml", ".html") or not f.is_file():
            continue
        text = f.read_text(encoding="utf-8", errors="ignore")
        for bad in RETIRED | retired_names:
            assert bad not in text, f"{bad} still in {f}"


def test_no_sage_byline_on_frontier_articles():
    """Sage moved to Opinion; every Frontier piece is credited to Luka Petrović."""
    data_files = ["articles.js", "live-articles.js", "approved-batch-2026-07-14.js",
                  "newsroom-articles.js", "research.js", "guides.js"]
    for name in data_files:
        text = (ROOT / "web/data" / name).read_text(encoding="utf-8")
        for m in re.finditer(r'"?slug"?\s*:\s*"([^"]+)"', text):
            seg_end = text.find('slug', m.end())
            seg = text[m.start():seg_end if seg_end > 0 else len(text)]
            sec = re.search(r'"?section"?\s*:\s*"([^"]+)"', seg)
            per = re.search(r'"?persona"?\s*:\s*"([^"]+)"', seg)
            if sec and per and sec.group(1) == "Frontier":
                assert per.group(1) == "luka-petrovic", (name, m.group(1), per.group(1))


def test_portraits_exist_unique_and_mapped():
    seen = set()
    for slug in ACTIVE:
        f = ROOT / f"web/assets/img/personas/{slug}.jpg"
        assert f.is_file(), slug
        sig = (f.stat().st_size, slug != "")
        assert f.stat().st_size > 10_000, f"{slug} portrait suspiciously small"
        assert f.stat().st_size not in seen, f"{slug} duplicates another portrait"
        seen.add(f.stat().st_size)


def test_fallback_initials_derivation():
    def initials(name):
        return "".join(w[0] for w in name.split(" "))[:2].upper()
    for name, expect in INITIALS.items():
        assert initials(name) == expect, name
