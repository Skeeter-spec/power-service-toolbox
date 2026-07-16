# 03 ATS sequence simulator. Sources.

Citations only. No copyrighted document is reproduced or redistributed here, including the ones that
are free to download. Where a source is free, the link goes to the publisher so you fetch it from them.

Each entry says how far it was actually verified. **The blocking gap is closed.** The primary was
fetched from the manufacturer's own download server and diffed against the distributor's mirror this
project had been reading. The diff found a revision gap, and what it found is below.

## Source audit

Levels, strongest first: **TRACED** (read, and figures or data traced out) · **READ IN FULL** ·
**FETCHED, NOT READ** · **LOCATED ONLY** (URL resolves, content unverified) · **CITED, UNREAD**
(named by number, never opened) · **GATED, UNREAD** (paywalled, no content used).

| Source | Level | URL | Read at |
|---|---|---|---|
| ASCO Group 5 Controller User's Guide, 381333-126 **N** (09/2018), 7000 Series. THE PRIMARY. Fetched from the manufacturer's own download server, tables read as rendered images | TRACED | https://download.schneider-electric.com/files?p_Doc_Ref=ASC-TS-UM-G5CTRL-40007000&p_enDocType=User+guide&p_File_Name=381333-126.pdf | PUBLISHER |
| ASCO Group 5 Controller User's Guide, 381333-126 **K** (2004), 4000 & 7000 Series. SUPERSEDED. Kept deliberately: it is the revision this project read first, and diffing the two is the finding below | TRACED | https://irp-cdn.multiscreensite.com/d9391e9e/files/uploaded/499_-_Asco_7000_Series_Operators_Manual-381333_126K-5-3.pdf | MIRROR |
| Russelectric Model 2000 Automatic Transfer Control System manual, Manual 5 Rev. 15 | TRACED | https://cigroup-us.com/wp-content/uploads/2023/02/Russelectric-Model-2000-Operators-Manual.pdf | MIRROR |
| ASCO 7000 Series Operator's Manual, 260/400/600A, 381333-283B | READ IN FULL | https://cigroup-us.com/wp-content/uploads/2019/09/ASCO-7000-Series-260-400-600A-Operator-Manual.pdf | MIRROR |
| Cummins Power Generation, The 10 second start: NFPA 110 Type 10 starting requirements (Power Topic 5675) | READ IN FULL | https://www.cummins.com/sites/default/files/2019-03/PowerHour_NFPA110.pdf | PUBLISHER |
| ASCO Group 5 Controller User's Guide, the manufacturer's landing page (a LANDING PAGE, not the document: it serves HTML and links the PDF above) | LOCATED ONLY | https://www.se.com/us/en/download/document/ASC-TS-UM-G5CTRL-40007000/ | PUBLISHER |
| Eaton ATC-300+ Operation and Maintenance Manual, IM05805022K | CITED, UNREAD | https://www.eaton.com/content/dam/eaton/products/safety-security-emergency-communications/fire-pump-controllers/documents/im05805022k-atc-300-plus-op-manual-en.pdf | PUBLISHER |
| NFPA 110, Standard for Emergency and Standby Power Systems | GATED, UNREAD | https://www.nfpa.org/codes-and-standards/nfpa-110-standard-development/110 | PUBLISHER |

---

## Primary, and the one this project verifies against

**ASCO Group 5 Controller User's Guide, part 381333-126 N**, dated 09/2018, for 7000 Series automatic
transfer switches. Free, no login.

> Verified: the 36 page PDF was fetched from `download.schneider-electric.com` (HTTP 200, zero
> redirects, no cross host hop) and the sequence and settings sections read. Its metadata is a
> manufacturer's own production chain, not a re-render: title `Microsoft Word - 381333-126N`, an
> employee author ID, Distiller 19. **Every table quoted below was read as a rendered image at 3x,
> not scraped from the text layer.** That was not ceremony: the text layer misreported two things
> here, and both are corrected below.

Why this document: like WP75 for project 01, it publishes **both the sequence and its own stated
verdict on that sequence**. Most ATS literature publishes a marketing claim ("reliable transfer") with
no number in it, which cannot be verified against anything. This one states a numeric pass criterion,
verbatim, on manual page 25 (Rev K printed the same sentence on its page 4-4):

> "Three criteria must be met for the sources to be considered in-sync. The phase difference between
> the sources must be less than 5 degrees, the frequency difference must be less than 0.2 Hz, and the
> voltage difference must be less than 5%."

That is a published, numeric, pass or fail verdict a simulator can be checked against. It also
publishes a full timer table with **both defaults and adjustable ranges** (Rev N page 9), separate
sequence narratives for all three transition types (open, closed, delayed), and the voltage and
frequency pickup and dropout table (Rev N page 7).

Selected values, **as printed in Rev N and read off the rendered page**, each with its ASCO feature
number:

- Feature 1C, override momentary normal source outages: default 1 second, range 0 to 6 sec.
- Feature 1F, override momentary emergency source outages: default 0, range 0 to 60 min 59 sec.
- Feature 2B, transfer to emergency: default 0, range 0 to 60 min 59 sec.
- Feature 2E, unloaded running (engine cooldown): default 5 minutes, range 0 to 60 min 59 sec.
- Feature 3A, retransfer to normal: default 30 minutes if normal fails (range 0 to 60 min 59 sec),
  30 seconds if just a test (range 0 to 9 hours 59 min 59 sec).
- In sync time delay, 7ACTS/7ACTB only: default 1.5 seconds, range 0 to 3.0 sec.
- Failure to synchronize, 7ACTS/7ACTB only: default 5 minutes, range 0 to 5 min 59 sec.
- Delay transition time, 7ADTS/B only: default 3 seconds, range 0 to 5 min 59 sec.
- In phase monitor time delay, 7ATS/7ATB only: default 1.5 second, range 0 to 3.0 sec.
- Normal source: voltage dropout 85% (range 70 to 98%), voltage pickup 90% (range 85 to 100%),
  frequency dropout 90% (85 to 98%), frequency pickup 95% (90 to 100%).
- Emergency source: voltage dropout 75% (range 70 to 98%), voltage pickup 90% (range 85 to 100%),
  frequency dropout 90%, frequency pickup 95%.

**Not in this list on purpose: the closed transition extended parallel time.** It was in this list
until the publisher's copy was read, and cutting it is the whole return on fetching the document. See
the revision diff below.

A second vendor, **Russelectric Model 2000**, was traced independently as a cross check. Its numbers
differ (engine start override 3 sec vs ASCO's 1 sec; retransfer 300 sec vs ASCO's 30 min) but its
structure agrees. That divergence is itself worth encoding: **the simulator must not present one
vendor's defaults as "the" ATS defaults.** It names the vendor whose sequence it is running.

## The revision diff. What fetching it from the manufacturer actually bought

This project spent a phase blocked on one sentence: *the copy that was read is a distributor's mirror,
not ASCO's own, and defaults are precisely what this project verifies against.* That gap is now closed,
and the answer was not the boring one.

**The mirror is Rev K, 2004, 32 pages, 4000 & 7000 Series. The manufacturer serves Rev N, 09/2018,
36 pages, 7000 Series only.** The project had been reading a revision that is fourteen years stale and
covers a product line the current document has dropped. Nobody would have noticed from inside Rev K:
it is a clean, unstamped, authentic ASCO file. **It is not a bad copy. It is a bad *revision*, and no
amount of reading it more carefully would have revealed that.** Only the publisher's shelf knows what
is current.

### What survived the diff, unchanged (K == N)

Every number this project intended to verify against. The in-sync criterion, verbatim and identical in
both. Timers 1C, 1F, 2B, 2E, 3A (both modes), in sync, failure to synchronize. The whole voltage and
frequency table: 85/90, 75/90, 90/95, and every adjustment range. The shed load in phase timer.

That matters, and it is the honest headline: **the mirror's numbers were right.** Fourteen years of
revisions did not move one default this project quotes.

### 🔴 What did NOT survive, and it was a live claim in this file

**The closed transition extended parallel time is no longer a published, adjustable setting.**

- **Rev K, table 2-4:** a settings row. `extended parallel time | 0.5 second | 0.100 to 1.000 sec |
  0.01 sec increments | CTTS TD XtdParallelTD`. A default and a user adjustable range.
- **Rev N, page 9:** **that row is gone from the table.** The narrative no longer says "the specified
  extended parallel time." It says "the specified **factory preset** extended parallel time" (pages
  26, 27, and the alarm text on page 6). ASCO took the number off the settings menu and out of the
  manual, and published no value for it.

This file previously stated, as fact: *"Closed transition extended parallel time, the published maximum
overlap: default 0.5 second, range 0.100 to 1.000 sec."* **Against the current document that claim is
false**, and it was the single most attractive number in the whole source for a simulator to expose as
a slider. An app shipping a 0.100 to 1.000 sec extended parallel control, citing "ASCO's published
range," would have been citing a 2004 revision the manufacturer has superseded, about the one parameter
that governs how long two live sources sit paralleled. It is cut.

### 🔴 The finding that inverts the rule this repo already had

**Rev N is WRONG where Rev K was RIGHT, on the voltage and frequency table.**

Rev K page 2-2 labels the frequency rows correctly: `Over Frequency Trip *`, display screens
`NORMAL FREQUENCY` and `EMERG FREQUENCY`. **Rev N page 7 regressed all of it**: the frequency block's
rows now read `Over Voltage Trip *` and their display screen column reads `NORMAL VOLTAGE` /
`EMERG VOLTAGE` while the asterisk footnote and the `OF Trip` screen names still say over *frequency*.
The values are untouched and correct. The labels broke.

Read as an image at 3x on both revisions, precisely because this is the class of thing a text layer
invents. It is real. This repo's rule is **read it at the publisher** (pattern 10). The rule is right,
and this is the first time it has been checked hard enough to find its own edge: *the publisher's
current copy is authoritative about what is current. It is not automatically the better document.*
Newer is not a synonym for correct. Both copies were kept above for exactly this reason.

### Method note

The manufacturer's URL this file carried was a **landing page**, not the document: `se.com/.../download/
document/...` serves 138 KB of HTML with the real PDF link inside it. Fetching it returns HTTP 200 and
`Content-Type: text/html`, which a careless check scores as success. A 200 is not a document. The
industrial-index repo learned the same thing on 12 of 17 rows; it is the same trap, and the fix is the
same: assert the content type, not the status code.

## Contradictions found in the primary, left unresolved on purpose

- **The manual disagrees with itself about the Shed Load in phase timer, and it has done so for
  fourteen years.** Its features table says 1.5 second; its narrative on the very next page says
  "TD - 3 second default time delay." **This survived the revision**: Rev K printed it on pages 2-6
  and 2-7, Rev N reprints it on pages 11 and 12, unfixed. **Do not build against this timer** without
  picking one and surfacing the discrepancy in the app.
  Sharpened by the diff, and this is the useful part: it is **not** general sloppiness in the table.
  The same Rev N narrative page states the In-Phase Monitor's "1.5 second is default setting" and
  *that* one agrees with its table exactly. One specific row disagrees with itself. A published
  document contradicting itself is a fact about the document, and this repo reports it rather than
  quietly picking whichever value is convenient.
- **ASCO's open transition in phase monitor publishes no phase angle window.** It publishes a time
  delay only (Rev N page 9, 7ATS/7ATB only). The numeric 5 degree window quoted above belongs to the
  **closed transition** in sync criterion, which is a different feature on different switch models. Do
  not transplant the number across. The app must not claim an angle for the open transition monitor.
  Rev N tightens this: its own table now marks the in sync rows `7ACTS, 7ACTB only` and the in phase
  monitor `7ATS or 7ATB`, so the manual itself says these are different switches.
- **Russelectric's sync check scope is ambiguous.** Its manual publishes a window (5 to 20 degrees,
  5 to 20% voltage, 0.2 Hz slip, factory set at 20) but presents it as a general parameter setup item
  without tying it to a named closed transition model the way ASCO ties its features to specific
  switch types. Treat as a lead, not a confirmed closed transition spec.

## Deliberately not used

- **Every Eaton ATC-300+ number.** UNVERIFIED. Four fetch attempts failed (two timeouts, a connection
  reset, one more timeout) and the document was never opened. The values seen came from a search
  engine's synthesized summary. This matters more than it looks: **Eaton is the vendor that actually
  uses the TDNE / TDES / TDEN names**, so the tempting move is to label the simulator's timers with
  Eaton's acronyms while using ASCO's traced numbers. That would be a fabricated pairing. Either fetch
  the Eaton manual, or use ASCO's own feature names (1C, 2B, 2E, 3A) and cite ASCO.
- **NFPA 110's text or tables.** Standing repo guardrail: cite and link, never reproduce. The
  10 second Type 10 figure reaches this repo only through Cummins's free white paper, which is a
  manufacturer's paraphrase and analysis, not NFPA's words. Fine as narrative motivation. **Do not
  present the 10 seconds as verbatim NFPA 110 text.** It is not.

## Known gaps, stated rather than hidden

- **The extended parallel time has no published value in the current revision.** Rev N calls it
  "factory preset" and prints no number. The 0.5 sec / 0.100 to 1.000 sec figures exist only in a
  superseded revision. **The app must not expose an extended parallel control with a sourced range.**
  It can name the parameter, say ASCO factory presets it, and stop there. If a number is wanted, it
  has to come from a current ASCO document that prints one, and none has been found.
- **What Rev L and Rev M changed is unknown.** The diff is K to N across fourteen years. Which of the
  intervening revisions dropped the extended parallel row, and whether ASCO said why, was not
  established. Only the endpoints were read. Do not narrate the change as if its history is known.
- **Whether the Rev N frequency label regression is fixed in a later revision is unknown.** Rev N,
  09/2018, is what the manufacturer serves today (fetched 2026-07-16).
- **The 4000 Series is out of scope of the current document.** Rev N covers 7000 Series only. Rev K's
  4000 Series feature codes (4ATS, 4ACTS, 4ADTS) are gone from it. If the sim ever claims to model a
  4000 Series switch, it is citing a superseded manual and must say so.
- **Kohler, Generac, Zenith, Caterpillar and Cummins ATS manuals were not searched at all.** Two
  vendors is enough to prove the numbers are vendor specific; it is not enough to claim the simulator
  generalizes. Do not claim it does.
- **NFPA 110 is gated and unread.** No content from it is used.
- **The Russelectric and 381333-283B rows are still MIRROR reads, and neither has had the treatment
  the primary just got.** Russelectric is load bearing for exactly one claim, that vendors' defaults
  differ, and that claim now rests on a mirror of unknown revision. It is a cross check, not the
  primary, so it does not block. It is also, on this evidence, the next thing that would fail.
- **Link rot is unaddressed.** The two ASCO URLs and the se.com landing page resolved on 2026-07-16.
  The rest resolved on 2026-07-15. Re fetch at build time.
