# 06. Ladder logic interpreter

Encode a real close permissive: 86 lockout clear, 25 sync check OK, spring charged, and no 50 or 51 trip. Verified against a truth table.

> **Educational. Not for field use.** This tool reproduces published worked examples so they can be
> explored interactively. It is not a substitute for an engineered study, the manufacturer's
> instructions, or a qualified person on site.

## Status

See `PROGRESS.log`. It is the source of truth for this project.

## Verify against

**GE Multilin 850 Instruction Manual, Non-volatile Latches, p4-414 (Reset Dominant truth table)**, and
the **SEL advance angle worked example (Thompson 2012, p5): 1.5 degrees.** The 86 latch truth table is
reproduced row for row; the 25 advance angle is reproduced to the published value. The close permissive
that combines the elements is this tool's own construction from named parts, verified as self
consistent boolean logic over all 32 inputs, not as a vendor scheme (none was sourced). See
`sources/SOURCES.md` and `verify/verify.js`.

## Layout

    sources/   authoritative references, cited
    verify/    the published worked example this must reproduce
    build/     the app

## Build log

2026-07-20  Built and verified locally. Source reuses project 04's two traced primaries (the GE 850
Non-volatile Latch table and the SEL advance angle example) for the same elements, so no new sourcing
was needed. 31 checks pass; 16 mutants, all killed. Section F refuses to name a factory permissive
scheme, keeps a stale GE default off screen, and claims no standards conformance. Not yet pushed.
