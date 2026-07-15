# 02. TCC coordination studio

Two inverse time overcurrent elements on log log axes, from a manufacturer's own published curve
equation. Change the shape, the pickup and the time dial, read the coordination interval at a fault
current, and see where the curves cross.

> **Educational. Not for field use.** This tool reproduces published worked examples so they can be
> explored interactively. It is not a substitute for an engineered study, the manufacturer's
> instructions, or a qualified person on site.

## Status

See `PROGRESS.log`. It is the source of truth for this project.

## Verify against

**The GE Multilin 850 instruction manual publishes its own answers, 210 times.** On manual page
4-115 it prints the trip equation, the curve constants, and a 210 cell table of the trip times those
produce. Nine pages later, on p.4-124, it states one of those cells again in prose:

> "if an IEEE Extremely Inverse curve is selected with TDM = 2, and the fault current is 5 times
> bigger than the PKP level, the operation of the element will not occur before 2.59 s have elapsed
> after Pickup."

`verify/verify.js` drives the engine over every one of those 210 cells. **210 of 210 agree.** The
worst disagreement is 0.135%, which is the table's own rounding to three decimals.

That is why this project exists. Project 01 verified against a paper that published a prose verdict.
This one publishes a **number**, and the number can be checked 210 times.

**No tolerance was invented.** Reproducing a published table is arithmetic, so the pass criterion is
the table's own printed precision, half of the last printed digit. That was the one thing this project
needed that 01 did not, and an invented number would have made the whole verify phase theatre.

## What it will not tell you

**Whether your devices coordinate.** There is no pass here and no fail, deliberately.

The obvious thing to gate on is the customary 0.3 to 0.4 second coordination interval. That number is
real, and this tool draws it, and it will not compare anything against it. Two reasons, both in
`build/engine.js`:

1. **Its own source says "usually".** That is a rule of thumb for an engineer to apply with judgment,
   not a limit for a program to test against. An `if` statement would invent a precision the source
   declined to claim, and then print it in a box where it reads as a finding.
2. **Its provenance is not what it looks like.** It reaches the free literature through TM 5-811-14,
   a US Army Corps of Engineers document, which is public domain. But the section carrying the number
   carries an asterisk, and the asterisk says it is reprinted by permission from ANSI/IEEE 242-1986,
   copyright IEEE. That permission was granted to the Army, not to this repo. A document's licence is
   not uniform.

**It also claims no standards conformance.** It reproduces one named manufacturer's published curve
family and cites the manual. GE and SEL both say their curves conform to IEEE C37.112-1996, in their
own words, over **different constants** that sit about 5x apart, and C37.112 itself is gated and unread
here. So "which one is the standard's" is a question this repo cannot answer and does not pretend to.
Same reasoning as 01 refusing to print a tier. See `sources/SOURCES.md`.

The one finding it does report is curve overlap, because that method is public domain, is in the
Army's own prose, and needs no invented number: two curves either cross or they do not.

## Layout

    sources/   authoritative references, cited, each with how far it was read AND whose copy
    verify/    the 210 published trip times, and the suite that reproduces them
    build/     the app

## Build log

See `PROGRESS.log`. The short version: the engine was the easy part. The primary was re read from
scratch, which is how it emerged that `SOURCES.md` claimed to have read it "at the publisher's own
PDF" when the file came from a distributor's document store, stamped on all 562 pages. The repo's own
rule about primaries had been written down and not applied to the primary. It is a machine checked
field now.
