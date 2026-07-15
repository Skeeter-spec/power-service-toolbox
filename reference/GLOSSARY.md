# Glossary

Working notes, in my own words, written while learning this trade in the open. Where a term comes from
a standard I cite the standard rather than reproduce it. NFPA 70E and the NETA acceptance testing
specification are copyrighted: this glossary points at them, it does not copy them.

Corrections welcome. If an entry here is wrong, that is worth knowing and worth fixing in public.

---

## The power chain, utility to rack

**Service entrance.** Where utility power lands on the site and becomes the owner's responsibility.

**MV switchgear.** Medium voltage distribution, commonly 5kV to 38kV class. Breakers are typically
**drawout**: the breaker rolls out of its cubicle on rails so it can be racked to a **test** position
(control power connected, primary disconnected) or fully withdrawn. Racking is where a lot of the risk
and a lot of the procedure lives.

**Transformer.** Steps MV down to utilization voltage, commonly 480V for data center distribution.
Its **impedance** sets how much fault current the downstream gear must survive.

**LV switchgear / switchboard.** 480V class distribution. Feeds the UPS, mechanical loads, and house power.

**ATS, automatic transfer switch.** Moves a load between two sources, normally utility and generator,
without a person present. See project 03.

**UPS.** Rides through the gap between utility loss and generator acceptance, and conditions power.
Has a **static bypass** (fast, electronic) and a **maintenance bypass** (mechanical, lets you service
the UPS with the load still fed).

**PDU.** Transformer plus panelboard on the floor, taking 480V to 208V/120V for racks.

**RPP, remote power panel.** Panelboard pushed closer to the load without its own transformer.

**Busway.** Overhead prefabricated conductor run with tap off points, an alternative to conduit home runs.

**Rack PDU.** The strip in the rack itself. Often metered per outlet.

---

## Topology and availability

**N.** Exactly enough capacity to carry the load, and nothing spare.

**N+1.** One spare unit beyond what the load needs. One unit can fail or be serviced.

**2N.** Two complete independent systems. Not the same as N+1: 2N tolerates the loss of an entire
distribution path, not just one component.

**Concurrent maintainability.** Any single component can be taken out for planned work with the load
still up. This is a property of the topology, not of the equipment.

**Fault tolerance.** The site survives an unplanned single failure. Stronger than concurrent
maintainability, and the two are not the same claim.

**Tier.** The Uptime Institute's classification of the two properties above. Cite Uptime, do not
paraphrase their definitions loosely: the distinctions are precise and are often gotten wrong.

---

## Protection

**ANSI device numbers.** A shorthand for what a protective function does, standardized in IEEE C37.2.
The ones that come up constantly:

| Number | Function |
|---|---|
| 27 | Undervoltage |
| 25 | Sync check, permission to close two sources together |
| 50 | Instantaneous overcurrent, trips with no intentional delay |
| 51 | Time overcurrent, trips on an inverse time curve |
| 59 | Overvoltage |
| 86 | Lockout relay, latches a trip until a person resets it |
| 87 | Differential, current in against current out over a protected zone |

**Pickup.** The current above which a 50 or 51 element starts to act.

**Time dial.** Shifts a 51 curve up or down in time without changing its shape.

**TCC, time current curve.** Trip time against current, plotted log log. See project 02.

**Coordination.** The device closest to a fault should clear it first, so the outage stays small.
Proven by showing separation between adjacent devices' curves across the fault current range.

**Coordination interval.** The time separation held between two devices so the downstream one reliably
wins. Not a single universal number: it depends on the devices.

**Zone of protection.** The region a given device is responsible for. Zones must overlap, because a gap
between zones is a fault nobody clears.

**CT and PT ratios.** Instrument transformers scale primary current and voltage down to what a relay can
read. **Polarity matters**: a CT wired backwards makes a differential scheme see a fault that is not there.

---

## Testing and commissioning

**NETA acceptance testing.** The industry specification for proving new gear before it carries load.
Cite the NETA ATS. Do not reproduce its tables. See project 08.

**Insulation resistance.** Is the insulation intact. Measured with an applied DC voltage.

**Contact resistance.** Is the current path through a closed contact actually low. Often called a
ductor test.

**Primary injection.** Push real current through the whole chain, CT included, and confirm the relay
trips. Proves the system.

**Secondary injection.** Inject a signal at the relay's inputs only. Proves the relay, not the CT.

**Trip timing.** How long the breaker actually takes to clear, measured rather than assumed.

**Commissioning levels, L1 to L5.** Roughly: factory testing, delivery checks, static checks,
energized component testing, then integrated systems testing. See project 09.

**IST, integrated systems testing.** The whole site, running together, failed on purpose to see whether
it behaves the way the design says it will. This is the test that finds what the component tests missed.

---

## Safety

**LOTO, lockout tagout.** Isolate the energy, lock it, tag it, and verify zero energy before hands go in.
The verification step is the one that saves people, and it is the one most often skipped.

**NFPA 70E.** The consensus standard for electrical safety in the workplace: approach boundaries,
arc flash risk assessment, PPE. Cite it, link the free access viewer, do not reproduce its tables.

**Qualified person.** A defined term, not a compliment. It means demonstrated skill and knowledge on the
specific equipment and its hazards.

**Arc flash.** The hazard this whole discipline is organized around. No tool in this repo calculates
incident energy. That is an engineered study's job, and a wrong number burns somebody.

---

## Communications

**Modbus.** Simple, old, everywhere. Registers only, no native types, so the register map tells you how
to decode. See project 05.

**DNP3.** Utility oriented, has timestamps and report by exception.

**BACnet.** Building systems, mechanical side.

**IEC 61850.** Substation automation. Includes GOOSE, fast peer to peer messaging between relays.
