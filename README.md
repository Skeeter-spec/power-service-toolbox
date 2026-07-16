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
| 01 | **[Power chain one line explorer](https://skeeter-spec.github.io/power-service-toolbox/projects/01-power-chain/build/index.html)** ✅ **live** | Five published UPS configurations as interactive one lines. Click any component to take it out of service and watch what goes dark. Verified against the source paper's own stated conclusions. |
| 02 | **[TCC coordination studio](https://skeeter-spec.github.io/power-service-toolbox/projects/02-tcc-coordination/build/index.html)** ✅ **live** | Two relay curves on log log axes, computed from a manufacturer's own published equation. Read the coordination interval at a fault current and see where the curves cross. Reproduces all 210 trip times the manual publishes, and prints no coordination verdict, because the customary interval's own source says "usually". |
| 03 | **[ATS sequence simulator](https://skeeter-spec.github.io/power-service-toolbox/projects/03-ats-sequence/build/index.html)** ✅ **live** | Utility fail, sense, timers, engine start, transfer, retransfer, cooldown, on a named vendor's own published timers. Open, closed and delayed transition, with the sync check reproduced at the boundary its manual actually states. It has no vendor neutral mode, because there is no vendor neutral ATS: ASCO and Russelectric agree on the sequence completely and disagree on its numbers by 6x. It also refuses to tell you how long two live sources sit paralleled, because the manufacturer deleted that number from the current revision. |
| 04 | Relay bench | ANSI device numbers 50, 51, 27, 59, 87, 25, 86 as a configurable simulated relay. Set pickup and time dial, inject a fault current, watch it trip. |
| 05 | **[Modbus frame codec](https://skeeter-spec.github.io/power-service-toolbox/projects/05-modbus-meter/build/index.html)** ✅ **live** | The same PDU sent over serial and over TCP, side by side, reproducing the specification's own published hex worked examples byte for byte. It shows which parts of a Modbus TCP frame are fossils of an RS-485 bus, because the spec says so itself: the PDU is capped at 253 bytes by "the size constraint inherited from the first MODBUS implementation on Serial Line network", and MBAP spends a field on a Unit Identifier defined as a slave "connected on a serial line". It refuses to decode a 32 bit float, because the specification defines byte order within a register and defines no type wider than one. No meter register map ships: a meter's map belongs to its vendor, and none is sourced yet. |
| 06 | Ladder logic interpreter | Encode a real close permissive: 86 lockout clear, 25 sync check OK, spring charged, no 50 or 51 trip. Verified against a truth table. |
| 07 | Switching order and LOTO planner | Build a switching order against the one line, verify isolation boundaries and the zone of protection, generate the tagout sequence. |
| 08 | NETA acceptance test checklist generator | Equipment type in, test plan out: insulation resistance, contact resistance, primary and secondary injection, trip timing. Structure and citation only. |
| 09 | Commissioning script runner | Commissioning levels L1 to L5, a punch list tracker, a clean PDF field report. |
| 10 | Three phase sandbox | Phasors, wye against delta, line against phase voltage and current, per unit, symmetrical fault current basics. |

## Status

<!-- BEGIN GENERATED: status. Do not hand edit. Regenerate: ./tools/build_readme.py -->

**Four of the ten tools are live**, meaning they have passed the gate above and are running where you can click them:

- **01. Power chain one line explorer**: [live demo](https://skeeter-spec.github.io/power-service-toolbox/projects/01-power-chain/build/index.html)
- **02. TCC coordination studio**: [live demo](https://skeeter-spec.github.io/power-service-toolbox/projects/02-tcc-coordination/build/index.html)
- **03. ATS sequence simulator**: [live demo](https://skeeter-spec.github.io/power-service-toolbox/projects/03-ats-sequence/build/index.html)
- **05. Modbus meter test bench**: [live demo](https://skeeter-spec.github.io/power-service-toolbox/projects/05-modbus-meter/build/index.html)

<!-- END GENERATED: status -->

The other nine are folders and a plan. Each project's `PROGRESS.log` is the source of truth for where
it stands, and the block above is generated from those files rather than typed by hand. That is not
fussiness: this section previously said "no tool is live yet" for a while after 01 went live, because
a status typed into prose is a copy, and a copy rots. `./tools/gate.sh` fails if it drifts again.

Building in order: 01, then 02, 03, 04. The next one does not start until the current one verifies.

**What the gate cost 01, since that is the only honest way to show a rule is real.** Mutation testing
the verify suite (breaking the engine on purpose to prove the tests could go red) found that an entire
unplanned fault analysis was dead code: breaking its logic changed no test result. It was cut rather
than shipped, because nothing in the source paper states a claim to check it against, and it would
have been wrong anyway. The same technique then found a real bug: a bus tie encoded one way, so one
side could never back feed the other. A tie that conducts one way is not a tie.

A green test suite proves nothing until you have watched it go red.

## Layout

    projects/<nn>-<slug>/
      README.md        what it is and the build log
      PROGRESS.log     source of truth for status
      sources/         authoritative references, each with a stated verification level
      verify/          the published worked example it must reproduce
        verify.js      the assertions, each quoting the source paper
        mutants.txt    ways to break the code that the suite MUST notice
      build/           the app
    reference/         glossary and one pagers, written longhand
    tools/
      gate.sh          runs all four checks below. This is the rule, as a command
      mutate.sh        breaks the code on purpose to prove the suite can fail
      check_sources.py fails on any citation with no stated verification level
      build_readme.py  generates the status block above from the PROGRESS.log files

## Checking it yourself

    ./tools/gate.sh

Four checks, and each one exists because it already failed once here:

| Check | Because |
|---|---|
| every `verify` suite passes | the repo's one rule |
| every suite can actually **fail** | a green suite proves nothing until you have watched it go red |
| every citation states how far it was verified | this repo's whole claim is "I checked" |
| the status block matches the `PROGRESS.log` files | it said "no tool is live yet" after 01 was live |

Nonzero exit on any failure, so it gates rather than advises.

## License

AGPL 3.0. Read it, run it, learn from it, build on it. If you run a modified version as a service,
the modifications are open too. Copyright is held by the author.
