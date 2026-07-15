# Concurrent maintainability, and why this repo will not tell you your tier

Working notes, written while building project 01. My own words. Sources cited, never copied.

---

## The thing I got wrong first

I assumed "N, N+1, 2N" was Uptime Institute vocabulary, and that a one line diagram plus those terms
got you to a tier. Both halves of that are wrong, and finding out changed what project 01 does.

**Uptime's own public pages never use the words N, N+1, or 2N.** Not once. I fetched both of them
looking for it:

- https://uptimeinstitute.com/tiers
- https://journal.uptimeinstitute.com/explaining-uptime-institutes-tier-classification-system/

They define the tiers in prose, around two ideas: **concurrently maintainable** (Tier III) and
**fault tolerant** (Tier IV). The N vocabulary is engineering shorthand that the industry maps onto
those tiers by convention. Schneider's White Paper 75 publishes one such mapping, in its Table 1.
That mapping is Schneider's, and it is a reasonable one, but it is not Uptime's definition, and the
actual Tier Standard: Topology document is gated and I have not read it.

So a tool that prints "your site is Tier IV" would be asserting a thing it cannot know, using a
vocabulary the awarding body does not use, against a standard it has not read. That is three
different kinds of wrong stacked on top of each other, and it would look authoritative doing it.

**What a one line CAN tell you is narrower and completely checkable: which single components, if
you take them out, drop a load.** That is the question project 01 answers. Nothing more.

## Concurrent maintenance: the second half of the definition is the half that matters

WP75 p.3 defines it as being able to shut down any component for maintenance

> without requiring that the load be transferred to the utility source

I skated past that second clause the first time. It is the whole definition. Keeping the load
**lit** is easy: close the maintenance bypass and the lights stay on. But now the load is sitting
on raw utility with nothing between it and the next sag, which is precisely what the UPS was bought
to prevent. WP75 counts that as a failure of concurrent maintenance, not a pass.

So there are three outcomes when you pull a component, not two:

| Pull it and | Means |
|---|---|
| everything stays up, on protected power | fine. This is the only pass |
| everything stays lit, but something is on bypass | the lights are on and the protection is gone |
| something goes dark | single point of failure |

The middle row is the one that gets lost when people say "we can maintain it live."

## Redundant components are not a redundant path

This is the trap, and WP75 says it out loud about its own Figure 3. Two 300kW UPS modules feeding a
300kW load looks like N+1 and is N+1, at the module level. But both modules land on **one paralleling
bus**, and that bus feeds **one PDU**, and the load has **one cord**. So:

> there still remains a single point of failure in the paralleling bus (p.9)

Redundant modules on a non redundant bus. Uptime's Tier III language is careful about exactly this:
it asks for redundant **distribution paths**, not just redundant components. Counting boxes tells
you nothing. You have to follow the path all the way to the cord.

## Which brings it to the cord, where most of these designs are actually decided

The single most useful thing I learned building this. WP75's advantage claim for the distributed
redundant design is **conditional**, and the condition is easy to read past:

> Allows for concurrent maintenance of all components **if all loads are dual-corded** (p.14)

Its Figure 5 does not meet its own condition. Three of the six loads are drawn single corded. So
Figure 5, as published, is not concurrently maintainable for those three, and the engine says so.
Figure 6 is the same family of design with every load dual corded, and it comes out clean.

The upstream can be immaculate. Two utilities, three UPS modules, an STS ring, and none of it
reaches a load with one cord. WP75 is blunt about where this ends:

> tier IV power architectures require that all loads are dual-corded (p.16)

An STS or a rack transfer switch is the compromise: it brings two sources to a single corded load
and genuinely helps, but it does not remove the last single point, it relocates it into the rack.

## What I still do not know

- **Capacity.** All of the above is topology. A path existing is not the same as the surviving
  equipment being big enough to carry the load through it. A design can pass every check in project
  01 and still be undersized. That needs a flow model and it is not built.
- **Fault tolerance, as distinct from maintainability.** I built an unplanned failure analysis and
  then cut it, because a real UPS has an internal static bypass that transfers automatically in
  milliseconds (WP75 p.5), these figures do not draw it, and so my model would have produced
  confident pessimistic answers about what survives a fault. Better to not answer than to answer
  wrong.
- **Whether Uptime would agree with any of this.** They award tiers against a document I have not
  read. Nothing here should be read as predicting what they would say.

## Sources

- Schneider Electric White Paper 75 Rev 4, "Comparing UPS System Design Configurations," McCarthy
  and Avelar. Free from the publisher:
  https://download.schneider-electric.com/files?p_Doc_Ref=SPD_SADE-5TPL8X_EN
- Uptime Institute's two public tier pages, linked above.
- Full sourcing, including what is gated and what was deliberately left out, is in
  `projects/01-power-chain/sources/SOURCES.md`.

Corrections welcome. If something here is wrong I would rather know.
