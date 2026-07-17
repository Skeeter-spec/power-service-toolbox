# 07 Switching order and LOTO planner. Sources.

Citations only. Where a source is free, the link goes to the publisher so you fetch it from them.

Each entry says how far it was actually read AND whose copy was read, because those are different
claims and the difference is the whole point of this repo. See `tools/check_sources.py`.

**This project's sources are the strongest in the repo, on both axes at once, and that is worth saying
plainly because the previous two projects were not.**

| | 01 (WP75) | 02 (GE 850) | 07 (BPA S-6) |
|---|---|---|---|
| Read at | publisher | **a distributor's re render** | **publisher, no redirect** |
| Licence | free, but copyrighted | free, but copyrighted | **public domain** |
| Publishes its own answer | a prose verdict | 210 numbers | **a stated rule AND a worked example** |

02 verifies against a document this repo is not allowed to reproduce, fetched from a distributor's
document store because GE's own copy is login walled. **07 verifies against a federal agency's own
work, downloaded from that agency's own domain, that nobody owns.** That is a better foundation than
either of the projects before it.

## Source audit

Every citation in this file, and how far it was actually taken. Levels, strongest first:
**TRACED** (read, and figures or data traced out) · **READ IN FULL** · **FETCHED, NOT READ** ·
**LOCATED ONLY** (URL resolves, content unverified) · **CITED, UNREAD** (named by number, never
opened) · **GATED, UNREAD** (paywalled, no content used). `Read at` is a separate axis:
**PUBLISHER** · **MIRROR** · **NONE**.

| Source | Level | URL | Read at |
|---|---|---|---|
| BPA Operating Bulletin No. 2 / Accident Prevention Rule S-6, Switching and Clearance Procedure, Oct 1 2025 | TRACED | https://www.bpa.gov/-/media/Aep/customers-and-contractors/safety/switching-and-clearance-procedure.pdf | PUBLISHER |
| 29 CFR 1910.269, Electric power generation, transmission, and distribution (2024 edition) | TRACED | https://www.govinfo.gov/content/pkg/CFR-2024-title29-vol5/pdf/CFR-2024-title29-vol5-sec1910-269.pdf | PUBLISHER |
| BPA Accident Prevention Rule S-6, PRIOR edition, Oct 1 2022 (used to test whether the rule is stable) | READ IN FULL | https://www.bpa.gov/-/media/Aep/customers-and-contractors/safety/october-2022-switching-and-clearance-procedure.pdf | PUBLISHER |
| Snohomish County PUD, Switching and Clearance Manual (independent corroboration of the ordering rule) | TRACED | https://switching.snopud.com/Content/Resources/switching_and_clearance.pdf | PUBLISHER |
| 29 CFR 1910.147, The control of hazardous energy (lockout/tagout), application sequence | READ IN FULL | https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147 | PUBLISHER |
| Bureau of Reclamation FIST 1-1, Hazardous Energy Control Program | TRACED | https://www.usbr.gov/power/data/fist/fist1_1/FIST_1-1.pdf | PUBLISHER |
| Bureau of Reclamation FIST 1-2, Conduct of Power Operations | TRACED | https://www.usbr.gov/power/data/fist/fist1_2/FIST%201-2%20Final%20(1-25-2013).pdf | PUBLISHER |
| DOE-HDBK-1092-2013, DOE Handbook: Electrical Safety | FETCHED, NOT READ | https://www.energy.gov/sites/default/files/2026-04/DOE-HDBK-1092-2013.pdf | PUBLISHER |
| WAPA Power System Switching Procedure training page | LOCATED ONLY | https://www.wapa.gov/training/power-system-switching-procedure/ | PUBLISHER |
| NFPA 70E | GATED, UNREAD | none | NONE |
| IEEE 3007.3, Recommended Practice for Electrical Safety in Industrial and Commercial Power Systems | GATED, UNREAD | none | NONE |

Read that table before the prose. **The top two rows are what this project's verify phase rests on,
and both were re read at the publisher by the session that wrote this file**, not inherited from a
research pass. That distinction exists because the last time it was not made, it was wrong: see 02.

---

## The primary, and why it is the best source in this repo

**Bonneville Power Administration, Operating Bulletin No. 2, Accident Prevention Rule S-6, "Switching
and Clearance Procedure," effective October 1, 2025.** 86 pages. Free, no login, direct PDF.

> Verified: downloaded from `bpa.gov` with curl. HTTP 200, no cross host redirect (the effective URL
> is the requested URL). The file's own metadata names a **BPA employee** as author and Microsoft Word
> as the creator, so this is an original, not a third party's re render of one. The cover names the
> agency, the bulletin number, the rule number, and two BPA officers. Sections IV and X were read
> directly, and the Example 1 illustration was rendered and read as an image rather than inferred from
> the text layer.

Two things make it stronger than 01's WP75 and 02's GE manual:

**1. It is public domain.** BPA is a federal agency inside the US Department of Energy, and a work
prepared by a federal employee in their official duties carries no copyright (17 USC 105). 01 and 02
both verify against documents that are free to download and still fully copyrighted, which is why
neither repo directory contains its primary and why every quote in them is measured. This document has
no such constraint.

**That claim was checked rather than assumed, and the check is the point.** 02 learned the hard way
that **a document's licence is not uniform**: TM 5-811-14 is a US Army document, and the one paragraph
02 wanted turned out to be IEEE 242 material reprinted under a permission granted to the Army. So this
document was searched, all 86 pages, for "reprinted", "permission", "copyright" and "©". **Eleven hits,
all of them the word "permission" in its operational sense** (permission from the Dispatcher to
switch). Zero reprint notices. Zero copyright notices. The licence here really is uniform.

**2. It was read at the publisher, and 02's was not.** No distributor, no CDN, no scan site, no
university handout. This is the row 02 could not honestly write.

## What it publishes: a stated rule, and its own worked example of that rule

**The rule** (Section IV.4.C, the document's own page label P-8, PDF page 12 of 86), quoted verbatim:

> "Each power circuit breaker to be operated or checked shall be identified by its designated System
> Operations number and name.
> PCB(s) shall be checked open before operating isolating devices."

That second sentence is a flat imperative, and it is the whole gate. **Load interrupting devices are
checked open before non load break isolating devices are operated.** No arithmetic, no tolerance, no
convention: a sequence either honors it or it does not.

**The worked example** (Section X.2, "Tagging for Clearances", Example 1, page label P-45, PDF page 49),
quoted verbatim:

> "Assume a Work Clearance is requested for transmission line maintenance on the Central-East Columbia
> No. 3 230 kV line in the following illustration.
> Normal Dispatching/SCADA operating procedures would de-energize the Central-East Columbia No. 3
> 230 kV line by opening PCBs A-10 and A-3 by supervisory control.
> A Switchman at each terminal of the line would write a Switching Order to place the appropriate PCB
> on Local control and to open or check open and tag the appropriate disconnect switches. The ground
> switches at both terminals would remain open, unless otherwise agreed to by the Clearance applicant
> and the Dispatcher."

**The document applies its own rule.** The breakers (A-10, A-3) are opened first, by supervisory
control. Only then are the isolating disconnects operated and tagged. That is IV.4.C, executed, on a
named circuit with named devices. A source that states a rule and then obeys it in its own example is
a source you can build a gate on, in exactly the way 02's manual agreeing with itself three ways was.

**The illustration is a device level one line**, and it was rendered and read as an image rather than
reconstructed from the text layer. It carries: the Central-East Columbia No. 3 230 kV line; at the
Central terminal, PCB A-10 with **three** disconnects and ground switch 7233; at the East Columbia
terminal, PCB A-3 with three disconnects and ground switch 7243. Ten operable devices across two
terminals. That is the model 07 encodes, as connectivity and device kind, the same way 01 encoded
WP75's figures.

🔴 **CORRECTED 2026-07-17, and the error is instructive enough to leave visible.** This paragraph
previously said "PCB A-10 with **a disconnect either side** of it". That is a disconnect short, and
the missing one is the entire point of Example 1. Re reading the figure at 9x and counting blades
gives **three disconnects per terminal**, and the prose names all three across two examples that share
the one figure: `A-10 Line Side Disconnect` and `A-10 Auxiliary Bus Disconnect` (Example 1, P-45),
plus `A-10 Main Bus Disconnect` (Example 2, P-47). The auxiliary bus disconnect hangs off the **line
node**, not off the breaker, and it is a bypass: close it and the line is fed from the auxiliary bus
with A-10 out of the picture. **A model built from the old sentence would answer Example 2's question
when asked Example 1's, and would call a line isolated while it sat fed from the auxiliary bus.** The
device COUNT in the old sentence ("roughly ten") was right the whole time, which is how the wrong
description survived: the number agreed, so nobody re counted the blades. Note also that the figure
labels only the line, the PCBs and the ground switches. **It does not label a single disconnect**, so
the assignment above comes from the prose, not the drawing, and the drawing alone cannot support it.

## The second stated rule: grounding order, from a different publisher

**29 CFR 1910.269(n)(6), "Connecting and removing grounds"**, read at govinfo.gov, extracted with
PyMuPDF. Quoted verbatim:

> "(i) The employer shall ensure that, when an employee attaches a ground to a line or to equipment,
> the employee attaches the ground-end connection first and then attaches the other end by means of a
> live-line tool."

> "(ii) The employer shall ensure that, when an employee removes a ground, the employee removes the
> grounding device from the line or equipment using a live-line tool before he or she removes the
> ground-end connection."

Attach the ground end first, then the line end. Remove the line end first, then the ground end. **The
removal order is the reverse of the connection order**, and the regulation states both halves rather
than saying "reverse", which means it can be asserted directly instead of inferred.

This is a second checkable rule, from a second public domain publisher, and it covers the part of a
switching order that BPA's S-6 defers elsewhere (see gaps).

⚠ **A transcription trap, recorded because it nearly landed.** The CFR text layer interleaves the
printer's page furniture INTO THE MIDDLE OF THE SENTENCE. The raw extraction of (ii) reads:

> "...using a live-line tool before he or she `VerDate Sep<11>2014 13:59 Dec 16, 2024 Jkt 262121 PO
> 00000 Frm 00802 Fmt 8010 Sfmt 8002 Y:\SGML\262121.XXX 262121 skersey on DSK4WB1RN3PROD with CFR 793
> Occu. Safety and Health Admin., Labor § 1910.269` removes the ground-end connection."

A mechanical quote embeds a printer's job number inside a federal regulation. The same document also
hyphenates across line breaks ("em- ployees"), which is why a literal search for the paragraph heading
finds nothing and a careless reader concludes the paragraph does not exist. Same family as 02's
flattened fraction bar and TM 5-811-14's two column stitching: **the text layer is not the document.**

## How this source was checked: two workers, opposite instructions, same answer

Both hunts ran in parallel, independently, neither knowing what the other found, on purpose
(a load bearing lookup gets duplicated: agreement is evidence, disagreement is a finding).

They were pushed **in opposite directions on purpose**: one was told to start at OSHA, the other was
told explicitly NOT to start at OSHA and to start with utility switching and tagging manuals instead.

**They converged on the same document, the same rule, at the same page, and the same worked example**,
and both independently found the same corroborator (Snohomish County PUD). Two different search paths
landing on one document is evidence about the document. One worker finding it twice would not be.

Everything the verify phase rests on was then re read at the publisher by the session writing this
file, because a worker's honest grade is a warning and not a fix. Both workers' quotes and page labels
survived that re read exactly.

## Deliberately not used

- **NFPA 70E and IEEE 3007.x.** Gated and copyrighted. Cited by number, content never used. This
  project does not need them: the rules above are public domain and say what it needs said.
- **A "typical" switching order, invented.** If the tool ever shows a sequence, it shows one it can
  point at. This repo does not get to make up a procedure and then grade against it.

## Known gaps, stated rather than hidden

- **BPA S-6 never prints a filled in Switching Order.** The document describes in prose what a
  compliant order for Example 1 would accomplish, and it states the ordering rule separately, but there
  is no numbered "Step 1 / Step 2" order form filled in anywhere in 86 pages. **So verify cannot diff
  against a published step list, because no step list is published.** Do not let a future session claim
  otherwise. Re read at the publisher 2026-07-17: still true.

  🔴 **BUT THIS GAP WAS LOAD BEARING IN THE WRONG DIRECTION, corrected 2026-07-17.** It used to open
  with "this is the most important gap and it shapes the whole verify phase", and that framing treated
  the absence of a step list as the binding constraint on what 07 could verify. It is not.
  **BPA does not print the steps. It prints THE LIMITS OF A CLEARANCE, on named devices, in at least
  eight worked examples**, and the limits are the harder and more valuable half: the steps are local
  and situational, the limits are a property of the circuit and the job. 07's README already promised
  "verify isolation boundaries and the zone of protection", which is precisely what the document
  publishes. The gap is real and narrow; it was recorded as though it were wide.

  **The examples this file never recorded**, all in section X, all with their own published answers:
  **X.2 Example 2 (P-47)** a Test Clearance on A-10 PCB itself, whose limits are the Line Side and
  **Main Bus** disconnects. Same figure as Example 1, different question, different answer, and each
  answer is wrong for the other question. That pair is the single best verify fixture in this project
  and it was sitting one page past where the source phase stopped reading.
  **X.2 Examples 3 and 4 (P-48, P-49)** multiple and adjacent clearances, a limit COMMON to two
  clearances carrying two Do Not Operate tags, and stated tag removal order.
  **X.2 Example 5 (P-51)** a transformer bank clearance whose limits include the **open low voltage
  device ACB-1**, because the alternate station service source can back feed into the clearance.
  🔴 **RE READ AND TRACED 2026-07-17, AND IT IS NOT ENCODED. THE ANSWER IS PUBLISHED; THE MECHANISM
  IS NOT, AND THE DIFFERENCE IS THE FINDING.** It is the largest published answer in the document
  (five devices, the only limits crossing a voltage class) and it was the obvious next fixture.
  Verbatim, P-51: *"A-9 Transformer Side and Auxiliary Bus and B-2 Transformer Side and Auxiliary
  Bus Disconnect switches will be tagged as Clearance limits with Do Not Operate tags. For the
  purposes of controlling energization of the equipment included within the Clearance from the
  alternate station service source, a Do Not Operate tag shall also be placed on the open low
  voltage isolating device ACB-1 as a Clearance limit."*
  **What the figure gives, traced at 20x and solid:** A-9 and B-2 mirror the Example 1 arrangement
  exactly (a main bus disconnect, the PCB, a transformer side disconnect, and an auxiliary bus
  disconnect hanging off the transformer node). The trunk from the bank **CROSSES the B main bus
  with no junction dot**, a crossover rather than a connection. Assume otherwise and the model shorts the
  transformer to the bus.
  **What it does not give:** BPA's purpose clause names the alternate station service source as the
  hazard. Tracing the ATS at 22x, the pivot is the common and it feeds the Station Service Loads,
  selecting between a normal contact (fed through ACB-1 from the station service transformer) and an
  alternate contact (fed from the alternate source). **An open transition transfer switch never
  joins those two contacts, so on the drawing as traced the alternate source has NO PATH to ACB-1**,
  and BPA's stated rationale cannot be reproduced without assuming a transfer mechanism the document
  never states. Whether that ATS parallels its sources on transfer is a VENDOR fact, and BPA does not
  name the vendor. See 03, which proved there is no "the" ATS.
  ⇒ Encoding it means picking whichever transfer model makes the published answer come out. That is
  an answer key grading itself (#21), on a five device answer where the model would be chosen to fit.
  **It stays out, stated, until the mechanism is found in S-6 or put to someone who runs one.** Same
  shape as the rule's missing rationale below: assert what is published, decline to publish the
  physics in the source's voice.
  **X.3 Example 1 (P-52)** a second topology: a **Bypass Disconnect in parallel** with a PCB and both
  its disconnects. Open the PCB and the feeder is still energized. This is 01's one way bus tie bug in
  a published figure, and it is the fixture that forces the reachability search to be undirected.
  **X.5 Example 1 (P-53)** transformer differential relays must be out of service the entire time the
  Auxiliary Bus Disconnect is closed: the protection zone moves when the bypass closes.
  **X.5 Example 2 (P-54)** a PCB "inadequate for line-dropping" in a breaker and a half bay, with the
  relaying modified so it is never the last to open. **Not every breaker can drop the line**, so a tool
  that prints "open the PCB" is assuming something this source explicitly contradicts in one bay.

- **The rule's rationale is NOT published, checked 2026-07-17.** IV.4.C states the order and gives no
  reason. All 86 pages were searched for "load break", "under load", "interrupt", "load current": the
  rule is bare. What the document does instead is name a **"Load-Break Disconnect (LBD)"** as its own
  device class (P-54), distinct from both the PCB and the ordinary isolating device. That distinction
  is evidence, and it is not a statement, and this repo does not get to publish the physics lesson as
  though BPA taught it. Assert the ORDER, which is published. Do not explain it in BPA's voice.
- **BPA's portable grounding rules (G-1, G-7) are in a separate BPA Accident Prevention Manual that
  was not fetched.** S-6 section VI.8 defers to it. So BPA's own full portable ground install and
  remove sequence has not been read here; the grounding order above comes from 29 CFR 1910.269(n)(6),
  a different organization. Do not attribute the grounding order to BPA.
- **Reclamation FIST 1-1 and FIST 1-2 contain NO filled in worked switching order.** This is a real
  negative finding from reading both in full, not a failure to look. Both repeatedly reference a
  Switching Procedure Form (SPF) that carries the device sequence, and the form is only ever shown
  blank. If a filled SPF exists publicly it was not found.
- **The OSHA lockout/tagout sequences (1910.147(d), 1910.269(d)(6)) were read through a fetch tool's
  summarizer, not extracted from a PDF directly.** Two independent fetches returned materially
  identical five step language, which corroborates, but it is a weaker chain of custody than the CFR
  paragraphs extracted with PyMuPDF. Graded READ IN FULL rather than TRACED for exactly that reason.
  **Re read them at the publisher before anything rests on them.**
- **Neither BPA (86 pp) nor the SnoPUD manual (105 pp) was read cover to cover.** Sections IV, VI and
  X of BPA were read and traced. No claim of exhaustive coverage, and no claim that the rest of either
  document is internally consistent.
- **1910.269 Appendix A is not what its name suggests.** Its "Flow Charts" are jurisdictional decision
  trees (does 1910.269 or Subpart S apply), not procedural step sequences. Ruled out; recorded so it
  is not re spent.
- **DOE-HDBK-1092-2013 contains no switching order content** despite being the obvious candidate by
  title. Fetched, not read in full; the negative is from a targeted search inside it.
- **TVA has no public switching manual that was located.** What surfaced were Inspector General audit
  reports ABOUT TVA's switching procedures, one describing findings of steps "not performed in
  sequence as required", which implies an underlying procedure that states a sequence. Never fetched.
  A real unresolved lead, not a dead end.
- **WAPA's actual switching manual was never reached** (a TLS certificate error on the referring page).
  Graded LOCATED ONLY, and that grade is generous.
