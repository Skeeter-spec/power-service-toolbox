#!/usr/bin/env python3
"""Every citation must state how far it was actually verified.

    ./tools/check_sources.py        check every project's sources/SOURCES.md

WHY THIS EXISTS

This repo's entire claim is "I checked." That claim is worth exactly as much as the weakest citation
behind it, and the weakest citation is invisible in prose. "I read the full 27 page PDF and traced
the figures" and "I saw this URL in a search snippet" both render as a confident bullet with a link.

01's SOURCES.md drew that distinction honestly, but only because I happened to write it out in prose.
Nothing required it, so nothing would have noticed its absence. A research agent's default output is
confident prose, and a FABRICATED citation is undetectable downstream and lethal here.

So the level is a required field, and the audit table is machine checked. A source with no stated
level now fails the gate instead of passing as prose.

THE LOAD BEARING RULE IS #3 BELOW: every URL anywhere in the file must appear in the audit table.
Without it you could audit three sources, cite twelve, and pass.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Ordered strongest to weakest. Say which one it is; "roughly" is not a level.
LEVELS = {
    "TRACED": "Fetched, read, AND specific figures/data traced out. The strongest claim.",
    "READ IN FULL": "Fetched and read end to end.",
    "FETCHED, NOT READ": "Have the file, skimmed it. Do not build on details.",
    "LOCATED ONLY": "URL confirmed reachable. Content UNVERIFIED.",
    "CITED, UNREAD": "Named by number only, never opened (e.g. a paid standard).",
    "GATED, UNREAD": "Paywalled or login walled. Cannot access. No content used.",
}
HEADING = "## Source audit"
URL_RE = re.compile(r"https?://[^\s)>\]|,]+")


def check_one(path):
    t = path.read_text()
    errs = []

    if HEADING not in t:
        return [f"no '{HEADING}' table. Every SOURCES.md needs one."]

    # The table runs from the heading to the next blank-line-separated non-table line.
    tail = t.split(HEADING, 1)[1]
    rows = [l for l in tail.splitlines() if l.strip().startswith("|")]
    rows = [r for r in rows if not re.match(r"^\s*\|[\s|:-]+\|\s*$", r)]  # drop separator
    if len(rows) < 2:
        return [f"'{HEADING}' table has no rows."]
    body = rows[1:]  # drop header

    audited_urls = set()
    for r in body:
        cells = [c.strip() for c in r.strip().strip("|").split("|")]
        if len(cells) < 3:
            errs.append(f"malformed row (need Source | Level | URL): {r.strip()[:70]}")
            continue
        source, level, url = cells[0], cells[1], cells[2]
        lvl = re.sub(r"[*`]", "", level).strip().upper()
        if lvl not in LEVELS:
            errs.append(f"'{source[:40]}' has level '{level}' which is not a real level.\n"
                        f"          Use one of: {', '.join(LEVELS)}")
        for u in URL_RE.findall(url):
            audited_urls.add(u.rstrip("."))
        if not URL_RE.search(url) and url.lower() not in ("none", "n/a", "-", "(none)"):
            errs.append(f"'{source[:40]}' has no URL and does not say why (use 'none' for a paid standard)")

    # RULE 3, the load bearing one: no URL may appear in the prose without being audited.
    for u in {u.rstrip(".") for u in URL_RE.findall(t)}:
        if u not in audited_urls:
            errs.append(f"UNAUDITED CITATION: {u[:78]}\n"
                        f"          It appears in the prose but has no row in the audit table.\n"
                        f"          Every citation states its verification level, or it does not ship.")
    return errs


def main():
    files = sorted((ROOT / "projects").glob("*/sources/SOURCES.md"))
    if not files:
        print("  no SOURCES.md files yet (no project has reached `source`)")
        return 0
    bad = 0
    for f in files:
        errs = check_one(f)
        rel = f.relative_to(ROOT)
        if errs:
            bad += 1
            print(f"  FAIL {rel}")
            for e in errs:
                print(f"        - {e}")
        else:
            n = len([l for l in f.read_text().split(HEADING, 1)[1].splitlines()
                     if l.strip().startswith("|")]) - 2
            print(f"  OK   {rel} ({n} sources, all with a stated verification level)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
