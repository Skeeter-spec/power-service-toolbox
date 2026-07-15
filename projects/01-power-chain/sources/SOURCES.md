# 01 Power chain one line explorer. Sources.

Citations only. No copyrighted document is reproduced or redistributed here, including the ones that
are free to download. Where a source is free, the link goes to the publisher so you fetch it from them.

Each entry says how far I actually verified it, because "I read the abstract" and "I traced the figure"
are different claims and the difference is the whole point of this repo.

## Source audit

Every citation in this file, and how far it was actually taken. Checked by `tools/check_sources.py`,
which fails if any URL below appears in the prose without a level here. The levels, strongest first:
**TRACED** (read, and figures traced out) · **READ IN FULL** · **FETCHED, NOT READ** ·
**LOCATED ONLY** (URL resolves, content unverified) · **CITED, UNREAD** (named by number, never
opened) · **GATED, UNREAD** (paywalled, no content used).

| Source | Level | URL | Read at |
|---|---|---|---|
| Schneider WP75 Rev 4, Comparing UPS System Design Configurations | TRACED | https://download.schneider-electric.com/files?p_Doc_Ref=SPD_SADE-5TPL8X_EN | PUBLISHER |
| Uptime Institute, Tier classification (public page) | READ IN FULL | https://uptimeinstitute.com/tiers | PUBLISHER |
| Uptime Institute Journal, Explaining the Tier Classification System | READ IN FULL | https://journal.uptimeinstitute.com/explaining-uptime-institutes-tier-classification-system/ | PUBLISHER |
| Schneider EcoStruxure Reference Design 111 (Tier III, ANSI, GB300) | FETCHED, NOT READ | https://download.schneider-electric.com/files?p_Doc_Ref=RD111DSR0&p_File_Name=RD111DSR3-GB300.pdf&p_enDocType=Other+technical+guide | PUBLISHER |
| Schneider EcoStruxure Reference Design 108 (Tier III, IEC, GB200) | FETCHED, NOT READ | https://download.schneider-electric.com/files?p_Doc_Ref=RD108DSR0&p_File_Name=RD108DSR7-GB200.pdf&p_enDocType=Other+technical+guide | PUBLISHER |
| Open Compute Project, Data Center Facility | LOCATED ONLY | https://www.opencompute.org/projects/data-center-facility | PUBLISHER |
| DOE FEMP, Best Practices Guide for Energy-Efficient Data Center Design | LOCATED ONLY | https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design_0.pdf | PUBLISHER |
| Uptime Institute, Tier Standard: Topology (the actual standard) | GATED, UNREAD | none | NONE |
| ANSI/TIA-942 | CITED, UNREAD | none | NONE |
| IEEE Std 493 (Gold Book) | CITED, UNREAD | none | NONE |
| IEEE C37.20.2, metal clad switchgear | CITED, UNREAD | none | NONE |
| IEEE C37.10.1, circuit breaker failure modes | CITED, UNREAD | none | NONE |
| Schneider White Paper 48, rack power redundancy | CITED, UNREAD | none | NONE |
| NFPA 70E | CITED, UNREAD | none | NONE |
| NETA acceptance testing specification | CITED, UNREAD | none | NONE |

Read that table before the prose. **Only the top row was traced**, and it is the only one the verify
phase rests on. Everything below it is weaker, and the two reference designs in particular are
skimmed, not read, so nothing in this project should depend on their detail yet.

---

## Primary, and the one this project verifies against

**Schneider Electric White Paper 75, Revision 4. "Comparing UPS System Design Configurations."**
Kevin McCarthy (EDG2 Inc.) and Victor Avelar (Schneider Electric). Copyright 2016 Schneider Electric.
Free, no login: https://download.schneider-electric.com/files?p_Doc_Ref=SPD_SADE-5TPL8X_EN

> Verified: fetched the full 27 page PDF and read it. The five topologies in `verify/` were traced node
> by node and edge by edge off Figures 1, 3, 5, 6, and 7 at high magnification, including which lines are
> solid and which are dashed, because the dashed lines are the alternate feeds and getting them wrong
> would invert the answer. Every expected result in `verify/EXPECTATIONS.md` quotes this paper's own words.

Why this paper and not something else: it is the rare free document that publishes **both a one line
diagram and its own stated verdict on that diagram**. That combination is what makes a verify phase
possible at all. It states, for each configuration, where the single points of failure are and whether
the design supports concurrent maintenance. So the tool can be checked rather than admired.

Specific things taken from it, with page numbers, all cited rather than copied:

- Table 1, p.4. The mapping from the five named configurations to Uptime tier classes. **Used as a cited
  fact for context, not reproduced as a table, and not used as the pass criterion.** See the caveat below.
- p.4. The definition of "N" as the need of the critical load.
- p.5. Static bypass against maintenance bypass, and what each one is for.
- p.9 and p.10. Figure 3, and the explicit statement that the paralleling bus and the single load bus are
  single points of failure.
- p.12 and p.14. Figure 5, and the advantage claim that is **conditional**: concurrent maintenance of all
  components *if all loads are dual corded*.
- p.13. Figure 6, the tri redundant variant with no STS. The STS transfer time, 4 to 8 milliseconds.
- p.16. Figure 7, and the statement that tier IV architectures require all loads to be dual corded.

## The caveat that shapes this whole tool

**Uptime Institute's own public pages never use the words N, N+1, or 2N.** Both of them were fetched and
read:

- https://uptimeinstitute.com/tiers
- https://journal.uptimeinstitute.com/explaining-uptime-institutes-tier-classification-system/

They define Tier I to IV in prose, around **concurrently maintainable** (Tier III) and **fault tolerant**
(Tier IV). The N and N+1 and 2N vocabulary is engineering shorthand that the industry maps onto the tiers
by convention. WP75 publishes one such mapping. That mapping is Schneider's, not Uptime's.

The actual **Tier Standard: Topology** document is gated and I have not read it.

**So this tool does not tell you your tier, and the verify phase does not test tier labels.** It could not
honestly do either. A tier is awarded by Uptime against a document I do not have, and it covers things a
one line diagram does not show, such as compartmentalization and continuous cooling. What the tool does
instead is compute a property that a one line diagram genuinely does determine: **which single components,
if removed, drop a load.** Then it checks that answer against what WP75 says in words about its own
figures. That is a smaller claim than a tier, and unlike a tier it is one I can actually stand behind.

## Cited by number only. Copyrighted, not reproduced, and in most cases not read

- **Uptime Institute, Tier Standard: Topology.** Gated. Not read. No content from it is used here.
- **ANSI/TIA-942**, data center telecommunications infrastructure standard, which also defines tiers.
  Sold commercially. Not read.
- **IEEE Std 493**, the Gold Book, recommended practice for reliable industrial and commercial power
  systems. Sold. Not read. Noted because WP75's own availability model sources transformer and breaker
  failure rates to it. Those failure rate numbers are not used in this tool.
- **IEEE C37.20.2**, metal clad switchgear. **IEEE C37.10.1**, circuit breaker failure modes. Both sold.
  Not read. Named for orientation only.
- **NFPA 70E** and the **NETA acceptance testing specification**. Standing repo guardrail: cite and link,
  never reproduce. Nothing from either is used in this project.

## Free, located, and honestly not yet used

Found and confirmed reachable, but this project does not draw on them yet. Listed so the next pass does
not repeat the search.

- **Schneider EcoStruxure Reference Design 111** (RD111DS Rev 3), "7,536 kW, Tier III, ANSI, Chilled
  Water, Liquid cooled AI Clusters (NVIDIA GB300)." Marked Public. Free. Fetched and skimmed, not traced.
  Cover states "Target Availability: Tier III"; the attributes table states 3+1 distributed redundant IT
  power, 2N cooling power, N+1 chiller and CDU. **Names PDU and RPP explicitly**, which the WP75 figures
  do not, so it is the obvious next source when the tool grows the rack end of the chain.
- **Schneider EcoStruxure Reference Design 108** (RD108DS Rev 7), the IEC sibling of RD111. Free, Public.
  **Names busway explicitly** (Canalis KS 800A with tap off units), the only free source found so far that
  draws busway as a node.
- **Schneider White Paper 48**, "Comparing Availability of Various Rack Power Redundancy Configurations."
  Referenced by WP75 for the rack level question. Not fetched. Title known only from WP75's reference list.
- **DOE FEMP, "Best Practices Guide for Energy-Efficient Data Center Design"** (revised July 2024).
  Free, federally hosted. Located, not read. Historically cooling and PUE focused, so likely weak for
  topology, possibly useful for what a node does.
- **Open Compute Project, Data Center Facility.** https://www.opencompute.org/projects/data-center-facility
  Open by policy. Not read. Interesting precisely because OCP designs break the assumptions in WP75, with
  no traditional central UPS, so they would stress the classifier rather than flatter it.

## Known gaps in the sourcing, stated rather than hidden

- Battery failure modes at the chemistry level. Nothing found. WP75 models battery transfer failure as a
  single probability and says nothing about why batteries fail.
- STS failure modes in depth. WP75 flags that STS units introduce "undesirable failure modes" and that an
  STS prevents true isolation of two paths, but gives no taxonomy.
- Hyperscaler published designs from Meta and Google. Not searched.
- Node level "how it fails" narratives generally. The claims that survive into the app's node panels are
  the ones traceable to WP75. Others were found only as vendor and trade press summaries, which is not a
  standard this repo should be citing, so they were left out rather than dressed up.
