# 10. Three phase sandbox

Phasors, wye against delta, line against phase voltage and current, per unit, and symmetrical fault current basics.

> **Educational. Not for field use.** This tool reproduces published worked examples so they can be
> explored interactively. It is not a substitute for an engineered study, the manufacturer's
> instructions, or a qualified person on site.

## Status

See `PROGRESS.log`. It is the source of truth for this project.

## Verify against

Two published worked examples, reproduced to the book's printed precision (`node verify/verify.js`):

- **DOE-HDBK-1011/3-92**, ES-09 "Basic AC Power" (public domain, read at energy.gov). Line vs phase and
  the power triangle, Examples 1 (delta) and 2 (wye): V_line 415.2 V, I_line 346 A, P_T 64.6 kW, Q_T
  210.7 kVAR, S_T 263.4 kVA, and the rest of the nine printed answers. One published inconsistency in
  Example 1's P_T (158.2 kW printed vs 158.0 from the book's own shown factors) is reproduced and
  disclosed, not reconciled.
- **TM 5-811-14**, Appendix G, Example 5 (US Army, read at a mirror). Per-unit conversion, base current
  2405.6 A, and the symmetrical fault at MP 4: 9661 / 9434 / 9252 A (I_base / Z_pu).

See `sources/SOURCES.md` for the audit and the mirror provenance.

## Layout

    sources/   authoritative references, cited
    verify/    the published worked examples this must reproduce
    build/     the app

## Build log

Reproduces the two examples above out of one dual node/browser engine, with a hand-rolled SVG phasor
diagram. It does the arithmetic the books do and refuses the things they do not publish: it will not
reduce a one-line to its per-unit impedance (that is the engineered study; `reduceNetwork()` throws),
ships no equipment rating or "your gear is rated" verdict, and claims no standards conformance. 41
verify checks, 17 mutants all dead (8 of them assert the refusals). Not for field use.
