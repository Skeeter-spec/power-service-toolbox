# 04 Relay bench. Sources.

Citations only. No copyrighted document is reproduced or redistributed here, including the ones that
are free to download. Where a source is free, the link goes to the publisher so you fetch it from them.

Each entry says how far it was actually verified. **This project's source phase is deliberately still
`wip`**: devices 50, 51 and 87 are sourced to primaries, and devices 25 and 86 are not. That split is
stated here rather than smoothed over, because a bench that models seven devices to two different
standards of evidence is exactly the failure this repo exists to avoid.

## Source audit

Levels, strongest first: **TRACED** (read, and figures or data traced out) · **READ IN FULL** ·
**FETCHED, NOT READ** · **LOCATED ONLY** (URL resolves, content unverified) · **CITED, UNREAD**
(named by number, never opened) · **GATED, UNREAD** (paywalled, no content used).

| Source | Level | URL | Read at |
|---|---|---|---|
| GE Multilin 850 Feeder Protection System Instruction Manual | TRACED | https://docs.ips.us/docs/W1002151.pdf | MIRROR |
| SEL technical paper, Percentage Restrained Differential, Percentage of What? (M. J. Thompson) | TRACED | https://cms-cdn.selinc.com/assets/Literature/Publications/Technical%20Papers/6451_PercentageRestrained_MT_20140319_Web.pdf | PUBLISHER |
| SEL-351S Relay Instruction Manual (a separate curve family, and the relay accuracy spec) | TRACED | https://www.rose-hulman.edu/~rostamko/ece472/handouts/351S_Manual.pdf | MIRROR |
| CED Engineering, Introduction to Protective Device Coordination Analysis (V. Lackovic) | READ IN FULL | https://www.cedengineering.com/userfiles/Introduction%20to%20Protective%20Device%20Coordination%20Analysis-R1.pdf | PUBLISHER |
| TM 5-811-14 Ch.4, Protective Devices Coordination (US Army Corps of Engineers, public domain) | READ IN FULL | https://www.pdhonline.com/courses/e119/TM5-811-14-chap4.pdf | MIRROR |
| CED Engineering, Overcurrent Protection Fundamentals | FETCHED, NOT READ | https://www.cedengineering.com/userfiles/Overcurrent%20Protection%20Fundamentals-R1.pdf | PUBLISHER |
| SEL-387 Current Differential and Overcurrent Relay manual | CITED, UNREAD | https://selinc.com/api/download/292/ | PUBLISHER |
| Electrical Engineering Portal, sync check (ANSI 25) function | LOCATED ONLY | https://electrical-engineering-portal.com/generator-synchronizing-check-protective-function | PUBLISHER |
| IEEE C37.2, Electrical Power System Device Function Numbers | GATED, UNREAD | none | NONE |
| IEEE C37.112, Inverse Time Characteristic Equations for Overcurrent Relays | GATED, UNREAD | none | NONE |
| IEC 60255-151 | GATED, UNREAD | none | NONE |

The top three rows were read directly at the publisher's own PDF. Everything below is context or a
lead.

---

## Devices 50 and 51: the primary, and a verify phase that already exists

**GE Multilin 850 Feeder Protection System, Instruction Manual.** Free, no login. This project and
project 02 share it, which is the point: the toolbox interlocks, and 04's relay curves plot in 02's
engine.

It publishes the equation (manual p.4-115), the constants (Table 4-34), a 210 cell published trip
time table (Table 4-35), and a prose worked example with a stated answer (manual p.4-124):

> "if an IEEE Extremely Inverse curve is selected with TDM = 2, and the fault current is 5 times
> bigger than the PKP level, the operation of the element will not occur before 2.59 s have elapsed
> after Pickup."

Three representations inside one document agree: the prose says **2.59 s**, Table 4-35 at TDM=2.0 and
I/Ipickup=5.0 says **2.593**, and the equation with the published constants gives **2.5934**.

**Checked, not admired:** the published equation driven by the published constants reproduces **210 of
210** published table cells, worst error 0.135%, which is the table's own rounding to three decimals.
The verify phase for this project exists and is proven, before the bench is built.

**What the source does not give, and the bench must add.** The example is stated in multiples of
pickup (M = I/Ipickup = 5), not "primary fault amps, CT ratio, tap." The bench has to add that
translation itself (primary current, divide by CT ratio for secondary current, divide by tap for M).
That arithmetic is trivial, and it is **not** part of the verified example, so do not describe it as
verified. The curve math is what the 210 cells cover.

## What this bench is NOT allowed to claim

**Never "implements IEEE C37.112."** Two manufacturers invoke that standard, in their own words, over
different numbers. The GE 850 manual (p.4-115) says its curves "conform to industry standards and the
IEEE C37.112-1996 curve classifications." The SEL-351S manual (p.375) says its curves "conform to IEEE
C37.112-1996." Their printed constants are not the same. **C37.112 is gated and unread here**, so this
repo cannot adjudicate which is the standard's literal table.

Worse, the names collide across three separate curve families. The GE 850 manual alone ships **two**:
a three constant "IEEE" family (A, B, p) and a five constant "ANSI" family (A through E). Both contain
a row called "Extremely Inverse," and they are different equations. SEL's "US" curves are a third
family reusing the same labels again. **A label like "extremely inverse" does not identify a curve.**
Pick one family, name the manual it came from, and never mix labels across vendors.

This is project 01's tier rule firing again: 01 outputs no tier because a tier is awarded by a body
against a document this repo has not read. 04 outputs no standards conformance claim, for the same
reason. See `projects/02-tcc-coordination/sources/SOURCES.md` for the measured 5x divergence between
two families that both claim the same standard.

## Device 87: sourced, with a decision the bench must state

**SEL technical paper, "Percentage Restrained Differential, Percentage of What?"** by Michael J.
Thompson. Read in full. It gives the operate current definition, and **two competing restraint
definitions that real commercial relays actually use**:

- AVERAGE: `IRST = k x (|IW1| + |IW2| + ... + |IWn|)`
- MAXIMUM: `IRST = MAX(|IW1|, |IW2|, ..., |IWn|)`

Trip when IOP exceeds a minimum pickup AND IOP exceeds slope% x IRST. The paper publishes worked
numeric tables (its Table I: AVERAGE k=0.50 gives 32% minimum and 200% maximum; k=1.00 gives 16% and
100%; MAXIMUM gives 27% and 100%).

**The bench must pick ONE restraint definition and say so on screen.** The pass or fail verdict for
the same injected currents changes depending on which one is modelled. A differential element that
does not tell you which restraint it uses is not answerable, and this repo does not ship those.

## Devices 27 and 59: structure sourced, no worked example

The GE 850 manual publishes the generic setpoint structure these share (PICKUP, PICKUP DELAY, DROPOUT
DELAY), which is a definite time model. That is enough to build and to verify against its own stated
behaviour (does the output assert PICKUP DELAY after the threshold is crossed, does it de-assert after
DROPOUT DELAY). **No published numeric worked example was found for either device.** So the assertions
here are about timer behaviour, not about a sourced number, and the file says so rather than implying
parity with the 51 evidence.

## Device 25: NOT SOURCED. Do not build it yet.

This is the weakest link in the whole project and the honest state is that it has no primary. The one
candidate page returned HTTP 403 and was never read. Numeric ranges seen in a search engine's
synthesized summary (phase angle roughly 10 to 20 degrees, slip roughly 0.1 to 0.2 Hz, voltage
difference roughly 2 to 5%) are **UNVERIFIED and are not citation ready**. They are recorded here as a
lead and nothing more.

**The fix is already known and is cheap.** Project 03 traced a genuine published sync criterion from a
manufacturer's own manual, in its own words: phase difference under 5 degrees, frequency difference
under 0.2 Hz, voltage difference under 5%. See `projects/03-ats-sequence/sources/SOURCES.md`. That is
an ATS closed transition criterion rather than a relay sync check element, so it is not simply
transplantable, but it proves this class of number is publishable and findable. Fetch an SEL, GE,
Basler or Beckwith sync check application guide before building the 25 element.

## Device 86: no published example exists, and that is the correct answer

Device 86 is a latching auxiliary relay. It has no time current characteristic, so there is nothing to
compute and nobody publishes a numeric example of a latch. The behaviours to verify are that it
latches on any trip input, stays latched, and clears only on an explicit reset.

**Stated plainly: nothing about 86 was sourced from a document in this pass.** The description above is
domain knowledge, not a citation. It is low risk and it is still not evidence, so it is labelled.

## Deliberately not used

- **A third party blog's curve constants and worked example.** Checked and found to be internally
  inconsistent: its own stated exponent does not reproduce its own stated answer (its arithmetic only
  works if the exponent were 0.01, not the 0.02 the same page prints). A source that cannot reproduce
  its own example cannot be used for any constant. Not linked here, deliberately.
- **Any equation transcribed from a third party scan.** Two independent research passes each scraped
  the same SEL table from the same scan and returned two **different** wrong equations, neither
  matching the publisher's PDF. Both were physically absurd (they predict tripping in about 33 ms at
  exactly pickup, where the real curve is asymptotic). Details in project 02's SOURCES.md.

## Known gaps, stated rather than hidden

- **IEEE C37.2 was never read.** Gated. Device number meanings here rest on industry convention, which
  every manufacturer manual and single line diagram uses without reproducing C37.2's table. Per the
  standing guardrail this repo cites C37.2 by number and writes its OWN one line description of each
  device, exactly as the free CED Engineering course document independently does.
- **IEEE C37.112 and IEC 60255-151 were never read.** Both gated. Every constant here arrives through
  a manufacturer's reprint.
- **Only one vendor's worked example is traced.** A second vendor's independent prose example would
  further de risk device 51 and has not been done.
- **The GE "ANSI curves" equation form is unconfirmed.** The five constants were extracted from the
  text layer, but the equation image was not rendered and read the way the IEEE family's was. Do not
  build the ANSI family on this file.
- **Device 25 has no primary** and **device 86 has no source at all.** Repeated here so it survives a
  skim of this section.
