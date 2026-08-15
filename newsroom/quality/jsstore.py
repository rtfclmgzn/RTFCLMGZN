#!/usr/bin/env python3
"""Tolerant reader for the site's JS data stores.

The data layer is JS array literals (so the site runs over file:// with no
build step), not JSON. Anything that wants to CHECK that data from Python
needs to read it the same way the SSR function's jsonish() does. This is the
one shared implementation — site_guard.py imports it rather than growing a
fourth private copy that can drift from the other three.
"""

from __future__ import annotations

import io
import json
import re
from pathlib import Path


class StoreParseError(ValueError):
    """A store could not be parsed, WITH the text around the failure.

    A bare JSONDecodeError says "Expecting ',' delimiter: line 206 column 5
    (char 221595)" about a file that has been machine-transformed on the way in,
    so that line number belongs to no file anyone can open. This carries the
    actual characters, which is the difference between a diagnosis and a guess.
    """

    def __init__(self, message, converted="", offset=0):
        super().__init__(message)
        self.converted = converted
        self.offset = offset


def snippet(text: str, offset: int, width: int = 160) -> str:
    lo = max(0, offset - width // 2)
    return repr(text[lo:lo + width])


# Every record a salvage pass had to throw away, as (label, index, message).
# site_guard.py drains this and reports it. Module-level rather than a return
# value so that adding salvage did not change the signature of every reader and
# every one of their call sites.
SALVAGE_REPORT = []

# One corrupt record can cascade into dozens of derived complaints. Report the
# first few per file and count the rest: a wall of near-identical errors buries
# the other nine check families' findings, which is the same harm as crashing,
# just slower.
SALVAGE_CAP = 5
_salvage_seen = {}


def _report(label, idx, msg):
    n = _salvage_seen.get(label, 0) + 1
    _salvage_seen[label] = n
    if n <= SALVAGE_CAP:
        SALVAGE_REPORT.append((label, idx, msg))
    elif n == SALVAGE_CAP + 1:
        SALVAGE_REPORT.append(
            (label, -1, "... further salvage messages suppressed; fix the first one"))


def _salvage_array(raw: str, label: str):
    """Parse a JS array element by element, keeping everything that parses.

    WHY (2026-08-15). One malformed row in usage-log-current.js — written by a
    bot, invisible in the browser — made the WHOLE ledger unparseable, which
    crashed site_guard mid-run, which blocked the ship and hid the nine other
    check families' findings behind a stack trace. One bad record must cost one
    record: never the file, never the run.
    """
    items, idx = [], 0
    start = raw.find("[")
    if start < 0:
        SALVAGE_REPORT.append((label, -1, "no array literal found"))
        return items
    i, n = start + 1, len(raw)
    while i < n:
        c = raw[i]
        if c.isspace() or c == ",":
            i += 1
            continue
        if c == "]":
            break
        if c in "[{":
            blob = slice_container(raw, i)
            if blob is None:
                _report(label, idx, "record %d never closes - %s" % (idx, snippet(raw, i)))
                break
            try:
                items.append(tolerant_parse(blob))
            except Exception as exc:                       # noqa: BLE001
                _report(label, idx, "record %d dropped (%s) - %s"
                        % (idx, exc, snippet(blob, 0)))
            idx += 1
            i += len(blob)
            continue
        # Anything else at the top level of an array of records is garbage: a
        # stray token, a half-deleted row, a merge-conflict marker.
        #
        # Resynchronise on the next line that STARTS a record, not on the next
        # comma. Commas are everywhere inside record bodies, so comma-hopping
        # lands mid-string and reports the same corruption fifteen times with
        # fifteen different offsets — a report nobody can act on.
        nxt = re.search(r"\n\s*\{", raw[i:])
        _report(label, idx, "element %d is not a record - %s" % (idx, snippet(raw, i)))
        if not nxt:
            break
        i, idx = i + nxt.start() + 1, idx + 1
    return items


def parse_or_salvage(raw: str, label: str):
    """tolerant_parse, but a failure degrades to per-record salvage instead of
    propagating. Returns None only when there is nothing recoverable at all."""
    try:
        return tolerant_parse(raw)
    except Exception as exc:                               # noqa: BLE001
        if not raw.lstrip().startswith("["):
            _report(label, -1, "unparseable, and not an array: %s" % exc)
            return None
        _report(label, -1, "whole-file parse failed (%s) - salvaging record by record" % exc)
        return _salvage_array(raw, label)


def tolerant_parse(raw: str):
    """JSON first; else strip comments / quote bare keys / convert single-quoted
    strings / drop trailing commas. Single pass, string-aware."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    out, i, last_sig = [], 0, ""
    n = len(raw)
    while i < n:
        c = raw[i]
        if c in "\"'":
            q = c
            i += 1
            buf = []
            while i < n and raw[i] != q:
                if raw[i] == "\\":
                    buf.append(raw[i])
                    buf.append(raw[i + 1] if i + 1 < n else "")
                    i += 2
                    continue
                buf.append(raw[i])
                i += 1
            i += 1
            s = "".join(buf)
            if q == "'":
                s = s.replace("\\'", "'").replace('"', '\\"')
            out.append('"' + s + '"')
            last_sig = '"'
            continue
        if c == "/" and i + 1 < n and raw[i + 1] == "/":
            while i < n and raw[i] != "\n":
                i += 1
            continue
        if c == "/" and i + 1 < n and raw[i + 1] == "*":
            i += 2
            while i + 1 < n and not (raw[i] == "*" and raw[i + 1] == "/"):
                i += 1
            i += 2
            continue
        # REGEX LITERALS. entities.js and companies.js carry `re:/kimi\s*k3/i`
        # matchers — legal JS, impossible JSON. They become plain strings so the
        # record around them stays readable to any checker. (Without this the
        # whole entity registry was unparseable from Python, which is precisely
        # how a store escapes being checked at all.)
        if c == "/" and last_sig in ":,[{(":
            j, esc, cls = i + 1, False, False
            while j < n:
                ch = raw[j]
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == "[":
                    cls = True
                elif ch == "]":
                    cls = False
                elif ch == "/" and not cls:
                    break
                elif ch == "\n":
                    j = n
                    break
                j += 1
            if j < n:
                k = j + 1
                while k < n and raw[k].isalpha():
                    k += 1
                body = raw[i + 1:j].replace("\\", "\\\\").replace('"', '\\"')
                out.append('"' + body + '"')
                last_sig = '"'
                i = k
                continue
        if (c.isalpha() or c in "_$") and last_sig in "{,":
            j = i
            while j < n and (raw[j].isalnum() or raw[j] in "_$"):
                j += 1
            k = j
            while k < n and raw[k].isspace():
                k += 1
            if k < n and raw[k] == ":":
                out.append('"' + raw[i:j] + '"')
                last_sig = '"'
                i = j
                continue
            out.append(raw[i:j])
            last_sig = raw[j - 1]
            i = j
            continue
        if c == ",":
            k = i + 1
            while k < n and raw[k].isspace():
                k += 1
            # trailing comma before a close — drop it
            if k < n and raw[k] in "}]":
                i += 1
                continue
            # ARRAY HOLE (`},\n,\n{`). Legal JS — it makes a sparse array whose
            # missing element forEach silently skips, which is why a stray comma
            # written by an agent can sit in a live store for days doing nothing
            # visible. Collapse it here so checking still works; site_guard
            # reports and repairs the file itself.
            if k < n and raw[k] == "," or last_sig == ",":
                i += 1
                continue
            out.append(c)
            last_sig = c
            i += 1
            continue
        out.append(c)
        if not c.isspace():
            last_sig = c
        i += 1
    converted = "".join(out)
    try:
        return json.loads(converted)
    except json.JSONDecodeError as exc:
        raise StoreParseError(
            "%s at line %d col %d, near %s"
            % (exc.msg, exc.lineno, exc.colno, snippet(converted, exc.pos)),
            converted, exc.pos) from None


def slice_container(text: str, start: int) -> str | None:
    """Return the balanced [...] or {...} beginning at `start`, string-aware."""
    opener = text[start]
    closer = {"[": "]", "{": "}"}[opener]
    depth, i, in_str = 0, start, None
    while i < len(text):
        c = text[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
        elif c in "\"'":
            in_str = c
        elif c == opener:
            depth += 1
        elif c == closer:
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
        i += 1
    return None


def read_store(path: Path, var: str | None = None, last: bool = True):
    """Parse `window.<var> = [...]` (or {...}) out of a store file.

    var=None takes whichever window.* assignment matches `last`. Files that
    declare several globals (personas.js) must name the one they want — the
    'take the last assignment' default picked the wrong array once and the
    SSR pages rendered a persona list as articles.
    """
    if not path.is_file():
        return None
    text = io.open(path, encoding="utf-8", newline="").read()
    pat = (r"window\.(%s)\s*=\s*(?=[\[{])" % re.escape(var)) if var \
        else r"window\.([A-Za-z_0-9]+)\s*=\s*(?=[\[{])"
    hits = list(re.finditer(pat, text))
    if not hits:
        return None
    m = hits[-1] if last else hits[0]
    raw = slice_container(text, m.end())
    if raw is None:
        return None
    return parse_or_salvage(raw, path.name)


def read_appended_rows(path: Path, var_name: str = "rows"):
    """Read `var rows = [...]` out of an append-only continuation file
    (usage-log-current.js), which pushes into a global rather than assigning."""
    if not path.is_file():
        return None
    text = io.open(path, encoding="utf-8", newline="").read()
    m = re.search(r"var\s+%s\s*=\s*(?=\[)" % re.escape(var_name), text)
    if not m:
        return None
    raw = slice_container(text, m.end())
    return parse_or_salvage(raw, path.name) if raw else None
