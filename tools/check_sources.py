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

RULE 4, ADDED AFTER IT BIT: "READ AT" IS A SEPARATE AXIS FROM "HOW FAR YOU READ"

The level says how DEEPLY a document was read. It says nothing about WHOSE COPY was read, and those
are independent. 02 recorded its primary as TRACED, which was true (the equation was rendered at 9x
and all 210 published cells recomputed off it), while the prose claimed it was "read at the
publisher's own PDF", which was FALSE: docs.ips.us is a distributor's document store, the cover says
"Courtesy of store.ips.us", and every one of the 562 pages was re-rendered by the distributor's PDF
tool. The level was honest and the provenance was fiction, and nothing here could tell the difference
because there was no field for it.

That was not one project's slip. Adding the field surfaced the same thing in THREE of four projects:
02 and 04 both trace the GE 850 at a distributor, 04 and 02 both trace SEL at a university course
handout, and 03 traces an ASCO manual at a website builder's CDN while listing the manufacturer's own
copy one row below, graded CITED, UNREAD. Only 01 reads its primary at the publisher.

This is the repo's own rule ("anything the verify phase rests on gets read at the publisher's PDF")
being written down and then not applied, twice, by the sessions that wrote it. A rule that lives in
prose is a wish. This is that rule as a field.

WHY A MIRROR IS A WARNING AND NOT A FAILURE

Making it fatal would be wrong and would backfire. Sometimes the publisher's copy genuinely cannot be
had: GE's own 850 download is login walled, and the version this repo reads (1.6x) is not offered by
GE at all any more. A gate that fails on that leaves two options, both bad: drop a good source, or
lie about where it came from. So a mirror is VISIBLE, not fatal. What IS fatal is failing to say.

Same two-tier shape as the rest of this repo: being WRONG fails, being INCOMPLETE shows. A gate that
is permanently red teaches people that red means nothing.
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

# WHOSE COPY was read. Independent of how far it was read.
PROVENANCE = {
    "PUBLISHER": "The organization that WROTE it served this file, on its own domain.",
    "MIRROR": "Anyone else's copy: a distributor, a university handout, a scan site, a CDN. "
              "Fine for LOCATING a document. Not evidence about its CONTENTS.",
    "NONE": "No URL at all (a paid standard cited by number). Nothing was read, so nothing was mirrored.",
}

# A mirror is only worth flagging when something RESTS on it. Nobody is misled by a LOCATED ONLY row
# pointing at a scan site; that row already says it proves nothing.
LOAD_BEARING = {"TRACED", "READ IN FULL"}

HEADING = "## Source audit"
URL_RE = re.compile(r"https?://[^\s)>\]|,]+")

# RULE 5, added 2026-07-17 after the failure it catches SHIPPED once. This file's own header (top of
# `check_one`'s story) describes 02's SOURCES.md claiming its rows were "read at the publisher" two
# lines above a distributor URL. The fix was the `Read at` COLUMN. But a COLLECTIVE PROSE SENTENCE
# ("the top three rows were read directly at the publisher's own PDF") was never checked, and on
# 2026-07-17 exactly that shipped in 04's SOURCES.md three lines above its own table showing two of
# those rows were MIRRORs. The gate was green; a human eye caught it. That is the #29 lesson (when
# you replace a prose claim with a checked field, DELETE the prose) as a gate rule.
#
# ⚠ SCOPED, NOT REWORDED (per the "re-scope, don't silence" rule). It fires only on a COLLECTIVE
# claim (the top N rows / all rows / both) that the rows were read at the publisher, AND only when a
# load-bearing row actually says MIRROR/NONE, AND NOT inside a retraction (a corrected file quotes
# the old false line on purpose, which must stay silent). Measured against all six real SOURCES.md:
# zero false positives, including 04's own correction; fires on the induced 04 shape.
PUBLISHER_CLAIM_RE = re.compile(
    r"(the top \w+ rows|all (?:the )?rows|both (?:were|rows)|every row|these rows)"
    r"[^.]{0,60}read[^.]{0,40}(?:at|directly at)[^.]{0,40}publisher", re.I)
RETRACTION_RE = re.compile(
    r"used to say|previously said|correct(?:ed|ion)|was (?:wrong|false)|no longer|struck|❌|🔴", re.I)


def audit_rows(t):
    """The audit table's data rows: the FIRST contiguous run of table lines after the heading.

    The old version took every "|" line in the rest of the file, which silently swallowed any LATER
    table as if its rows were audit rows. 01 has no second table so it never showed; 02 has two (a
    curve family comparison and a transcription comparison) and every one of their rows was reported
    as a malformed citation with a bogus level. That pushes a SOURCES.md toward containing no table
    but this one, in a repo whose whole thesis is showing your work.

    Both the checker AND the "(n sources)" summary read the window from here. They used to compute it
    separately, so the fix landed in the checker while the summary went on counting every "|" in the
    file and cheerfully reported "21 sources" for an 11 row table. One window, one answer.

    Rule 3 in check_one still scans the FULL file text for URLs, so narrowing this window does not
    narrow the audit.
    """
    if HEADING not in t:
        return None
    rows, seen_table = [], False
    for line in t.split(HEADING, 1)[1].splitlines():
        if line.strip().startswith("|"):
            seen_table = True
            rows.append(line)
        elif seen_table:
            break  # first non-table line after the table ends it
    rows = [r for r in rows if not re.match(r"^\s*\|[\s|:-]+\|\s*$", r)]  # drop separator
    return rows


def check_one(path):
    """Returns (errors, warnings). Errors fail the gate; warnings are printed and do not."""
    t = path.read_text()
    errs, warns = [], []

    rows = audit_rows(t)
    if rows is None:
        return [f"no '{HEADING}' table. Every SOURCES.md needs one."], []
    if len(rows) < 2:
        return [f"'{HEADING}' table has no rows."], []
    body = rows[1:]  # drop header

    audited_urls = set()
    for r in body:
        cells = [c.strip() for c in r.strip().strip("|").split("|")]
        if len(cells) < 4:
            errs.append(f"malformed row (need Source | Level | URL | Read at): {r.strip()[:70]}")
            continue
        source, level, url, prov = cells[0], cells[1], cells[2], cells[3]

        lvl = re.sub(r"[*`]", "", level).strip().upper()
        if lvl not in LEVELS:
            errs.append(f"'{source[:40]}' has level '{level}' which is not a real level.\n"
                        f"          Use one of: {', '.join(LEVELS)}")

        # RULE 4. Saying nothing is the failure. Saying MIRROR is fine.
        pv = re.sub(r"[*`]", "", prov).strip().upper()
        if pv not in PROVENANCE:
            errs.append(f"'{source[:40]}' has 'Read at' = '{prov}', which is not a real provenance.\n"
                        f"          Use one of: {', '.join(PROVENANCE)}\n"
                        f"          This field is separate from the level: it says WHOSE COPY you read.")
        elif pv == "MIRROR" and lvl in LOAD_BEARING:
            warns.append(f"{lvl} at a MIRROR: {source[:64]}\n"
                         f"             {url[:76]}\n"
                         f"             Fine for locating a document, not evidence about its contents.\n"
                         f"             If anything RESTS on this, read it at the publisher or say why you cannot.")
        elif pv == "NONE" and URL_RE.search(url):
            errs.append(f"'{source[:40]}' says 'Read at: NONE' but has a URL. If a copy was reachable, "
                        f"say whose it was.")

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

    # RULE 5: a COLLECTIVE prose claim that the rows were read at the publisher, contradicted by a
    # load-bearing MIRROR/NONE row. Only fires when the table actually disagrees, and never inside a
    # retraction. See the header above PUBLISHER_CLAIM_RE.
    has_mirror_lb = any(
        re.sub(r"[*`]", "", c[3]).strip().upper() in ("MIRROR", "NONE")
        and re.sub(r"[*`]", "", c[1]).strip().upper() in LOAD_BEARING
        for c in ([x.strip() for x in r.strip().strip("|").split("|")] for r in body)
        if len(c) >= 4)
    if has_mirror_lb:
        for sent in re.split(r"(?<=[.!?])\s", t):
            if PUBLISHER_CLAIM_RE.search(sent) and not RETRACTION_RE.search(sent):
                errs.append(
                    "FALSE PROVENANCE PROSE: a sentence claims rows were read at the publisher, but "
                    "the table\n"
                    f"          shows a load-bearing MIRROR or NONE row. The table is the statement; "
                    "delete the prose.\n"
                    f"          > {sent.strip()[:90]}")
    return errs, warns


def main():
    files = sorted((ROOT / "projects").glob("*/sources/SOURCES.md"))
    if not files:
        print("  no SOURCES.md files yet (no project has reached `source`)")
        return 0
    bad = 0
    mirrors = 0
    for f in files:
        errs, warns = check_one(f)
        rel = f.relative_to(ROOT)
        if errs:
            bad += 1
            print(f"  FAIL {rel}")
            for e in errs:
                print(f"        - {e}")
        else:
            n = len(audit_rows(f.read_text())) - 1  # minus the header row
            print(f"  OK   {rel} ({n} sources, all with a stated level and provenance)")
        for w in warns:
            mirrors += 1
            print(f"        ⚠ {w}")

    if mirrors:
        # Printed once, at the end, so it reads as a standing condition of the repo rather than as
        # noise attached to one file. It is not a failure and it must not become invisible either.
        print(f"\n  {mirrors} load-bearing citation(s) read at a mirror. NOT a gate failure: sometimes the")
        print( "  publisher's copy is genuinely gated (GE's own 850 download is login walled, and the")
        print( "  version this repo reads is not offered there at all). Visible on purpose, so it stays a")
        print( "  known risk instead of an assumption. See each SOURCES.md for what was done about it.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
