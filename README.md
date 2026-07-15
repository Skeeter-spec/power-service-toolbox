# Power Service Toolbox

Open tools, references, and verified worked examples for data center power service: switchgear,
protective relays, ATS, metering, and commissioning. Built in public by a field service engineer.

## The rule this repo runs on

**Nothing ships here until it reproduces a published worked example and the number matches the book.**

That is the whole point of the repo, so it goes first. A trip curve either lands on the
manufacturer's published curve or it does not. A transfer sequence either matches the published
sequence of operation or it does not. Where a right answer exists, the tool is checked against it
before the tool is published, and the reference it was checked against is committed next to the code
in `verify/`.

Every project moves through five phases, and it is not pushed to this repo until the fourth one passes:

| Phase | Done means |
|---|---|
| `source` | Authoritative references gathered and cited in `sources/` |
| `learn` | Digested into `reference/`, written out longhand rather than pasted |
| `build` | The app runs and does the thing |
| `verify` | **It reproduces a published worked example. The number matches the book.** |
| `publish` | README, build log, live demo |

So a folder appearing here with an app in it is a claim that the app was checked. That is a higher bar
than "it runs," and it is deliberately the slow part.

## What this is

Almost nobody in power service writes software, and almost nobody who writes software has racked a
breaker. This repo sits in that overlap: the tools a field tech actually wants, built by someone who
has been on the floor, and checked against the published literature rather than against a good feeling.

It is a toolbox, not a pile of demos. **The tools interlock on purpose:** the switching order planner
plans against the one line explorer's diagram, the relay bench's curves plot in the coordination
studio's engine, the meter bench feeds readings into the power chain. Each one is useful alone and
they compound together.

## Safety, stated plainly

**Nothing in this repo is a field tool, and none of it will ever be a safety calculator.**

There is no arc flash incident energy calculator here and there will not be one. No output from this
repo is an engineered study, and no number it prints should decide what anyone wears or touches. A
wrong number in that category burns a person.

What these tools do instead is the inverse, and it is the honest version: take an example that a
standards body or a manufacturer already published and worked out, reproduce it, and show the work.
Every app that touches protection math carries a visible banner saying so.

The standards themselves stay where they belong. NFPA 70E and the NETA acceptance testing
specification are copyrighted. This repo cites them, links the free access viewer, and paraphrases
structure. It does not reproduce their tables.

## The tools

The first four carry the weight. The rest round out the trade.

| # | Tool | What it does |
|---|---|---|
| 01 | Power chain one line explorer | Utility to rack: MV switchgear, transformer, LV switchgear, ATS, UPS, PDU, RPP, busway, rack PDU. Click a node for what it does and how it fails. Overlay N+1 against 2N. |
| 02 | TCC coordination studio | Plot breaker, fuse, and relay curves on log log axes, overlay two devices, compute the coordination interval, flag miscoordination. |
| 03 | ATS sequence simulator | Utility fail, sense, timers, engine start, transfer, retransfer, cooldown. Open and closed transition, in phase monitor, sync check, full timing chart. |
| 04 | Relay bench | ANSI device numbers 50, 51, 27, 59, 87, 25, 86 as a configurable simulated relay. Set pickup and time dial, inject a fault current, watch it trip. |
| 05 | Modbus meter test bench | A pymodbus slave simulating a real power meter, plus a register decoder and a live dashboard. |
| 06 | Ladder logic interpreter | Encode a real close permissive: 86 lockout clear, 25 sync check OK, spring charged, no 50 or 51 trip. Verified against a truth table. |
| 07 | Switching order and LOTO planner | Build a switching order against the one line, verify isolation boundaries and the zone of protection, generate the tagout sequence. |
| 08 | NETA acceptance test checklist generator | Equipment type in, test plan out: insulation resistance, contact resistance, primary and secondary injection, trip timing. Structure and citation only. |
| 09 | Commissioning script runner | Commissioning levels L1 to L5, a punch list tracker, a clean PDF field report. |
| 10 | Three phase sandbox | Phasors, wye against delta, line against phase voltage and current, per unit, symmetrical fault current basics. |

## Status

The scaffold, the glossary, and the ten project folders are up. **No tool has passed `verify` yet, so
no tool is live yet.** Each project's `PROGRESS.log` is the source of truth for where it actually
stands; this table is not, and neither is this paragraph.

Building in order: 01, then 02, 03, 04. The next one does not start until the current one verifies.

## Layout

    projects/<nn>-<slug>/
      README.md      what it is and the build log
      PROGRESS.log   source of truth for status
      sources/       authoritative references, cited
      verify/        the published worked example it must reproduce
      build/         the app
    reference/       glossary and one pagers, written longhand

## License

AGPL 3.0. Read it, run it, learn from it, build on it. If you run a modified version as a service,
the modifications are open too. Copyright is held by the author.
