# A switching order, and the thing BPA publishes that I did not expect

Working notes, written while building project 07. My own words. Sources cited.

Unlike 01 and 02, **I am allowed to quote this one at length.** BPA S-6 is a federal agency's work
under 17 USC 105, so it is public domain, and the licence was checked per paragraph rather than per
cover (see `../projects/07-switching-order/sources/SOURCES.md`). Every quote below is verbatim from
the publisher's own PDF, re read at bpa.gov by me rather than inherited from a research pass.

---

## The thing I got wrong first

I went looking for **a switching order**. A numbered list. Step 1 open this, step 2 check that, the
thing a Switchman carries into the yard. Find one published, encode the circuit, generate the list,
diff mine against theirs. That is how 02 worked: 210 published numbers, reproduce all 210.

There isn't one. Not in BPA S-6's 86 pages, not in Reclamation FIST 1-1 or 1-2. FIST references a
Switching Procedure Form that carries the device sequence and only ever prints it blank. Nobody
publishes a filled in switching order, because a switching order is written for one circuit on one
day by the Switchman standing in front of it.

The previous session found that and stopped there, and wrote down the honest conclusion it implies:
verify can assert the RULE, but it cannot diff against a published step list, because no step list is
published. That is true. I re read it and it is still true.

**It is also not the interesting half, and stopping there nearly cost this project its best material.**

## What BPA publishes instead: the limits

BPA does not print the steps. **BPA prints the answer to a harder question, over and over:**

> given this circuit, and this thing you want to work on, **which devices are the boundary?**

That is the clearance limit. It is the set of isolating devices that stand between the work and every
source that could energize it. The steps are local and situational. The limits are a property of the
circuit and the job, they are the thing you get wrong and die, and **BPA works them out for you, in
prose, on named devices, in at least eight separate examples.**

That is a published worked example. It is just not shaped like 02's table.

## The rule that gates everything

Section IV.4.C, the document's own page label P-8, PDF page 12. Verbatim:

> "Each power circuit breaker to be operated or checked shall be identified by its designated System
> Operations number and name.
> PCB(s) shall be checked open before operating isolating devices."

A flat imperative. No arithmetic, no tolerance, no convention. A sequence either honors it or it does
not, which is exactly what makes it a gate a program can check.

**What the document does NOT say, and I checked before writing the sentence I was about to write.**
I was going to explain that the rule exists because a disconnect has no interrupting rating and
operating one under load draws an arc it cannot clear. **BPA never says that.** I searched all 86
pages for "load break", "under load", "interrupt", "load current". The rule is stated bare, with no
rationale attached.

What the document does instead is name a **"Load-Break Disconnect (LBD)"** as its own device class
(P-54), separate from both the PCB and the ordinary isolating device. That is the distinction
existing in the document's own vocabulary. It is evidence, and it is not a statement, and those are
different things. So this repo gets to assert the ORDER, because the order is published. It does not
get to publish the physics lesson as though BPA taught it.

## The three device kinds, and the third one is the one I would have missed

| Kind | In the figure | Operated by | In the rule |
|---|---|---|---|
| PCB (power circuit breaker) | square box | supervisory control, or Local at the panel | checked **open first** |
| Isolating device (disconnect) | blade with two tick marks | a Switchman, in the yard | operated **after** |
| Ground switch | blade to a ground symbol | a Switchman | stays open unless agreed |

## The topology BPA actually draws, and where the repo's own notes were wrong

The Example 1 illustration (P-45) is a device level one line, and it is the model 07 encodes. The
repo's `sources/SOURCES.md` described it as "PCB A-10 with a disconnect either side + ground switch
7233 at Central". **That is a disconnect short, and the missing one is the whole point of Example 1.**

I rendered the figure at 9x and read it as an image rather than trusting the text layer, and counted
the blades: **three disconnects per terminal**, not two. The figure labels only the line, the PCBs
(A-10, A-3) and the ground switches (7233, 7243). It does not label a single disconnect. So the
figure alone cannot tell you which blade is which, and any assignment is inference.

**The prose resolves it, across two examples that share one figure:**

- Example 1 (P-45) names `A-10 Auxiliary Bus Disconnect` and `A-10 Line Side Disconnect`.
- Example 2 (P-47) names `A-10 Line Side Disconnect` and `A-10 Main Bus Disconnect`.

Three distinct names. Three blades. They reconcile exactly, and the topology falls out:

```
                         ground switch 7233 (open)
                                  |
    auxiliary bus ---[A-10 Aux Bus Disc]--- LINE NODE ---[A-10 Line Side Disc]---[A-10 PCB]---[A-10 Main Bus Disc]--- main bus
                                                |
                              Central-East Columbia No. 3 230 kV line
                                                |
                                     (mirrored at East Columbia:
                                      A-3, ground switch 7243)
```

The auxiliary bus disconnect hangs off the **line node**, not off the breaker. It is a bypass: close
it and the line is fed from the auxiliary bus with A-10 out of the picture entirely.

## Why that third disconnect is the whole lesson

Read the two examples as two queries against one circuit, because that is what they are.

**Example 1. Work Clearance on the LINE.** Published limits: the Auxiliary Bus Disconnect and the
Line Side Disconnect, at each terminal. Verbatim (P-45):

> "Normal Dispatching/SCADA operating procedures would de-energize the Central-East Columbia No. 3
> 230 kV line by opening PCBs A-10 and A-3 by supervisory control.
> A Switchman at each terminal of the line would write a Switching Order to place the appropriate PCB
> on Local control and to open or check open and tag the appropriate disconnect switches."

Ask why the Main Bus Disconnect is **not** a limit. Because the Line Side Disconnect already stands
between the line and A-10, and therefore between the line and the main bus. Opening it twice buys
nothing.

**Example 2. Test Clearance on A-10 PCB itself.** Published limits: the Line Side Disconnect and the
**Main Bus Disconnect**. Verbatim (P-47):

> "In the switchyard, the Switchman will check open and tag A-10 Line Side Disconnect and open and
> tag A-10 Main Bus Disconnect with red Do Not Operate tags"

Now the Auxiliary Bus Disconnect is not a limit, because it does not touch A-10.

**Same circuit. Different job. Different boundary. Two published answers, and each one is wrong for
the other question.** A tool that had encoded "a disconnect either side of the breaker" would produce
Example 2's answer for Example 1's question and never notice. That is not a rendering nitpick. **It
is the difference between isolating a line and leaving it fed from the auxiliary bus.**

This is why the model gets traced from the figure with eyes, and why the shorthand in a notes file is
not a model.

## The parallel path, which BPA draws on purpose

Section X.3 Example 1 (P-52) publishes a second topology, and it is the one that breaks naive
isolation logic:

```
    feeder ---+---[disc]---[PCB]---[disc]---+--- bus
              |                             |
              +------[Bypass Disconnect]----+
```

A bypass disconnect in parallel with the breaker and both its disconnects. **Open the PCB and the
feeder is still energized**, through the bypass. Any isolation check that reasons "the breaker is
open, therefore the load is dead" is wrong on this circuit, and BPA prints the circuit.

01 already learned this shape the hard way: a bus tie encoded one way, so one side could never back
feed the other, found by mutation testing. **A tie that conducts one way is not a tie, and a bypass
that the model cannot see is not a bypass.** Any isolation reachability search here has to be
undirected, and this figure is the fixture that proves it.

## Two more things the source says that a simulator would love to ignore

**Not every breaker can drop the line** (X.5 Example 2, P-54). Verbatim:

> "Assume one PCB in a bay of a breaker-and-a-half configuration has been determined to be inadequate
> for line-dropping.
> Protective relay schemes have been modified to prevent this PCB from being the last one to open by
> relay operation"

A tool that prints "open the PCB" assumes every PCB can interrupt what is flowing through it. BPA
documents a bay where one cannot, and where the relaying was changed to guarantee it never has to.

**Opening a bypass changes what the relays can see** (X.5 Example 1, P-53). Verbatim:

> "Current Transformer connections require that the Transformer Differential relays be out of service
> during the entire time that the Auxiliary Bus Disconnect is closed."

Close the auxiliary bus disconnect and the current stops flowing through the CTs the differential
relies on. The protection zone moves. This is the literal "zone of protection" that 07's README
promises to verify, stated by the source, on a named device.

**And an energization path is not always high voltage** (X.2 Example 5, P-51). A Work Clearance on a
transformer bank takes a Do Not Operate tag on the **open low voltage device ACB-1**, because the
alternate station service source can back feed the equipment inside the clearance. The boundary is
wherever a source is, not wherever the interesting voltage is.

## What this means for the build

07 encodes a device level graph, because 01 cannot express one: 01's eleven node types contain no
breaker and no switch, and the interlock the plan sold ("07 plans switching orders on 01's one line")
was priced on a reuse that does not exist. That finding stands and is recorded in `PROGRESS.log`.

What changed with this read is the **verify target**:

- ❌ Not: generate a step list and diff it against a published one. **No step list is published.**
  Do not let a future session claim otherwise.
- ✅ Instead: **given a published topology and a published clearance request, compute the limits, and
  reproduce the limits BPA publishes.** Examples 1 and 2 on one figure, then X.3's bypass, then
  Example 5's low voltage back feed.
- ✅ And assert the ordering rule IV.4.C against any sequence the tool emits: **PCBs checked open
  before isolating devices are operated.**

The refusals matter as much as the answers, in the way 03's Section F does:

- No step list is published, so **the tool must never present a generated sequence as BPA's**.
- The rule's rationale is not published, so the tool does not explain the rule in BPA's voice.
- "Inadequate for line-dropping" is a real published condition, so **the tool may not assume every
  PCB can interrupt** without saying that the assumption is the tool's own.
- This is not a field tool. A clearance is a human procedure with a Dispatcher on the other end of
  it, and nothing here is a substitute for one.

## Sources

- BPA Operating Bulletin No. 2 / Accident Prevention Rule S-6, "Switching and Clearance Procedure",
  October 1 2025, 86 pp. Read at the publisher (bpa.gov). Public domain, 17 USC 105.
  Rule IV.4.C at P-8. Examples at P-45 through P-61.
- 29 CFR 1910.269(n)(6), grounding order, read at govinfo.gov. Attach the ground end first, then the
  line end. Remove the line end first, then the ground end. The regulation states both halves rather
  than saying "reverse", so both can be asserted rather than inferred.

See `../projects/07-switching-order/sources/SOURCES.md` for the full audit, the provenance check, and
the gaps.
