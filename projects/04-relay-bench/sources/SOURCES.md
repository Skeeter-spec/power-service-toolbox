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
| SEL-751A Data Sheet (Date Code 20250411), Synchronism Check (25) ranges, p.23 | READ IN FULL | https://selinc.com/api/download/2822/ | PUBLISHER |
| SEL-451-6 Data Sheet (Date Code 20260217), Synchronism-Check Elements ranges, p.26 | READ IN FULL | https://selinc.com/api/download/124252/ | PUBLISHER |
| SEL, Fundamentals and Advancements in Generator Synchronizing Systems (M. J. Thompson, 2012), advance-angle worked example, p.5 | TRACED | https://cms-cdn.selinc.com/assets/Literature/Publications/Technical%20Papers/6459_FundamentalsAdvancements_MT_20120402_Web2.pdf | PUBLISHER |
| Beckwith M-3410A Intertie/Generator Protection Relay Specification, Sync Check (25) table, p.3 | READ IN FULL | https://beckwithelectric.com/wp-content/uploads/docs/product-specs/M-3410A-SP.pdf | PUBLISHER |
| GE Multilin 850 Instruction Manual v2.0x (2017), Synchrocheck defaults + dead-source logic, pp.4-335 to 4-337 | READ IN FULL | https://docs.ips.us/docs/W1002150.pdf | MIRROR |
| GE Vernova Grid Solutions, 850 resources page (page reachable; current manual v4.3x download is login walled) | LOCATED ONLY | https://www.gevernova.com/grid-solutions/resources?prod=850&type=3 | PUBLISHER |
| Basler BE1-25 Sync-Check Relay product page (manual not reachable at publisher) | LOCATED ONLY | https://www.basler.com/product/be1-25-sync-check-relay/ | PUBLISHER |
| Electrical Engineering Portal, sync check (ANSI 25) function | LOCATED ONLY | https://electrical-engineering-portal.com/generator-synchronizing-check-protective-function | PUBLISHER |
| IEEE C37.2, Electrical Power System Device Function Numbers | GATED, UNREAD | none | NONE |
| IEEE C37.112, Inverse Time Characteristic Equations for Overcurrent Relays | GATED, UNREAD | none | NONE |
| IEC 60255-151 | GATED, UNREAD | none | NONE |

🔴 **CORRECTED 2026-07-17, AND THE ERROR IS THE WHOLE REASON THE `Read at` COLUMN EXISTS, SO IT IS
LEFT VISIBLE.** This line used to say *"The top three rows were read directly at the publisher's own
PDF."* **Its own table, three lines above, says otherwise on two of those three, and the table is
right.**

- **Row 2 only** is read at the publisher: the SEL technical paper comes from SEL's own CDN.
- **Row 1, the GE Multilin 850, is read at `docs.ips.us`, a DISTRIBUTOR's document store.** Not a
  skipped step: GE's own download is login walled and GE no longer offers this version at all, so
  "read it at the publisher" does not exist for this document. That is why a MIRROR warns here and
  does not fail.
- **Row 3, the SEL-351S, is read at a UNIVERSITY COURSE HANDOUT.** That is precisely the chain of
  custody that produced two different wrong equations in this repo's history, from two independent
  passes, neither matching the real manual.

**HOW THE FALSE SENTENCE SURVIVED, which is the reusable part.** Pattern #10 was learned when 02's
SOURCES.md made this identical claim two lines above a distributor's URL. The fix was to stop
trusting prose and add a machine checked field: the `Read at` column, required by
`tools/check_sources.py`. **The column was added. The prose it was meant to replace was left
standing.** So the false statement went on sitting directly beneath its own correction, and the gate
could not see it, because the gate checks that every row HAS a provenance value, not that the
paragraph agrees with the column.

⇒ **WHEN YOU REPLACE A PROSE CLAIM WITH A CHECKED FIELD, DELETE THE PROSE. A summary of a table is a
copy, and a copy rots, or as here was never true.** The table is the statement. Everything below
it is context or a lead.

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

## Device 25: SOURCED 2026-07-17, and the finding is the LAW, not the numbers.

The earlier state was "NO PRIMARY, one candidate returned 403, and the ranges floating around
(10-20 deg, 0.1-0.2 Hz, 2-5%) are a search engine's synthesis, not citation ready." **That synthesis
is now confirmed to have been wrong as well as unsourced**: no publisher document matches it. It is
struck.

**METHOD: two workers, opposite vendors, on purpose** (pattern #12). One was told to start at GE /
Basler / Beckwith and NOT at SEL; the other was told to start at SEL and nothing else. Neither knew
what the other found. They covered disjoint manufacturers, so there is no single number to compare,
but **they converged on the same domain law independently, and that convergence is the evidence.**

🔴 **THE LAW: THERE IS NO "THE" SYNC CHECK, exactly as 03 proved there is no "the" ATS, reached here
from a THIRD direction.** The measured divergence, all at the publisher, all current revisions:

| Relay | Slip freq range | Angle range | Read at | Revision |
|---|---|---|---|---|
| SEL-751A | 0.05 to 0.50 Hz | 0 to 80 deg | PUBLISHER (data sheet) | 2025-04-11, current |
| SEL-451-6 | **0.005 to 0.500 Hz** | **3 to 80 deg** | PUBLISHER (data sheet) | 2026-02-17, current |
| Beckwith M-3410A | delta freq 0.001 to 0.500 Hz | 0 to 90 deg | PUBLISHER (spec sheet) | current |
| GE 850 | 0.01 to 5.00 Hz, **default 0.20 Hz** | 1 to 100 deg, **default 20 deg** | MIRROR, STALE (see below) | v2.0x, 2017 |

**Two SEL product lines disagree with each other by 10x on slip range.** So the 25 element must name
its relay and quote that relay's own numbers, and it must refuse to run without one, the same way 02's
engine throws without a named curve family and 03's throws without a named vendor. **This is not a
gap; it is the domain fact the bench exists to teach.** Both workers reached the recommendation
independently.

**A REPRODUCIBLE WORKED EXAMPLE EXISTS, and it is verified.** SEL's own paper "Fundamentals and
Advancements in Generator Synchronizing Systems" (M. J. Thompson, read at `cms-cdn.selinc.com`, page 5,
rendered as an image) publishes the slip-compensated advance angle and a worked value:

> "using 0.05 Hz slip and a breaker close delay of 5 cycles, the advanced angle would be 1.5 degrees."

The published formula is advance angle = slip x 360 x CBCT (breaker close time in seconds). Recomputed
here: 0.05 Hz x 360 x (5/60 s) = **1.5 deg exactly**, and slip as a rate is 0.05 x 360 = **18 deg/s**,
which the same page also states. Two published numbers, both reproduced. That is 02's shape (published
equation plus published answer) and it is the verify fixture for the 25 element's timing.

🔴 **PROVENANCE, AND DO NOT COLLAPSE THE TWO KINDS OF NUMBER.**
- **SEL-751A, SEL-451-6, Beckwith M-3410A** are read at the PUBLISHER, current revision, and give
  RANGES and accuracies. **None publishes a factory DEFAULT** (defaults live in the full instruction
  manuals, which SEL, Beckwith and Basler all gate). So the bench may quote a range at the publisher,
  and may NOT quote a default it did not read.
- **GE 850 is the only source with full defaults, hysteresis, and dead-source Boolean logic** (its
  `DEAD SOURCE PERM` element, six permissive modes), **but it was read at a DISTRIBUTOR mirror
  (`docs.ips.us`) at v2.0x (2017), and GE currently ships v4.3x (2026), login walled.** This is #18
  exactly: a mirror can be authentic and still the wrong revision. The dead-source LOGIC STRUCTURE is
  safe to describe (it is a design pattern, not a number). The GE default NUMBERS (0.20 Hz / 20 deg /
  2000 V) are stale-revision risk and must be labelled "GE 850 v2.0x (2017), via distributor mirror,
  current revision unread" or not used. **Do not put a GE 850 default number on screen as fact.**
- **Basler BE1-25 could not be reached at the publisher at all** (legacy URL redirects to a login
  page, current product page carries no manual link). No Basler number is citation ready. Not used.

**What the bench does with this:** model the 25 element as SEL's published AND of three independent
windows (angle < setting, slip within band, each side's voltage within its window), verify the
advance angle example above, name the relay whose ranges it shows, and refuse to run without one. It
does NOT publish a single "in sync = X" verdict with defaults, because no such defaulted verdict was
read at a current publisher copy. That refusal is the honest position and it is stronger than a made
up default.

⚠ **A SEL VOLTAGE DIFFERENCE PERCENTAGE IN THE ASCO SHAPE DOES NOT EXIST.** The task went looking for
SEL's version of ASCO's "voltage difference < 5%". SEL does not publish one: its criterion is an
ABSOLUTE voltage pickup window per side (0 to 300 V secondary) plus independent 27S/59S elements, not
a cross-side percentage. The Thompson paper says microprocessor relays "measure the voltage magnitude
difference directly" but publishes no tolerance for it. **Report the window SEL actually publishes; do
not manufacture a percentage to match ASCO.** (Beckwith DOES publish a delta voltage limit, 1 to 50%
of nominal, on the M-3410A spec sheet, so if a percentage is wanted, it is Beckwith's, cited to
Beckwith, not SEL's.)

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
- **Device 25 is now sourced** (2026-07-17, SEL + Beckwith at the publisher, GE 850 defaults on a
  stale mirror and labelled as such). **Device 86 is still not sourced from a document.** It is a
  latch, so there is no number to publish, and the honest options are two: cite its latching logic
  from a manual already in hand (the GE 850's own lockout description), or model it as a pure latch
  and cite C37.2 by number for the device meaning only. Until one is chosen, the split that keeps
  the source phase `wip` is 86 alone, not 25.
