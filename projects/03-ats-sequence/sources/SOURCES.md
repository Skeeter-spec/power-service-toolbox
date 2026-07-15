# 03 ATS sequence simulator. Sources.

Citations only. No copyrighted document is reproduced or redistributed here, including the ones that
are free to download. Where a source is free, the link goes to the publisher so you fetch it from them.

Each entry says how far it was actually verified. **This project's source phase is deliberately still
`wip`** for one specific reason stated below: the primary was read at a distributor's mirror rather
than at the manufacturer, and this repo's whole claim is that it checked.

## Source audit

Levels, strongest first: **TRACED** (read, and figures or data traced out) · **READ IN FULL** ·
**FETCHED, NOT READ** · **LOCATED ONLY** (URL resolves, content unverified) · **CITED, UNREAD**
(named by number, never opened) · **GATED, UNREAD** (paywalled, no content used).

| Source | Level | URL | Read at |
|---|---|---|---|
| ASCO Group 5 Controller User's Guide, 381333-126K (read at a distributor's mirror, Rev K) | TRACED | https://irp-cdn.multiscreensite.com/d9391e9e/files/uploaded/499_-_Asco_7000_Series_Operators_Manual-381333_126K-5-3.pdf | MIRROR |
| Russelectric Model 2000 Automatic Transfer Control System manual, Manual 5 Rev. 15 | TRACED | https://cigroup-us.com/wp-content/uploads/2023/02/Russelectric-Model-2000-Operators-Manual.pdf | MIRROR |
| ASCO 7000 Series Operator's Manual, 260/400/600A, 381333-283B | READ IN FULL | https://cigroup-us.com/wp-content/uploads/2019/09/ASCO-7000-Series-260-400-600A-Operator-Manual.pdf | MIRROR |
| Cummins Power Generation, The 10 second start: NFPA 110 Type 10 starting requirements (Power Topic 5675) | READ IN FULL | https://www.cummins.com/sites/default/files/2019-03/PowerHour_NFPA110.pdf | PUBLISHER |
| ASCO Group 5 Controller User's Guide, the manufacturer's own download page | CITED, UNREAD | https://www.se.com/us/en/download/document/ASC-TS-UM-G5CTRL-40007000/ | PUBLISHER |
| Eaton ATC-300+ Operation and Maintenance Manual, IM05805022K | CITED, UNREAD | https://www.eaton.com/content/dam/eaton/products/safety-security-emergency-communications/fire-pump-controllers/documents/im05805022k-atc-300-plus-op-manual-en.pdf | PUBLISHER |
| NFPA 110, Standard for Emergency and Standby Power Systems | GATED, UNREAD | https://www.nfpa.org/codes-and-standards/nfpa-110-standard-development/110 | PUBLISHER |

---

## Primary, and the one this project verifies against

**ASCO Group 5 Controller User's Guide, part 381333-126K**, for 4000 and 7000 Series automatic
transfer switches. Free, no login.

> Verified: the 32 page PDF was fetched and the sequence and settings sections read. The load bearing
> sentence below was read directly out of the PDF text layer rather than taken on report.

Why this document: like WP75 for project 01, it publishes **both the sequence and its own stated
verdict on that sequence**. Most ATS literature publishes a marketing claim ("reliable transfer") with
no number in it, which cannot be verified against anything. This one states a numeric pass criterion,
verbatim, on manual page 4-4:

> "Three criteria must be met for the sources to be considered in-sync. The phase difference between
> the sources must be less than 5 degrees, the frequency difference must be less than 0.2 Hz, and the
> voltage difference must be less than 5%."

That is a published, numeric, pass or fail verdict a simulator can be checked against. It also
publishes a full timer table with **both defaults and adjustable ranges** (manual pages 2-4 and 2-5),
separate sequence narratives for all three transition types (open, closed, delayed), and the voltage
and frequency pickup and dropout table (manual page 2-2).

Selected values, as printed, each with its ASCO feature number:

- Feature 1C, override momentary normal source outages: default 1 second, range 0 to 6 sec.
- Feature 2B, transfer to emergency: default 0, range 0 to 60 min 59 sec.
- Feature 2E, unloaded running (engine cooldown): default 5 minutes, range 0 to 60 min 59 sec.
- Feature 3A, retransfer to normal: default 30 minutes if normal fails, 30 seconds if only a test.
- Feature 27, in phase monitor time delay (open transition only): default 1.5 second, range 0 to 3.0 sec.
- Closed transition extended parallel time, the published maximum overlap: default 0.5 second, range
  0.100 to 1.000 sec. Exceeding it raises an extended parallel output rather than paralleling on.
- Normal source: undervoltage dropout 85% (range 70 to 98%), undervoltage pickup 90% (range 85 to
  100%), underfrequency dropout 90%, underfrequency pickup 95%.
- Emergency source: undervoltage dropout 75%, undervoltage pickup 90%.

A second vendor, **Russelectric Model 2000**, was traced independently as a cross check. Its numbers
differ (engine start override 3 sec vs ASCO's 1 sec; retransfer 300 sec vs ASCO's 30 min) but its
structure agrees. That divergence is itself worth encoding: **the simulator must not present one
vendor's defaults as "the" ATS defaults.** It names the vendor whose sequence it is running.

## Why this project's source phase is still `wip`

**The copy that was read is a distributor's mirror, not ASCO's own.** The manufacturer's download page
was located but never fetched, so the two have not been compared. The mirror is labelled Rev K. A
different revision could carry different default values, and defaults are precisely what this project
verifies against. For a repo whose entire claim is "I checked," citing a third party rehost of a
document is the weak link.

Project 02 learned this the expensive way: two independent passes each scraped the same table from the
same third party scan and each returned a **different** wrong equation, neither matching the
publisher's PDF. See `projects/02-tcc-coordination/sources/SOURCES.md`. A mirror is fine for locating
a document and is not evidence about its contents.

**Before this project ships: fetch 381333-126K from the manufacturer's own page and diff it against
the mirror.** If the values agree, upgrade this row and cite the manufacturer's URL. If they disagree,
that is a finding.

## Contradictions found in the primary, left unresolved on purpose

- **The manual disagrees with itself about the Shed Load in phase timer.** Its settings table (p.2-6)
  says 1.5 sec; its narrative on the very next page (p.2-7) says "3 second default." **Do not build
  against this timer** without picking one and surfacing the discrepancy in the app. A published
  document contradicting itself is a fact about the document, and this repo reports it rather than
  quietly picking whichever value is convenient.
- **ASCO's open transition in phase monitor publishes no phase angle window.** It publishes a time
  delay only (Feature 27). The numeric 5 degree window quoted above belongs to the **closed
  transition** in sync criterion, which is a different feature on different switch models. Do not
  transplant the number across. The app must not claim an angle for the open transition monitor.
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

- **The manufacturer's own copy of the primary has not been fetched.** This is the blocking gap above.
- **Kohler, Generac, Zenith, Caterpillar and Cummins ATS manuals were not searched at all.** Two
  vendors is enough to prove the numbers are vendor specific; it is not enough to claim the simulator
  generalizes. Do not claim it does.
- **NFPA 110 is gated and unread.** No content from it is used.
- **Link rot is unaddressed.** Every URL above resolved on 2026-07-15 and has not been rechecked since.
  Re fetch at build time.
