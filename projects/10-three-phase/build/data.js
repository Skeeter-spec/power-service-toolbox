/*
 * data.js. The published worked examples this sandbox reproduces, each constant carrying the page it
 * was read on. See ../sources/SOURCES.md for the audit.
 *
 * TWO SOURCES, KEPT APART ON PURPOSE:
 *   - The line/phase and power-triangle answers are PUBLISHED worked examples in DOE-HDBK-1011/3-92
 *     "Electrical Science" Vol 3, Module 9 "Basic AC Power", section THREE-PHASE CIRCUITS. Public
 *     domain, read at the publisher (energy.gov). Two examples, nine printed answers, reproduced.
 *   - The per-unit and symmetrical-fault answers are PUBLISHED in TM 5-811-14 "Coordinated Power
 *     Systems Protection" (US Army), Appendix G, Example 5 (G-27..G-29). Read at a mirror; App G is
 *     outside the manual's one IEEE-242 reprint (that marker is on p4-3) and is captioned "US Army
 *     Corps of Engineers", so it is the Army's own public-domain content. See SOURCES.md.
 *
 * WHAT THIS TOOL DOES NOT DO, stated where the reader will look for it:
 *   - It does not reduce a one-line to its Thevenin per-unit impedance. TM Example 5 does that
 *     reduction (Figure G-21) and PUBLISHES the reduced .249/.255/.26 pu; this tool reproduces the
 *     published division fault = I_base / Z_pu, and takes the reduced pu as published, not re-derived.
 *     Getting Z_pu wrong makes the fault number wrong, and that reduction is the engineered study, so
 *     engine.reduceNetwork() throws (§F, pattern 19).
 *   - It ships no equipment interrupting/withstand rating and issues no "your gear is rated" verdict.
 *     It touches fault math, so it carries the not-for-field-use banner (guardrail 1).
 */
'use strict';

/* DOE prints its answers using the square root of three rounded to 1.73. The tool computes at full
 * precision for interactive use (engine defaults to Math.sqrt(3)); the verify reproduces DOE's printed
 * answers by passing THIS factor, which is what makes the reproduction exact to the book's precision.
 * TM, by contrast, used full-precision root three for its base current (2000/(1.73*0.480) would give
 * 2408.5, not the printed 2405.6), so TM checks use Math.sqrt(3). Two books, two rounding choices. */
const ROOT3_DOE = 1.73;

/* ------------------------------------------------------------------ *
 * DOE-HDBK-1011/3-92, ES-09 (Module 9 "Basic AC Power"), Rev 0, THREE-PHASE CIRCUITS.
 *
 * The published relations (p ES-09-20/21):
 *   delta:  V_L = V_phase        (9-5)      I_L = root3 * I_phase   (9-6)
 *   wye:    V_L = root3 * V_phase (9-7)      I_L = I_phase          (9-8)
 *   P_T = root3 * V_L * I_L * cos(theta)   S_T = root3 * V_L * I_L   Q_T = root3 * V_L * I_L * sin(theta)
 * ------------------------------------------------------------------ */

const DOE_EXAMPLES = [
  {
    id: 1,
    connection: 'delta',
    cite: 'DOE-HDBK-1011/3-92, ES-09 Example 1, p ES-09-21/22',
    given: { vPhase: 440, iPhase: 200, pf: 0.6 },   // 0.6 lagging, so sin(theta) = 0.8
    printed: { vLine: 440, iLine: 346, PT_kW: 158.2, QT_kVAR: 210.7, ST_kVA: 263.4 },
  },
  {
    id: 2,
    connection: 'wye',
    cite: 'DOE-HDBK-1011/3-92, ES-09 Example 2, p ES-09-22/23',
    given: { vPhase: 240, iPhase: 100, pf: 0.9 },   // 0.9 lagging, so sin(theta) = 0.436
    printed: { vLine: 415.2, iLine: 100, PT_kW: 64.6, QT_kVAR: 31.3, ST_kVA: 71.8 },
  },
];

/* A DOCUMENTED SOURCE INCONSISTENCY, not silently reconciled (03's lesson: report it, do not pick).
 * Example 1's printed P_T is 158.2 kW, but the factors the book itself shows, (1.73)(440)(346)(0.6),
 * give 158.0 kW. The book's own S_T (263.4 kVA, from 1.73) times cos(theta) 0.6 is 158.0 too. The
 * 158.2 value corresponds to full-precision root three (1.7320508). So within one example the book
 * used 1.73 for S_T and Q_T but a tighter root three for the printed P_T. The tool reproduces BOTH
 * facts and flags the gap; it does not quietly print one and hide the other. */
const DOE_PT_ANOMALY = {
  example: 1,
  printedKW: 158.2,          // what ES-09-22 prints
  fromShownFactorsKW: 158.0, // (1.73)(440)(346)(0.6) / 1000, the book's own shown factors
  note: 'DOE ES-09-22 prints P_T = 158.2 kW; its shown factor 1.73 gives 158.0 kW. The 158.2 matches ' +
        'full-precision root three, so the book rounded root three two ways within one example. Reported, not reconciled.',
};

/* ------------------------------------------------------------------ *
 * TM 5-811-14, Appendix G, Example 5 (G-27..G-29). Base kVA = 2000; base kV = 12.47 / 4.16 / 0.480.
 *
 * Per-unit equations the book states (G-14..G-16), reproduced on individual published lines below:
 *   utility:   X_u = Base kVA / Utility kVA                               (G-14)
 *   own base:  X_new = X_old * (Base kVA / Equipment kVA)   [same kV base] (G-15)
 * The four lines below are the ones legible without ambiguity in the source; the transformer/motor
 * lines whose equipment kVA the render could not resolve cleanly are deliberately NOT reproduced
 * (rule 10: do not reproduce a number you cannot read at the source). Base current and the three
 * fault currents ARE printed as complete equations on G-29 and are reproduced exactly.
 * ------------------------------------------------------------------ */

const PU_EXAMPLE = {
  cite: 'TM 5-811-14, App G, Example 5, G-27..G-29 (US Army Corps of Engineers; mirror, see SOURCES.md)',
  baseKVA: 2000,
  baseKV_zones: [12.47, 4.16, 0.480],
  faultAt: 'MP 4 bus (480 V zone)',

  /* Individual per-unit conversion lines: published input -> published pu answer. An answer key of
   * the kind 02 used: each is arithmetic from stated inputs, checkable to the printed value. */
  conversions: [
    { label: 'Utility X_u1', kind: 'utility', puOld: null, equipKVA: 500000, pu: 0.004, eq: 'G-17', calc: '2000 / 500000' },
    { label: 'Generator X"_G1 (subtransient)', kind: 'ownBase', puOld: 0.20, equipKVA: 1250, pu: 0.32, eq: 'G-18', calc: '(0.20)(2000) / 1250' },
    { label: "Generator X'_G1 (transient)", kind: 'ownBase', puOld: 0.35, equipKVA: 1250, pu: 0.56, eq: 'G-19', calc: '(0.35)(2000) / 1250' },
    { label: 'Transformer X_T1', kind: 'ownBase', puOld: 0.08, equipKVA: 20000, pu: 0.008, eq: 'G-21', calc: '(0.08)(2000) / 20000' },
  ],

  /* Base current at the 480 V zone: I_base = Base kVA / (root3 * Base kV). Printed on G-29. TM used
   * full-precision root three here (1.73 would give 2408.5), so this reproduces with Math.sqrt(3). */
  baseCurrent: { baseKV: 0.480, amps: 2405.6, cite: 'TM 5-811-14 G-29' },

  /* The reduced per-unit reactance at MP 4, PUBLISHED by the book's own network reduction (Figure
   * G-21). Taken as published, NOT re-derived here (see engine.reduceNetwork, which refuses). */
  reduced: { subtransient: 0.249, transient: 0.255, synchronous: 0.26, cite: 'TM 5-811-14 Fig G-21 (G-29)' },

  /* The published fault currents, printed as complete divisions on G-29: I = I_base / X_reduced. */
  fault: {
    subtransient: { puZ: 0.249, amps: 9661, label: 'I"sc (first few cycles)' },
    transient:    { puZ: 0.255, amps: 9434, label: "I'sc (to about 30 cycles)" },
    synchronous:  { puZ: 0.260, amps: 9252, label: 'Isc (steady state)' },
    cite: 'TM 5-811-14 G-29',
  },
};

/* ------------------------------------------------------------------ *
 * PROVENANCE, carried with the data so a future edit sees it.
 * ------------------------------------------------------------------ */

const PROVENANCE = {
  doe: 'PUBLISHER. DOE-HDBK-1011/3-92 Vol 3 read at energy.gov (application/pdf, byte-identical to a ' +
       'second fetch). Public domain, no copyright markers in the volume. Figures rendered and read.',
  tm:  'MIRROR. TM 5-811-14 read at electricalconnects.com; the .mil/WBDG copy was not reachable ' +
       '(WBDG 403 on the asset, DTIC rate-limited). App G Example 5 pages carry no reprint marker ' +
       '(the manual\'s one "Reprinted with permission from ANSI/IEEE Standard 242-1986" is on p4-3) ' +
       'and are captioned "US Army Corps of Engineers". Low stale-revision risk: this is a per-unit ' +
       'METHOD and its arithmetic, not a firmware setpoint. Every published division was recomputed.',
};

/* No equipment interrupting/withstand ratings are defined here, on purpose. This tool does not tell
 * anyone whether their gear is rated for a fault. See §F of ../verify/verify.js and guardrail 1. */

/* ------------------------------------------------------------------ */

const DATA = {
  ROOT3_DOE,
  DOE_EXAMPLES, DOE_PT_ANOMALY,
  PU_EXAMPLE,
  PROVENANCE,
};

if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
if (typeof window !== 'undefined') window.TP_DATA = DATA;
