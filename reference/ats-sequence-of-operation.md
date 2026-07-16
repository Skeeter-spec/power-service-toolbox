# The ATS sequence of operation, and why this repo will not tell you "the" defaults

Working notes, written while building project 03. My own words. Sources cited, never copied.

---

## The thing I got wrong first

I went looking for **the** ATS sequence of operation. The timer table. The one an automatic transfer
switch runs, that you could put in a simulator and call correct.

There isn't one. There is ASCO's, and there is Russelectric's, and they do not agree.

I traced both. The **structure** agrees completely: both sense the normal source, both ride through a
momentary outage before bothering the engine, both start the engine, both wait for the emergency
source to be acceptable, both transfer, both run, both wait before coming back, both cool the engine
down unloaded before stopping it. Every ATS does those things in that order.

The **numbers** are not even close:

| | ASCO Group 5 | Russelectric Model 2000 |
|---|---|---|
| override a momentary normal outage | 1 second | 3 seconds |
| retransfer to normal | 30 minutes | 300 seconds |

Same job, same order, 6x apart on one row and 1 second against 3 on another. Neither is wrong.
They are two manufacturers' engineering judgement about the same tradeoff, and a switch on a wall
runs whichever one is printed in its own manual.

So a simulator that prints "the ATS transfer timers" is asserting an industry standard that does not
exist. **This one names the vendor whose sequence it is running, on every screen.** That is the same
refusal project 01 makes when it declines to print a tier, arrived at from a completely different
direction, which is what makes me think it is the actual rule and not a quirk of one document.

## Why each timer is there. This is the part worth knowing

The timers are not padding. Each one exists to stop the switch doing something specific and stupid,
and once you can name the stupid thing, you never forget the timer. ASCO's feature numbers, from its
own Group 5 Controller User's Guide (Rev N page 9), with my reading of what each is for:

**1C, override momentary normal source outages. Default 1 second.**
The utility blinks. A recloser operates, a squirrel finds a bushing, and 400 milliseconds later
everything is fine. Without 1C the switch takes that blink at face value and cranks a diesel engine
that will now run, transfer, and cool down for the next half hour over an event that already ended.
1C is the switch declining to panic. It is also why a room full of people who all saw the lights
flicker will tell you "the generator didn't start" and be describing correct behaviour.

**Engine start, then wait for the emergency source to be acceptable.**
The engine starting is not the same event as the generator being usable. It has to come up to
voltage and frequency and stay there. The switch is watching pickup thresholds, not a tachometer.

**2B, transfer to emergency. Default 0.**
Zero by default, and the zero is interesting: by the time the emergency source has passed its pickup
thresholds, ASCO sees no reason to wait longer. This timer exists for sites that need to stagger
several switches so they do not all slam onto one generator in the same cycle.

**3A, retransfer to normal. Default 30 minutes if normal failed.**
The utility comes back. Thirty minutes is the switch refusing to believe it. A utility that just
failed is a utility that is actively being worked on, and it may come and go several times while
crews switch around the fault. Retransferring instantly means dropping the load onto something
unstable and then doing the whole start cycle again. So it sits on the generator, which is already
running and known good, and waits out the flapping. **The same timer defaults to 30 seconds if the
transfer was only a test**, because nothing failed and there is nothing to distrust.

**2E, unloaded running. Default 5 minutes.**
The load is already back on the utility. This timer is entirely for the engine: it keeps it running
with no load on it so it comes down in temperature under its own cooling before it stops. Skip it and
you are heat soaking a hot engine the moment its coolant pump stops turning.

Read them in order and the sequence stops being a table to memorize. It is one long argument about
what deserves to be believed: not the blink (1C), not the returning utility (3A), and not the
tachometer (pickup thresholds).

## Three transition types, and what the load feels

**Open transition.** Break before make. The switch opens the normal contacts, and only then closes the
emergency ones. The two sources are never connected. The load sees a genuine dead interval, however
short. This is the default behaviour and the safe one.

**Closed transition.** Make before break. Both sources are connected at once, briefly, so the load
sees no interruption at all. That is a real paralleling event: for that instant, a utility and a
generator are tied together, and if they are not in step with each other you are shorting two stiff
sources through the switch. So it cannot happen unless they agree. ASCO states the criterion itself,
verbatim (Rev N page 25):

> "Three criteria must be met for the sources to be considered in-sync. The phase difference between
> the sources must be less than 5 degrees, the frequency difference must be less than 0.2 Hz, and the
> voltage difference must be less than 5%."

That sentence is the reason project 03 can have a verify phase at all. It is a published, numeric,
pass or fail verdict. Most ATS literature says "reliable transfer" and gives you nothing to check.

**Delayed transition.** Open transition with a deliberate dwell in the middle, both sources open, load
sitting dead on purpose. It looks like a worse open transition until you think about motors. A large
motor that is still spinning is still generating, and its residual voltage decays over a second or
so, out of phase with wherever the incoming source happens to be. Close onto it too early and the
motor sees the vector difference, not the line voltage. The dwell is there to let that decay.

## In phase monitor is not sync check. Do not transplant the number

This one is a trap, and I nearly walked into it.

Both features are about phase. They are **different features, on different switch models**, and ASCO's
own table says so: the in sync rows are marked `7ACTS, 7ACTB only` and the in phase monitor is marked
`7ATS or 7ATB`.

- **Sync check** belongs to the **closed** transition. It is a permissive: the two sources are about to
  be paralleled, so prove they are in step first. That is where the 5 degrees lives.
- **In phase monitor** belongs to the **open** transition. Nothing is ever paralleled. It just waits for
  the moment the two sources drift through phase coincidence and transfers there, so a motor load does
  not take a slug. It is timing an open transition well, not permitting a parallel.

**ASCO publishes no phase angle window for the in phase monitor.** It publishes a time delay and
nothing else. The 5 degrees is the closed transition's number, for a different feature, on a switch
you may not even have. Carrying it across because both features have the word "phase" in them would be
inventing a spec and citing ASCO for it. The app does not claim an angle for the open transition
monitor.

## What this tool refuses to do, and why

Same shape as 01 printing no tier, and 02 printing no coordination verdict. The refusals are the
product.

1. **It does not present anyone's defaults as "the" defaults.** It names the vendor. See above.
2. **It ships no extended parallel time control.** This is the one that hurt, because it is the most
   interesting number in the whole subject: how long two live sources are allowed to sit in parallel
   during a closed transition. A 2004 revision of ASCO's manual published a default of 0.5 second and
   an adjustable range. **The current revision has deleted the row and calls it "factory preset",
   printing no value at all.** So the honest options were to expose a slider citing a fourteen year old
   superseded number, or to name the parameter, say ASCO factory presets it, and stop. It stops.
3. **It reports the manual's self contradiction rather than resolving it.** ASCO's features table says
   the Shed Load in phase timer is 1.5 second; its narrative on the next page says "3 second default".
   Both revisions, fourteen years apart, print both numbers. I do not know which is right and neither
   does anyone reading the manual. Quietly picking one and drawing a confident timing chart over it
   would be the worst thing this app could do. It surfaces the disagreement.
4. **It quotes no NFPA 110.** The ten second start requirement everyone cites is real and NFPA 110 is
   gated and unread here. The figure reaches this repo only through Cummins's free white paper, which
   is a manufacturer's paraphrase, not NFPA's words. Fine as motivation, never presented as the text.

## The sourcing lesson this project paid for

Full detail in `projects/03-ats-sequence/sources/SOURCES.md`. The short version, because it changed a
rule this repo already had:

The copy of the ASCO manual this project read first was a distributor's mirror. It is a clean,
authentic, unstamped ASCO file. Every number in it that this project verifies against is **correct**.
It is also **Rev K, from 2004**, and the manufacturer serves **Rev N, from 2018**. Fourteen years
stale, covering a product line the current document has dropped. Nothing inside the file says so.
No amount of reading it more carefully would ever have surfaced that, because the file is not lying.
Only the publisher's shelf knows what is current.

And then the edge, which I did not expect: **Rev N is wrong where Rev K was right.** Rev N regressed
the labels on the frequency table to say "Voltage" while its own footnotes still say frequency. The
values are fine. The labels broke. So the rule is not "newer is better". The rule is that the
publisher's current copy is authoritative **about what is current**, which is a narrower claim than it
sounds, and both copies stay in the audit table.
