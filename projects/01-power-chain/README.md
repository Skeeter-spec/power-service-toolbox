# 01. Power chain one line explorer

**▶ [Open the live demo](https://skeeter-spec.github.io/power-service-toolbox/projects/01-power-chain/build/index.html)**

Five published UPS configurations, drawn as interactive one line diagrams. Click any component to
take it out of service and watch what goes dark.

> **Educational. Not for field use.** This reproduces published worked examples so they can be
> explored interactively. It is not a substitute for an engineered study, the manufacturer's
> instructions, or a qualified person on site.

## What it actually claims

Narrow, on purpose: **given a one line, which single components, if taken out, drop a load or force
it onto unprotected power.**

It does **not** tell you your tier, and it never will. A tier is awarded by the Uptime Institute
against their Tier Standard: Topology, which is gated and which this project has not read. It turns
on things a one line does not show. And Uptime's own public pages never use the words N, N+1, or 2N
at all: that vocabulary is industry convention mapped onto their tiers, not their definition. A tool
that printed a tier would be guessing in a confident voice. See
[`reference/concurrent-maintainability.md`](../../reference/concurrent-maintainability.md).

## Status

See `PROGRESS.log`. It is the source of truth for this project.

## Verify against

**Schneider Electric White Paper 75 Rev 4**, "Comparing UPS System Design Configurations,"
McCarthy and Avelar. Free from the publisher:
https://download.schneider-electric.com/files?p_Doc_Ref=SPD_SADE-5TPL8X_EN

That paper is the whole reason this project has a verify phase. It is the rare free document that
publishes **both a one line diagram and its own verdict, in words, on that diagram**: where the
single points of failure are, and whether the design supports concurrent maintenance. So the engine
can be checked rather than admired.

    node verify/verify.js

31 checks, all passing. Every expectation quotes the paper. If a claim is not in the paper's own
words, it is not asserted, however obvious it looks.

**Deliberately not tested: tier labels.** WP75's Table 1 does map its configurations to tiers and it
would be easy to assert against that column. It would also prove nothing, for the reasons above.

## Three things this found that I had wrong

The verify phase was not a formality. It changed the code three times.

1. **A mutation test found dead code pretending to be a feature.** There was an unplanned fault
   analysis in the engine. Breaking its logic on purpose changed no test result, which is how you
   learn a feature is decorative. It came out: nothing in WP75 states a claim it could be checked
   against, and it would have been wrong anyway, because a real UPS has an internal static bypass
   that transfers automatically (WP75 p.5) and these figures do not draw it. A confident wrong
   answer is the exact failure this repo exists to avoid.
2. **A mutation test found a real bug.** Figure 7's bus tie was encoded one way, so side B could
   never back feed side A. A tie that only conducts one way is not a tie. Nothing failed, because no
   test covered it. WP75 p.16 states plainly what that tie is for, so now there is a test that says so.
3. **Two node boxes were silently overlapping** in the Figure 5 layout. Now a layout check catches
   it, because a bug a human has to notice is a bug that comes back.

## The thing worth clicking

Load Figure 5, the distributed redundant design, and take **PDU 1** out. One load goes dark: LOAD 1,
the single corded one. Everything else rides through on its second cord.

That is the whole lesson of the project in one click. WP75's own advantage claim for that design is
conditional, and the condition is easy to read straight past:

> Allows for concurrent maintenance of all components **if all loads are dual-corded** (p.14)

Figure 5 as published does not meet its own condition. Three of its six loads have one cord. The
upstream can be immaculate, two utilities and three UPS modules and an STS ring, and none of it
reaches a load with one cord. Compare it against Figure 6, the same family of design with every load
dual corded, which comes out clean.

## Layout

    build/
      index.html       the app. Open it. No build step, no dependencies, no CDN
      engine.js        the model. Single component removal over a directed graph. Runs in node too
      topologies.js    the five WP75 figures, traced by hand off the diagrams
    verify/
      verify.js        the gate. Asserts the engine reaches WP75's stated conclusions
    sources/
      SOURCES.md       every citation, and what is gated, and what was left out

## What it does not model, stated plainly

- **Capacity.** Topology only. It asks whether a path exists, not whether the surviving equipment is
  big enough to carry the load through it. A design can pass every check here and be undersized.
  That needs a flow model. Not built.
- **Single removals only.** No N-2, no common cause, no failure during maintenance.
- **Planned maintenance only.** See point 1 above.
- **No protection coordination, no fault current, no arc flash.** Never. See the repo README.
