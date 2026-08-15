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
    return json.loads("".join(out))


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
    return tolerant_parse(raw)


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
    return tolerant_parse(raw) if raw else None
