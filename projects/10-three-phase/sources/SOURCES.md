# 10 Three-phase sandbox. Sources.

Citations only. No copyrighted document is reproduced or redistributed here, including the ones that
are free to download. Where a source is free, the link goes to the publisher so you fetch it from them.

Each entry says how far it was actually verified, and separately whose copy was read. **Source phase
completed 2026-07-20.** Both worked examples were rendered from the PDF and read by eye at high
magnification before any number became an answer key.

## Source audit

Levels, strongest first: **TRACED** (read, and figures or data traced out) · **READ IN FULL** ·
**FETCHED, NOT READ** · **LOCATED ONLY** · **CITED, UNREAD** · **GATED, UNREAD**. Read at: **PUBLISHER**
(the organization that wrote it served the file) · **MIRROR** (anyone else's copy) · **NONE**.

| Source | Level | URL | Read at |
|---|---|---|---|
| DOE-HDBK-1011/3-92, Electrical Science Vol 3, Module 9 "Basic AC Power" (ES-09), THREE-PHASE CIRCUITS: eqs 9-5..9-11 and Examples 1 (delta) and 2 (wye), p ES-09-20..23 | TRACED | https://www.energy.gov/sites/default/files/2026-04/DOE-HDBK-1011-92_VOL3.pdf | PUBLISHER |
| TM 5-811-14, Coordinated Power Systems Protection (US Army), Appendix G, Example 5 (impedance diagram and short-circuit calculation), G-27..G-29 | TRACED | https://electricalconnects.com/frontend/images/design_items/coordinated-power-systems-protection.pdf | MIRROR |

## The line/phase and power triangle: the publisher-verified anchor

**DOE-HDBK-1011/3-92, ES-09, section THREE-PHASE CIRCUITS.** Public domain (a U.S. Department of Energy
Fundamentals Handbook, Distribution Statement A), read at energy.gov. The fetched file was byte-identical
across two independent GETs, and a text scan of the whole volume found zero copyright/permission/reprint
markers.

The published relations (p ES-09-20) and two worked examples (p ES-09-21..23) are reproduced in
`build/engine.js` and asserted in `verify/verify.js` section A:

- delta: `V_L = V_phase` (9-5), `I_L = root3 * I_phase` (9-6); wye: `V_L = root3 * V_phase` (9-7),
  `I_L = I_phase` (9-8); `P_T = root3 * V_L * I_L * cos(theta)`, `S_T = root3 * V_L * I_L`,
  `Q_T = root3 * V_L * I_L * sin(theta)`.
- Example 1 (delta): I_phase 200 A, V_phase 440 V, PF 0.6 lagging → V_L 440 V, I_L 346 A, P_T 158.2 kW,
  Q_T 210.7 kVAR, S_T 263.4 kVA.
- Example 2 (wye): I_phase 100 A, V_phase 240 V, PF 0.9 lagging → V_L 415.2 V, P_T 64.6 kW, Q_T 31.3 kVAR,
  S_T 71.8 kVA.

**A documented source inconsistency, reported not reconciled (03's lesson).** DOE computes with the
square root of three rounded to 1.73. Example 1's printed P_T is **158.2 kW**, but the factors the book
itself shows, `(1.73)(440)(346)(0.6)`, give **158.0 kW**, and its own S_T (263.4 kVA) times cos(theta)
0.6 is 158.0 too. The 158.2 corresponds to full-precision root three, so within one example the book
rounded root three two ways. The tool reproduces both values, isolates the cause as the rounding, and
discloses it on screen; it does not quietly print one and hide the other. See `build/data.js`
`DOE_PT_ANOMALY` and section A of the verify.

## The per-unit and symmetrical fault: one sourced worked example

**TM 5-811-14, Appendix G, Example 5 "Impedance diagram and short-circuit calculation," G-27..G-29.**
Base 2000 kVA; base kV 12.47 / 4.16 / 0.480. Reproduced in section C:

- Per-unit conversion lines (published input → published pu): utility `X_u1 = 2000/500000 = .004` (G-17),
  generator `X"_G1 = (.2)(2000)/1250 = .32` (G-18) and `X'_G1 = (.35)(2000)/1250 = .56` (G-19),
  transformer `X_T1 = (.08)(2000)/20000 = .008` (G-21).
- Base current at the 480 V zone: `I_base = 2000 / (root3 * 0.480) = 2405.6 A`.
- Symmetrical fault at the MP 4 bus: `I"sc = 2405.6/.249 = 9661 A`, `I'sc = 2405.6/.255 = 9434 A`,
  `Isc = 2405.6/.26 = 9252 A` (Figure G-21).

**Provenance, and why this is a MIRROR.** The publisher copy was not reachable: the WBDG asset returned
HTTP 403 and DTIC was rate-limited, so the file read is the electricalconnects.com copy. It is a genuine
Army document — Appendix G's pages are captioned "US Army Corps of Engineers" and carry no reprint marker
(the manual's one "Reprinted with permission from ANSI/IEEE Standard 242-1986" is on p4-3, in the
coordination-interval section, nowhere near Appendix G), so Example 5 is the Army's own public-domain
content. The stale-revision risk (#18) is low here: this is a per-unit METHOD and its arithmetic, not a
firmware setpoint that a revision retunes, and every published division was recomputed and reproduces.
It is still a mirror, and it is labelled one on screen and in section F.

## What this sandbox is NOT allowed to claim

- **It does not reduce a network to its per-unit impedance.** TM Example 5 does that reduction (Figure
  G-21) and PUBLISHES the reduced 0.249 / 0.255 / 0.26 pu at MP 4; this tool reproduces the published
  division `fault = I_base / Z_pu` and takes the reduced pu as published. `engine.reduceNetwork()` throws.
  A wrong Z_pu makes the fault current wrong, and that reduction is the engineered study.
- **It ships no equipment interrupting or withstand rating, and no "your gear is rated" verdict.** It
  touches fault math, so it carries the not-for-field-use banner (guardrail 1). Section F greps the build
  to keep any such verdict out.
- **It claims no conformance to IEEE, IEC, ANSI, NEC or NFPA.** None was read.

## Known gaps, stated rather than hidden

- **The network reduction is not reproduced**, only the published division and four per-unit lines. If a
  future session traces the full reduction at the publisher, it becomes a section-C style reproduction.
- **TM 5-811-14 is read on a mirror**; the .mil/WBDG copy was not reachable. Low stale-revision risk for
  a method, stated above, but still a mirror.
- **Only four of TM's per-unit conversion lines are reproduced.** The transformer/motor lines whose
  equipment kVA could not be read unambiguously from the source were left out rather than guessed (#10).
- **The DOE balanced-load current example (I_L = 3.5 A, I_N = 0) is not encoded.** Its printed answer was
  not read at the source in this pass; only Examples 1 and 2 were traced.
