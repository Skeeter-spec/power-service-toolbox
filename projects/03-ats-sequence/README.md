# 03. ATS sequence simulator

Utility fail, sense, timers, engine start, transfer, retransfer, cooldown. Open, closed and delayed
transition with the in phase monitor and the sync check, on a full timing chart.

**[Open the demo](https://skeeter-spec.github.io/power-service-toolbox/projects/03-ats-sequence/build/index.html)**

> **Educational. Not for field use.** This tool reproduces published worked examples so they can be
> explored interactively. It is not a substitute for an engineered study, the manufacturer's
> instructions, or a qualified person on site.

## Status

See `PROGRESS.log`. It is the source of truth for this project.

## Verify against

**ASCO Group 5 Controller User's Guide, part 381333-126 N (09/2018), 7000 Series.** Free, no login,
and fetched from the manufacturer's own download server rather than a rehost.

It publishes both a sequence and its own stated verdict on that sequence, which is the pairing that
makes a verify phase possible at all. The verdict is numeric and verbatim (p.25):

> "Three criteria must be met for the sources to be considered in-sync. The phase difference between
> the sources must be less than 5 degrees, the frequency difference must be less than 0.2 Hz, and the
> voltage difference must be less than 5%."

`node verify/verify.js` runs 63 checks against that sentence, the published timer table (p.9) and the
published voltage and frequency thresholds (p.7). 29 mutants confirm the suite can actually fail.

**"Less than" is asserted as "less than."** Exactly 5.0 degrees is not in sync, on all three
criteria. Reproducing a published criterion and approximating it are different things, and only the
boundary tells them apart.

## The thing this project is actually about

**There is no such thing as "the" ATS sequence.** ASCO and Russelectric agree on the structure
completely: sense the source, ride through a blink, start the engine, wait for it to be acceptable,
transfer, run, wait, come back, cool down. Every ATS does that, in that order.

Their numbers are not close.

| | ASCO Group 5 | Russelectric Model 2000 |
|---|---|---|
| override a momentary normal outage | 1 second | 3 seconds |
| retransfer to normal | 30 minutes | 300 seconds |

Same job, 6x apart on one row. Neither is wrong. So this tool **names the vendor on every screen**
and has no vendor neutral mode, because there is no vendor neutral ATS. That is the same refusal
project 01 makes when it declines to print a tier, arrived at from a completely different direction.

## What it refuses to tell you, and why that is the point

- **How long two live sources sit paralleled in a closed transition.** ASCO published a 0.5 second
  default and a 0.100 to 1.000 sec range in Rev K (2004). **Rev N deleted the row** and calls it
  "factory preset" with no value printed. It is the most attractive number in the whole source for a
  simulator to expose as a slider, and it governs the one instant when a utility and a generator are
  tied together. Shipping it would mean citing a superseded revision about the parameter that matters
  most. So the tool names the parameter, says ASCO factory presets it, and stops. `verify/` greps the
  build to make sure nobody puts it back.
- **Which Shed Load timer value is right.** The manual says 1.5 second in its features table and
  "3 second default" in the narrative on the facing page, and has done since 2004. The tool reports
  the disagreement instead of quietly picking one and drawing a confident chart over it.
- **A phase angle for the open transition in phase monitor.** ASCO publishes a time delay for it and
  no angle at all. The 5 degrees belongs to the closed transition's sync check, a different feature on
  different switch models. Carrying it across would invent a spec and cite ASCO for it.
- **What a 4000 Series switch does.** The current revision covers 7000 Series only.

## The sourcing finding

This project spent a phase blocked on one sentence: the copy being read was a distributor's mirror,
and defaults are exactly what it verifies against. Fetching the manufacturer's copy paid, but not in
the way anyone expected.

**The mirror is Rev K, 2004. The publisher serves Rev N, 2018.** Fourteen years stale, covering a
product line the current document has dropped. The mirror is a clean, authentic, unstamped ASCO file
and **every number in it that this project uses is correct**. It is not a bad copy. It is a bad
revision, and no amount of reading it more carefully could ever have revealed that.

Then the edge: **Rev N is wrong where Rev K was right.** Rev N regressed the frequency table's labels
to read "Voltage" while its own footnotes still say frequency. Newer is not a synonym for correct.
The publisher's current copy is authoritative about what is *current*, which is a narrower claim than
it sounds. Both revisions stay in the audit table.

Full detail, including what was deliberately left out: `sources/SOURCES.md`.

## Layout

    sources/   authoritative references, cited
    verify/    the published criteria this must reproduce, and the mutants that prove it can fail
    build/     the app
