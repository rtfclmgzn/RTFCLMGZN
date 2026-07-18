from __future__ import annotations

import unittest
from pathlib import Path

from newsroom.autonomy.buzz_cycle import (
    BuzzCycleError,
    _entry_date,
    _extract_array,
    _find_matching_bracket,
    _format_entry,
    _split_top_level_objects,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


class ArrayParsingTests(unittest.TestCase):
    def test_buzz_js_roundtrips_exactly(self) -> None:
        text = (REPO_ROOT / "web" / "data" / "buzz.js").read_text("utf-8")
        prefix, suffix, entries = _extract_array(text, r"window\.RTFC_BUZZ\s*=\s*\[")
        rebuilt = prefix + "\n" + ",\n".join("  " + e for e in entries) + "\n" + suffix
        self.assertEqual(text, rebuilt)
        self.assertGreater(len(entries), 0)

    def test_usage_log_rows_roundtrip_exactly(self) -> None:
        text = (REPO_ROOT / "web" / "data" / "usage-log-current.js").read_text("utf-8")
        prefix, suffix, rows = _extract_array(text, r"var rows\s*=\s*\[")
        rebuilt = prefix + "\n" + ",\n".join("    " + r for r in rows) + "\n  " + suffix
        self.assertEqual(text, rebuilt)
        self.assertGreater(len(rows), 0)

    def test_nested_braces_stay_one_top_level_entry(self) -> None:
        body = '{ id:"a", source:{ name:"x", nested:{ deep:1 } } }, { id:"b" }'
        entries = _split_top_level_objects(body)
        self.assertEqual(2, len(entries))
        self.assertIn('nested:{ deep:1 }', entries[0])

    def test_braces_inside_string_literals_do_not_confuse_the_splitter(self) -> None:
        body = '{ id:"a", text:"uses a { brace } inside a string" }, { id:"b" }'
        entries = _split_top_level_objects(body)
        self.assertEqual(2, len(entries))

    def test_missing_marker_raises(self) -> None:
        with self.assertRaises(BuzzCycleError):
            _extract_array("no array here", r"window\.NOPE\s*=\s*\[")

    def test_find_matching_bracket_ignores_brackets_inside_strings(self) -> None:
        text = 'x = [ { url:"http://a/[weird]" }, { id:"b" } ];'
        open_idx = text.index("[")
        close_idx = _find_matching_bracket(text, open_idx)
        self.assertEqual("]", text[close_idx])
        self.assertEqual(text.rindex("]"), close_idx)


class EntryFormattingTests(unittest.TestCase):
    def test_format_entry_produces_parseable_fields(self) -> None:
        item = {
            "date": "2026-07-18",
            "source_name": 'Some "Lab"',
            "source_handle": "@lab",
            "platform": "x",
            "kind": "lab",
            "text": "Shipped a thing",
            "why": "It matters",
            "heat": 77,
            "topics": ["models", "launch"],
            "url": "https://example.com/post",
        }
        entry = _format_entry("bz-099", item)
        self.assertIn('id:"bz-099"', entry)
        self.assertIn('date:"2026-07-18"', entry)
        self.assertIn('name:"Some \\"Lab\\""', entry)
        self.assertIn('heat:77', entry)
        self.assertIn('topics:["models","launch"]', entry)
        self.assertEqual("2026-07-18", _entry_date(entry))

    def test_entry_date_defaults_when_missing(self) -> None:
        self.assertEqual("0000-00-00", _entry_date("{ id:\"bz-001\" }"))


if __name__ == "__main__":
    unittest.main()
