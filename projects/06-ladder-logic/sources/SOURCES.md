# 06 Ladder logic interpreter. Sources.

Citations only. No copyrighted document is reproduced or redistributed here, including the ones that
are free to download. Where a source is free, the link goes to the publisher so you fetch it from them.

Each entry says how far it was actually verified, and separately whose copy was read. **Source phase
completed 2026-07-20.** This project reuses two primaries that project 04 already traced, for the same
elements, so nothing here was sourced from scratch: the 86 latch behaviour and the 25 advance angle.
The provenance caveats travel with them and are stated below.

## Source audit

Levels, strongest first: **TRACED** (read, and figures or data traced out) · **READ IN FULL** ·
**FETCHED, NOT READ** · **LOCATED ONLY** · **CITED, UNREAD** · **GATED, UNREAD**. Read at: **PUBLISHER**
(the organization that wrote it served the file) · **MIRROR** (anyone else's copy) · **NONE**.

| Source | Level | URL | Read at |
|---|---|---|---|
| GE Multilin 850 Feeder Protection System Instruction Manual v2.0x (2017), Non-volatile Latches (Reset Dominant truth table), p4-414 | TRACED | https://docs.ips.us/docs/W1002150.pdf | MIRROR |
| SEL, Fundamentals and Advancements in Generator Synchronizing Systems (M. J. Thompson, 2012), advance-angle worked example, p5 | TRACED | https://cms-cdn.selinc.com/assets/Literature/Publications/Technical%20Papers/6459_FundamentalsAdvancements_MT_20120402_Web2.pdf | PUBLISHER |
| IEEE C37.2, Electrical Power System Device Function Numbers | GATED, UNREAD | none | NONE |

## The 86 latch: the verified anchor

**GE Multilin 850 Instruction Manual, "Non-volatile Latches," p4-414 (PDF p546), Reset Dominant.** The
850 does not label an element "86," and that distinction is kept rather than smoothed: a device 86
lockout relay IS a latch, and the 850's Non-volatile Latch is the latch primitive the manual documents.
GE's stated purpose for it is the lockout function: the flag "is stored safely and does not reset when
the relay reboots after being powered down," typically used to "permanently block relay functions ...
until a deliberate HMI action resets the latch."

The published Reset Dominant truth table gives the four behaviours the interpreter reproduces in
`build/rungs.js` and asserts in `verify/verify.js` section A:

| SET | RESET | Latch output |
|---|---|---|
| On | Off | On |
| Off | Off | Previous State (HELD) |
| On | On | Off (reset wins a simultaneous set) |
| Off | On | Off |

Plus the nonvolatile property: the latch survives a power down, which is exactly what a hand reset
lockout relay does.

**Provenance, and why a MIRROR is low risk for this one.** This is read at the `docs.ips.us` distributor
mirror, at v2.0x (2017). GE currently ships v4.3x (2026), login walled and unread. What is cited is a
LOGIC PRIMITIVE, a reset dominant nonvolatile set/reset latch, not a tuned setpoint. A latch truth
table is a definition, not a number a firmware revision retunes, so the stale revision risk that
applies to a default value does not apply to this table in the same way. It is still a mirror and is
labelled so.

## The 25 advance angle: one sourced worked example

**SEL, "Fundamentals and Advancements in Generator Synchronizing Systems" (M. J. Thompson, 2012), p5**,
read at the SEL CDN. The page publishes the slip compensated advance angle and a worked value: "using
0.05 Hz slip and a breaker close delay of 5 cycles, the advanced angle would be 1.5 degrees." The
formula is advance angle = slip x 360 x CBCT (breaker close time in seconds). Recomputed here:
0.05 x 360 x (5/60 s) = 1.5 deg exactly, and slip as a rate is 0.05 x 360 = 18 deg per second, which
the same page also states. Two published numbers, both reproduced (section C).

This is shown as its own panel and is NOT wired into a defaulted "in sync" verdict. No relay publishes a
factory default for the sync check window that was read at a current publisher copy (defaults live in
the full instruction manuals, which SEL, Beckwith and Basler all gate), so the tool quotes the worked
example and refuses to manufacture a defaulted verdict. See project 04's SOURCES.md for the measured
ten times divergence between two SEL product lines on the slip range, which is why no single default is
shown.

## What this interpreter is NOT allowed to claim

- **It does not reproduce a factory close permissive scheme.** The 86 latch table and the 25 advance
  angle are reproductions of published values. The close permissive that combines them (86 clear AND 25
  ok AND spring charged AND no 50 or 51 trip) is THIS tool's own construction from those named elements.
  No manual publishing a full close permissive truth table was read, so `VENDOR_SCHEMES` is empty and
  `factoryPermissive()` throws. Section F asserts that refusal and greps the build for it.
- **It ships no relay default setting as fact.** The only relay default in the sources is the GE 850
  v2.0x sync default, read on a stale mirror. It is not presented as a setpoint; section F greps to keep
  it out.
- **It claims no conformance to IEEE C37.2 or any gated standard.** Device numbers follow C37.2
  convention, which every manufacturer manual uses without reproducing the standard's table. C37.2 is
  cited by number only.

## Known gaps, stated rather than hidden

- **The close permissive is not a reproduction**, it is self consistent boolean logic (section B).
  Verified as a truth table over all 32 inputs with every input shown to gate, but not against a
  published permissive. If a vendor's full scheme is ever read at the publisher, it becomes a section A
  style reproduction and `VENDOR_SCHEMES` stops being empty.
- **The GE 850 is read on a distributor mirror**, current revision unread. Low risk for the latch
  primitive, stated above.
- **Only one 25 worked example is traced.** A second vendor's independent example would further de risk
  section C and has not been done.
- **IEEE C37.2 was never read.** Gated. Device number meanings rest on industry convention.
