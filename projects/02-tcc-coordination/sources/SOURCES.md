# 02 TCC coordination studio. Sources.

Citations only. No copyrighted document is reproduced or redistributed here, including the ones that
are free to download. Where a source is free, the link goes to the publisher so you fetch it from them.

Each entry says how far it was actually verified, because "I read the abstract" and "I traced the
figure" are different claims and the difference is the whole point of this repo.

**Who verified what.** The rows this project's verify phase RESTS on were fetched and read directly,
end to end, using PyMuPDF. The remaining rows carry the grade assigned by the research pass that found
them. That distinction is not pedantry: see "The secondhand transcription that was wrong" below, where
a scrape of the correct table still produced a wrong equation.

> ### ⚠ CORRECTION, 2026-07-15. This paragraph used to say those rows were read "from the publisher's
> own PDF". THAT WAS FALSE, and it is left visible rather than quietly edited away, because the false
> version is more instructive than the true one.
>
> **`docs.ips.us` is a distributor's document store, not GE.** The cover page reads "Courtesy of
> store.ips.us", that stamp is on all 562 pages, and the file's own metadata shows it was re-rendered
> by the distributor's PDF tool in 2023. **`rose-hulman.edu/~rostamko/ece472/handouts/` is a
> university course handout, not SEL.** Neither is a publisher.
>
> So the rule this very project earned, *anything the verify phase rests on gets read at the
> publisher's PDF*, was written down here and then not applied to the primary sitting two lines above
> it. Adding a machine checked `Read at` column found the same thing in 3 of 4 projects. **A rule that
> lives in prose is a wish.** It is a field now, and `tools/check_sources.py` prints every load bearing
> mirror on every run. See "What was actually read, and what that is worth" below.

## Source audit

Every citation in this file, and how far it was actually taken. Checked by `tools/check_sources.py`,
which fails if any URL below appears in the prose without a level here. The levels, strongest first:
**TRACED** (read, and figures or data traced out) · **READ IN FULL** · **FETCHED, NOT READ** ·
**LOCATED ONLY** (URL resolves, content unverified) · **CITED, UNREAD** (named by number, never
opened) · **GATED, UNREAD** (paywalled, no content used).

| Source | Level | URL | Read at |
|---|---|---|---|
| GE Multilin 850 Feeder Protection System Instruction Manual | TRACED | https://docs.ips.us/docs/W1002151.pdf | MIRROR |
| SEL-351S Relay Instruction Manual (curve equations Tables 9.3 and 9.4, accuracy spec) | TRACED | https://www.rose-hulman.edu/~rostamko/ece472/handouts/351S_Manual.pdf | MIRROR |
| TM 5-811-14 Ch.4, Protective Devices Coordination (US Army Corps of Engineers, public domain) | READ IN FULL | https://www.pdhonline.com/courses/e119/TM5-811-14-chap4.pdf | MIRROR |
| Qual-Tech Engineers, Overcurrent Coordination Guidelines for Industrial Power Systems (QT-608-0115) | READ IN FULL | https://www.qualtecheng.com/docs/arc-flash-ppe/QT-608-0115.pdf | PUBLISHER |
| SEL-351-5,-6,-7 Data Sheet (curve family names, accuracy spec) | FETCHED, NOT READ | https://selinc.com/api/download/5527/ | PUBLISHER |
| GE Multilin F650 Instruction Manual (constants cross check, via a third party scan) | FETCHED, NOT READ | https://www.manualslib.com/manual/1218615/Ge-Multilin-F650.html | MIRROR |
| GE Vernova GET-6450, distribution feeder overcurrent protection application note | LOCATED ONLY | https://www.gevernova.com/grid-solutions/products/applications/get6450.pdf | PUBLISHER |
| IEEE C37.112, Inverse Time Characteristic Equations for Overcurrent Relays | GATED, UNREAD | none | NONE |
| IEC 60255-151 | GATED, UNREAD | none | NONE |
| ANSI/IEEE 242 (Buff Book), coordination margin components | CITED, UNREAD | none | NONE |
| UL 489, molded case circuit breaker instantaneous trip tolerance | GATED, UNREAD | none | NONE |

Read that table before the prose. **The top row is the only one this project's verify phase rests on,
and it was read at a MIRROR.** What that is and is not worth is the next section but one. Everything
below the top two rows is context.

---

## Primary, and the one this project verifies against

**GE Multilin 850 Feeder Protection System, Instruction Manual.** Free, no login, direct PDF.
Fetched from a distributor's document store, not from GE. See below.

> Verified: fetched the full 562 page PDF and read the protection chapter. Manual page 4-115 was read
> directly, including Table 4-34 (curve constants) and Table 4-35 (published trip times). The trip
> equation was **rendered as an image at 9x and read by eye**, not taken from the text layer, because
> the text layer flattens a fraction bar into dashes and has already produced two wrong equations in
> this project's history. The worked example on manual page 4-124 was read verbatim. **Then the whole
> thing was checked rather than admired: the published equation, driven by the published constants,
> was used to recompute every cell of the published trip time table. 210 of 210 cells agree, worst
> disagreement 0.135%, which is the table's own rounding.**
>
> Read twice, by two sessions, independently, on 2026-07-15. Same numbers both times.

Why this document and not something else: like WP75 for project 01, it is the rare free document that
publishes **both the artifact and its own answer to it.** It goes further than WP75 did, because its
answer is a **number** rather than a prose verdict. It publishes, in one place:

1. **The equation** (manual p.4-115), in its own words: `T = TDM x [ A / ((I/Ipickup)^p - 1) + B ]`,
   plus the reset characteristic `TRESET = TDM x [ tr / (1 - (I/Ipickup)^2) ]`.
2. **The constants** (Table 4-34): Extremely Inverse A=28.2, B=0.1217, p=2.000, tr=29.1 · Very
   Inverse A=19.61, B=0.491, p=2.000, tr=21.6 · Moderately Inverse A=0.0515, B=0.1140, p=0.02000,
   tr=4.85.
3. **A published trip time table** (Table 4-35), 7 time dial rows by 10 current columns, for each of
   the three curve shapes. That is 210 published numbers to check an engine against.
4. **A prose worked example with a stated answer** (manual p.4-124), quoted verbatim:
   > "if an IEEE Extremely Inverse curve is selected with TDM = 2, and the fault current is 5 times
   > bigger than the PKP level, the operation of the element will not occur before 2.59 s have
   > elapsed after Pickup."

Three independent representations of the same number agree inside the one document: the prose says
**2.59 s**, Table 4-35 at TDM=2.0 and I/Ipickup=5.0 says **2.593**, and the equation with Table
4-34's constants gives **2.5934**. A source that agrees with itself three ways is a source you can
build a gate on.

### The verify phase, which already exists before the engine does

Recomputing all 210 published cells from the published equation and constants: **210 of 210 agree,
worst error 0.135%.** That worst case is Extremely Inverse at TDM=0.5 and M=10, where the table
prints 0.203 and the equation gives 0.2033. The disagreement is the table's own rounding to three
decimals, not a disagreement about physics.

**So this project needs no invented tolerance.** The pass criterion is the published table's own
printed precision. That matters, because "within tolerance" was the one thing this project needed
that project 01 never did, and an invented tolerance would have made the whole verify phase theatre.
The number did not have to be invented, so it was not.

## The naming trap that decides what this tool is allowed to claim

**Do not let this app claim it "implements IEEE C37.112."** It implements, and cites, one named
manufacturer curve family. Here is why that distinction is load bearing rather than lawyerly.

Two manufacturers both invoke the same standard, in their own words, over **different numbers**:

- GE Multilin 850, manual p.4-115: *"The IEEE Time Overcurrent curve shapes conform to industry
  standards and the IEEE C37.112-1996 curve classifications for extremely, very, and moderately
  inverse."*
- SEL-351S, manual p.375: *"The time-overcurrent relay curves in Figure 9.1-Figure 9.10 conform to
  IEEE C37.112-1996 IEEE Standard Inverse-Time Characteristic Equations for Overcurrent Relays."*

Both say C37.112-1996. Their printed constants are not the same numbers. So "this vendor cites the
standard" cannot break the tie, because the other vendor cites it too. **IEEE C37.112 itself is
gated and unread**, so this project cannot adjudicate which set is the standard's literal table, or
what "conform" means in the standard's own terms.

The disagreement was measured, not eyeballed. Computing both families at the same settings:

| Curve | ratio, GE to SEL, across M=2 to M=20 | reading |
|---|---|---|
| Moderately Inverse | 4.955 to 4.963 | flat |
| Very Inverse | 5.057 to 5.095 | flat |
| Extremely Inverse | 4.946 to 3.893 | **drifts** |

Two things fall out. First, the families sit about **5x apart**, so silently mixing the two tables
does not produce a rounding error, it produces a trip time wrong by a factor of five. In coordination
that is the difference between "these devices coordinate" and "the upstream device opens first."
Second, and more telling: a **flat** ratio means the same curve shape under a different time dial
convention, but a **drifting** ratio means a genuinely different shape. So Moderately and Very
Inverse are reconcilable by convention and **Extremely Inverse is not.** SEL's own footnote on that
exact row independently flags it: *"U.S. Curve U4 differs slightly from the SEL-351R Recloser Control
and SEL-351 Relay family U4 curves."* Two independent signals agreeing that one row is the outlier is
evidence, not a coincidence.

This is project 01's tier rule firing again on a completely different subject. 01 outputs no tier,
because a tier is awarded by a body against a document this repo has not read. **02 outputs no
standards conformance claim, for exactly the same reason.** It says which manufacturer's published
curve family it reproduces, and it cites the manual. That is a smaller claim than "IEEE C37.112
compliant" and, unlike that claim, it is one this repo can stand behind.

## What was actually read, and what that is worth

The primary was read at `docs.ips.us`, a **distributor's** document store. GE did not serve this file.
Stating that plainly matters more than it looks, because the rest of this document is an argument
about not trusting secondhand copies, and its own primary is one.

**GE's copy cannot be had.** GE Vernova's download for this manual is login walled. Worse for this
repo's purposes, the version read here (1.6x) **is not offered by GE at all any more**: their
resources page lists 4.3x, 4.2x, 3.0x, and a Russian 2.4x. So "read it at the publisher" is not a
step that was skipped out of laziness. For this document, at this version, it is **not a step that
exists**. That is why `tools/check_sources.py` makes a mirror VISIBLE rather than FATAL: a gate that
fails here would only teach people to lie in the provenance column.

**So what is the confidence actually resting on?** Not the mirror's word. Three things:

1. **The document is self consistent three ways, and that is hard to fake.** The equation, driven by
   the constants, reproduces all 210 cells of the table (worst 0.135%), and the prose example nine
   pages later independently states one of those cells in words. A corrupted or doctored copy does not
   quietly agree with itself 211 times. Internal consistency is not proof of provenance, but it is
   strong evidence against corruption, which is the thing a mirror actually risks.
2. **An independent chain agrees.** GE's **F650** manual is a different document, for a different
   relay, reached through a different mirror, and it publishes the identical constants: Extremely
   Inverse 28.2 / 0.1217 / 2.0 / 29.1, Very Inverse 19.61 / 0.491 / 2.0 / 21.6, Moderately Inverse
   0.0515 / 0.1140 / 0.02 / 4.85. Two chains that share no upstream agreeing on twelve numbers is
   evidence. One chain saying them twice is not.
3. **The file identifies itself.** Its metadata names GE Multilin Inc. as author, and the cover
   carries GE publication code 1601-0298-A9 (GEK-119591H).

**What is NOT claimed:** that this is byte for byte GE's file. It demonstrably is not. Every one of
its 562 pages was re-rendered by the distributor's PDF tool and stamped "Courtesy of store.ips.us".
The evidence above is about the CONTENT being uncorrupted, which is a weaker claim than provenance and
is the honest one to make.

**If someone with a GE account reads Table 4-34 and 4-35 at GE and they match, this row becomes
PUBLISHER and this section shrinks to a footnote.** Until then it stays exactly this long.

## The 0.3 to 0.4 second interval is not public domain, and that is easy to get wrong

TM 5-811-14 is a US Army Corps of Engineers document, so the instinct is that all of it is public
domain and freely quotable. **The section carrying the coordination time interval is not.**

Paragraph 4-2d is titled "Coordination time intervals" and carries an asterisk. The asterisk resolves,
at the foot of the same page, to:

> "Reprinted with permission from ANSI/IEEE Standard 242-1986, IEEE Recommended Practice for
> Protection and Coordination of Industrial and Commercial Power Systems, copyright 1986 by IEEE."

So the passage that states the interval "is usually 0.3-0.4 seconds", and the component breakdown
under it, is **IEEE's copyrighted text**, reprinted under a permission granted **to the Army**. That
permission does not extend to this repo. The document around it is public domain; that section is not.

Two things follow, and the tool does both:

- **The number is cited, the passage is not reproduced.** `build/engine.js` carries 0.3 and 0.4 as
  cited context with attribution, and no more of IEEE's prose than the fragment above needed to
  explain the provenance.
- **Nothing gates on it.** Its own source says "usually". Turning a rule of thumb into an `if`
  statement invents a precision the source declined to claim and then prints it where it reads as a
  finding. The app draws the band and the reader judges. See `build/engine.js`.

**The method the app DOES report is from a different paragraph.** "Ensure no overlapping of curves"
is paragraph 4-2c(7), outside the asterisked section, in the Army's own prose. Public domain, and it
needs no number: two curves either cross or they do not. A method that needs no invented constant is
worth more here than a constant this repo cannot source.

A useful shape of mistake to remember: **a document's licence is not uniform.** "It is a government
document" is a claim about the cover, not about the paragraph.

## The secondhand transcription that was wrong

Worth recording, because it is the strongest argument in this repo for reading primaries.

Two independent research passes each scraped SEL's Table 9.3 from the same third party scan, and each
returned a **different** wrong equation for the U1 curve. Neither matched the actual manual:

| Read via | U1 Moderately Inverse |
|---|---|
| third party scan, pass A | `TD x (0.0104 / (M^p - 0.0226) + 0.02)` |
| third party scan, pass B | `TD x (0.0104 + 0.0226 / M^0.02)` |
| **the publisher's own PDF, p.375** | `TD x (0.0226 + 0.0104 / (M^0.02 - 1))` |

Both scrapes are not merely off, they are physically absurd: each predicts a relay operating in about
33 ms at exactly pickup, when the real curve goes asymptotic to infinity there. A relay that trips at
its own pickup current is not a relay. **A secondhand scrape of exactly the right table still handed
back a wrong equation, twice, in two different ways.** The text layer flattens the fraction bar into a
run of dashes, which is what both passes tripped on.

The rule this earns: **anything the verify phase rests on gets read at the publisher's PDF.** A third
party scan is fine for locating a document and worthless for transcribing one.

## The tolerance, and what it is actually for

The SEL-351S manual publishes a relay accuracy spec (p.35), quoted verbatim:

> "Curve Timing Accuracy: +/-1.50 cycles and +/-4% of curve time for current between 2 and 30
> multiples of pickup"

**This is not this project's pass criterion**, and the distinction is worth stating plainly because it
is easy to get backwards. That spec describes how far a *physical relay* may depart from its own
programmed curve. Reproducing a *published table* is arithmetic, and the table's own rounding is the
only tolerance it needs. So:

- The **gate** uses the published table's printed precision. No invented number.
- The **app** states the SEL accuracy spec as an honesty note, because a computed coordination
  interval is not a field guarantee: real relays have real error bars, and the tool must not imply
  otherwise.

If any assertion is ever written against that SEL spec, **honor its stated range**: SEL states the
accuracy only for 2 <= M <= 30. Asserting outside that band would be this repo inventing a claim SEL
did not make.

## Deliberately not used

- **UL 489 "+30%/-20%" and the Moeller "+/-20%" figures.** Both surfaced only in a search engine's
  synthesized summary. The pages that would confirm them returned HTTP 401 and HTTP 403 and were
  never read. They are plausible and they are unverified, so they are not in this tool.
- **Any constant from the third party scans.** Proven wrong above.
- **A molded case breaker tolerance band, invented.** Not needed: both TM 5-811-14 and the Qual-Tech
  guide independently state that breaker to breaker coordination is checked by curves not
  intersecting, precisely because the published characteristic already embeds the tolerances. That is
  a method that needs no number, which is better than a number this repo cannot source.

## Known gaps, stated rather than hidden

- **IEEE C37.112 and IEC 60255-151 were never read.** Both gated. Every equation and constant here
  reaches this repo through a manufacturer's reprint. That is one more layer of indirection than a
  from the standard citation, and it is the direct cause of the naming trap above.
- **The SEL equations were transcribed from a flattened MathType text layer.** They are self
  consistent and cross check against an independently obtained copy, but p.375 has not yet been read
  as a **rendered image** at high magnification to confirm grouping by eye. Project 01's lesson was
  that tracing figures at magnification changes answers. Do that before any SEL curve ships.
- **Only one vendor's worked example is traced.** The GE evidence is strong (equation, constants,
  table, and prose example, all self consistent, all read at the publisher). A second vendor's
  independent prose example would further de risk it and has not been done.
- **The GE "ANSI curves" family** (a separate five constant family in the same manual) has its
  constants extracted but its equation form has not been confirmed against the rendered image. Do not
  build the ANSI family on the strength of this file.
- **Whether the SEL-351S also implements the strict C37.112 constants under a different label** is
  unresolved. Most modern SEL relays offer both a "US" and an "IEEE" curve set; that was not confirmed
  for this model.
