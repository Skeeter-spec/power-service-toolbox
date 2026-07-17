# 07. Switching order and LOTO planner

Given a circuit and a job, which devices are the boundary? That is the clearance limit, and this
computes it and reproduces the answers the Bonneville Power Administration publishes for its own
worked examples.

**[Live demo](https://skeeter-spec.github.io/power-service-toolbox/projects/07-switching-order/build/index.html)**

> **Educational. Not for field use.** A clearance is a human procedure with a Dispatcher on the other
> end of it. This is a study model of two published figures. It is not a substitute for an engineered
> study, a Switching Order, a Dispatcher, or a qualified person on site.

## What this went looking for, and what it found instead

It went looking for **a switching order**: a numbered list, step 1 open this, step 2 check that.
Encode the circuit, generate the list, diff it against the published one. That is how 02 works, with
210 published trip times reproduced to the table's own precision.

**There is no such list.** Not in BPA S-6's 86 pages, not in Reclamation FIST 1-1 or 1-2, which
reference a Switching Procedure Form carrying the device sequence and only ever print it blank.
Nobody publishes a filled in switching order, because a switching order is written for one circuit on
one day by the Switchman standing in front of it.

That absence is real, it was checked twice, and **it was recorded pointing the wrong way.** It went
into the notes as "the most important gap, it shapes the whole verify phase", which treated the
missing step list as the binding constraint on what this project could verify. It is not.

**BPA does not print the steps. It prints the limits of a clearance, on named devices, in at least
eight worked examples.** The limits are the harder half. The steps are local and situational; the
limits are a property of the circuit and the job, and they are the thing you get wrong and die. The
source phase stopped one page short of its own best fixture.

## What it verifies against

Three published answers, out of one engine, from two figures.

| BPA S-6 | The question | The published answer |
|---|---|---|
| X.2 Example 1, P-45 | Work Clearance on the Central to East Columbia No. 3 230 kV line | Auxiliary Bus + Line Side disconnects, at each terminal |
| X.2 Example 2, P-47 | Test Clearance on A-10 PCB itself | Line Side + **Main Bus** disconnects |
| X.3 Example 1, P-52 | Dispatcher tagging on a 13.8 kV feeder breaker with a bypass | Feeder + Bus disconnects |

**Examples 1 and 2 share one figure, and each published answer is wrong for the other question.**
That pair is what makes this a fixture rather than a demo. Any model can be bent to reproduce one
answer. A model whose topology is subtly wrong cannot satisfy both.

The pair also caught a real error in this repo's own notes. The source phase described the Example 1
figure as "PCB A-10 with a disconnect either side". Rendering it at 14x and counting the blades gives
**three** disconnects per terminal, and the missing one is the whole point: the **Auxiliary Bus
Disconnect hangs off the line node, not off the breaker**. Close it and the line is fed from the
auxiliary bus with A-10 out of the picture. A model built from the old sentence would answer Example
2's question when asked Example 1's, and **would call a line isolated while it sat energized**. The
device count in that sentence was right the whole time, which is exactly why the wrong description
survived a whole phase: the number agreed, so nobody re counted the blades.

## The rule it asserts

BPA S-6 section IV.4.C, page label P-8, verbatim:

> "PCB(s) shall be checked open before operating isolating devices."

A flat imperative. No arithmetic, no tolerance, no convention: a sequence either honours it or it
does not, which is what makes it a gate a program can check. BPA's own Example 1 obeys it, opening
A-10 and A-3 by supervisory control before any disconnect is touched.

A second rule, from a second public domain publisher: **29 CFR 1910.269(n)(6)**, read at govinfo.gov.
Attach the ground end first, then the line end. Remove the line end first, then the ground end. The
regulation states both halves rather than saying "reverse", so both can be asserted rather than
inferred. It is not attributed to BPA: S-6 defers portable grounding to a separate manual that was
never fetched.

## What it will not tell you

The refusals are the product, and they are asserted in `verify/`, not just written here. Their
mutants **break no calculation at all**: every limit still computes correctly under each one. They
only make the tool claim more than its sources do.

- **It will not present a generated sequence as BPA's.** No step list is published. The emitted
  object carries `generated: true` and `publishedStepList: false` as fields, and verify greps every
  shipped string in `build/` for any attribution.
- **It will not explain why rule IV.4.C exists.** BPA states the order and gives no reason. All 86
  pages were searched for "load break", "under load", "interrupt", "load current": the rule is bare.
  The document instead names a "Load-Break Disconnect" as its own device class, which is evidence,
  not a statement, and those are different objects.
- **It will not assume a breaker can interrupt what flows through it.** X.5 Example 2 documents a PCB
  "determined to be inadequate for line-dropping", with the relaying modified so it is never the last
  to open. The engine throws on a breaker whose capability no source publishes, rather than quietly
  opening it.
- **It will not tell you the ground grid is an energization path**, and where that claim is this
  tool's own rather than BPA's, the test says so in its own name.

## The one it left on the table, on purpose

**X.2 Example 5 (P-51)** publishes the largest answer in the document: five limit devices, the only
ones crossing a voltage class, including **ACB-1**, a low voltage breaker that is already open. It is
not encoded. The answer is published; the **mechanism is not**. BPA says ACB-1 is tagged to control
energization "from the alternate station service source", but tracing the transfer switch at 22x, an
open transition ATS never joins its normal and alternate contacts, so the alternate source has no
path to ACB-1 on the drawing as given. Encoding it would mean choosing whichever transfer model makes
the published answer come out, which is an answer key grading itself. See `sources/SOURCES.md`.

## Layout

    sources/   authoritative references, cited, with a machine checked audit table
    verify/    verify.js (the assertions) and mutants.txt (proof they can fail)
    build/     the app: topology.js (traced connectivity), engine.js, index.html

## Build log

See `PROGRESS.log`. It is the source of truth for this project, not this file.
