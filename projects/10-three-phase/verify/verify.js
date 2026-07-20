#!/usr/bin/env node
/*
 * VERIFY. Run:  node verify/verify.js
 *
 * The gate for this repo: an app is not published until it reproduces a published worked example and
 * the answer matches the book. This is that check for project 10.
 *
 * WHAT IS BEING VERIFIED, AND AGAINST WHAT.
 *
 *   A. TWO PUBLISHED WORKED EXAMPLES. DOE-HDBK-1011/3-92, ES-09 "Basic AC Power", Examples 1 (delta)
 *      and 2 (wye). Nine printed answers, reproduced to the book's printed precision using the book's
 *      own root-three factor (1.73). Includes a DOCUMENTED source inconsistency: Example 1's printed
 *      P_T is 158.2 kW, but the book's own shown factors give 158.0. Both are reproduced and the gap
 *      is pinned, not silently reconciled (03's lesson).
 *
 *   B. INTERNAL CONSISTENCY, beyond the two example points. The wye/delta ratios are root-three, the
 *      power triangle closes (S^2 = P^2 + Q^2), sin(theta) from a power factor matches the book's own
 *      stated 0.8 and 0.436, and an unknown connection throws rather than guessing (22's lesson).
 *
 *   C. THE PER-UNIT / SYMMETRICAL FAULT EXAMPLE. TM 5-811-14 App G Example 5 (G-27..G-29). Four
 *      published per-unit conversion lines, the 2405.6 A base current, and the 9661/9434/9252 A fault
 *      currents (I_base / Z_pu), reproduced exactly. Read at a mirror; see SOURCES.md and §F.
 *
 *   F. THE REFUSALS. THIS IS THE PRODUCT. The tool must not reduce a network it never studied, must
 *      not ship an equipment rating or a "your gear is rated" verdict, must not claim standards
 *      conformance, and must not relabel the TM mirror as publisher-verified. Pattern 19: a refusal is
 *      not self enforcing.
 *
 * See ../build/data.js for every constant and its page, and ../sources/SOURCES.md.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const D = require('../build/data.js');
const E = require('../build/engine.js');

let pass = 0;
const failures = [];

function check(name, fn) {
  try {
    const r = fn();
    if (r === true) { pass++; return; }
    failures.push(`${name}\n    expected true, got ${JSON.stringify(r)}`);
  } catch (e) {
    failures.push(`${name}\n    threw: ${e.message.split('\n')[0]}`);
  }
}
/* For the refusals: the check PASSES only if the call throws. */
function checkThrows(name, fn) {
  try { fn(); failures.push(`${name}\n    expected a throw, got a return value`); }
  catch (e) { pass++; }
}

function roundTo(x, d) { const p = Math.pow(10, d); return Math.round(x * p) / p; }
const R3 = D.ROOT3_DOE;   // 1.73, the factor DOE's examples are computed with

/* ================================================================== *
 * SECTION A. TWO PUBLISHED WORKED EXAMPLES. DOE-HDBK-1011/3-92, ES-09, Examples 1 and 2.
 * Reproduced with the book's own root three (1.73), to the book's printed precision.
 * ================================================================== */

for (const ex of D.DOE_EXAMPLES) {
  const g = ex.given, p = ex.printed;
  const vLine = E.lineVoltage(ex.connection, g.vPhase, R3);
  const iLine = E.lineCurrent(ex.connection, g.iPhase, R3);

  check(`A. Ex${ex.id} (${ex.connection}) V_line reproduces published ${p.vLine} V (${ex.cite})`, () => {
    return roundTo(vLine, 1) === p.vLine || `got ${roundTo(vLine, 1)}, published ${p.vLine}`;
  });
  check(`A. Ex${ex.id} (${ex.connection}) I_line reproduces published ${p.iLine} A (${ex.cite})`, () => {
    return roundTo(iLine, 0) === p.iLine || `got ${roundTo(iLine, 0)}, published ${p.iLine}`;
  });
  check(`A. Ex${ex.id} S_T reproduces published ${p.ST_kVA} kVA (${ex.cite})`, () => {
    const got = roundTo(E.apparentPower(vLine, iLine, R3) / 1000, 1);
    return got === p.ST_kVA || `got ${got}, published ${p.ST_kVA}`;
  });
  check(`A. Ex${ex.id} Q_T reproduces published ${p.QT_kVAR} kVAR (${ex.cite})`, () => {
    const got = roundTo(E.reactivePower(vLine, iLine, g.pf, R3) / 1000, 1);
    return got === p.QT_kVAR || `got ${got}, published ${p.QT_kVAR}`;
  });
}

/* Example 2's P_T is self-consistent at 1.73, so it is asserted directly. Example 1's P_T is the
 * documented anomaly and is handled below, not here. */
const ex2 = D.DOE_EXAMPLES.find((e) => e.id === 2);
check(`A. Ex2 P_T reproduces published ${ex2.printed.PT_kW} kW (${ex2.cite})`, () => {
  const vL = E.lineVoltage(ex2.connection, ex2.given.vPhase, R3);
  const iL = E.lineCurrent(ex2.connection, ex2.given.iPhase, R3);
  const got = roundTo(E.realPower(vL, iL, ex2.given.pf, R3) / 1000, 1);
  return got === ex2.printed.PT_kW || `got ${got}, published ${ex2.printed.PT_kW}`;
});

/* THE DOCUMENTED SOURCE INCONSISTENCY, pinned so a future edit cannot quietly "fix" it. Example 1's
 * book shows P_T = (1.73)(440)(346)(0.6). With 1.73 that is 158.0 kW; the book PRINTS 158.2, which is
 * what full-precision root three gives. The discrepancy is ENTIRELY the root-three rounding, and both
 * values are reproduced from the same shown factors, isolating the cause. */
const A = D.DOE_PT_ANOMALY;
check('A. Ex1 P_T with the book\'s shown factor 1.73 gives 158.0 kW, matching DOE_PT_ANOMALY.fromShownFactorsKW', () => {
  const got = roundTo(E.realPower(440, 346, 0.6, R3) / 1000, 1);
  return got === A.fromShownFactorsKW && A.fromShownFactorsKW === 158.0 || `got ${got}`;
});
check('A. Ex1 P_T with full-precision root three gives 158.2 kW, matching DOE_PT_ANOMALY.printedKW (the value ES-09-22 prints)', () => {
  const got = roundTo(E.realPower(440, 346, 0.6) / 1000, 1);   // engine default is Math.sqrt(3)
  return got === A.printedKW && A.printedKW === 158.2 || `got ${got}`;
});
check('A. the anomaly is a pure root-three rounding gap of ~0.2 kW, and the tool records both values rather than one', () => {
  return Math.abs((A.printedKW - A.fromShownFactorsKW) - 0.2) < 1e-9 && typeof A.note === 'string' && A.note.length > 40;
});

/* ================================================================== *
 * SECTION B. INTERNAL CONSISTENCY, beyond the two example points.
 * These relations are all DOE-published; this section proves the engine composes them correctly for
 * inputs other than the two worked examples, and that the ambiguous axis (connection) is not guessed.
 * ================================================================== */

check('B. wye: V_line / V_phase is root three, and I_line = I_phase, for an arbitrary load', () => {
  return Math.abs(E.lineVoltage('wye', 277) / 277 - Math.sqrt(3)) < 1e-9 &&
         E.lineCurrent('wye', 63) === 63;
});
check('B. delta: I_line / I_phase is root three, and V_line = V_phase, for an arbitrary load', () => {
  return Math.abs(E.lineCurrent('delta', 63) / 63 - Math.sqrt(3)) < 1e-9 &&
         E.lineVoltage('delta', 480) === 480;
});
check('B. the power triangle closes: S^2 = P^2 + Q^2 for an arbitrary balanced load', () => {
  const vL = 480, iL = 120, pf = 0.85;
  const P = E.realPower(vL, iL, pf), Q = E.reactivePower(vL, iL, pf), S = E.apparentPower(vL, iL);
  return Math.abs(S * S - (P * P + Q * Q)) / (S * S) < 1e-12;
});
check('B. sin(theta) from a power factor matches the book: pf 0.6 -> 0.8 exactly, pf 0.9 -> 0.436 (DOE ES-09)', () => {
  return Math.abs(E.sinFromPf(0.6) - 0.8) < 1e-12 && roundTo(E.sinFromPf(0.9), 3) === 0.436;
});
checkThrows('B. an unknown connection throws rather than silently guessing wye or delta', () => {
  return E.lineVoltage('star', 240);
});

/* ================================================================== *
 * SECTION C. THE PER-UNIT / SYMMETRICAL FAULT EXAMPLE. TM 5-811-14 App G Example 5, G-27..G-29.
 * Full-precision root three (TM used it: 1.73 would give a 2408.5 A base current, not the printed 2405.6).
 * ================================================================== */

const PU = D.PU_EXAMPLE;

for (const c of PU.conversions) {
  check(`C. per-unit ${c.label} = ${c.calc} = ${c.pu} pu (${c.eq}, ${PU.cite})`, () => {
    const got = c.kind === 'utility'
      ? E.perUnitUtility(PU.baseKVA, c.equipKVA)
      : E.perUnitOwnBase(c.puOld, PU.baseKVA, c.equipKVA);
    return Math.abs(got - c.pu) < 1e-9 || `got ${got}, published ${c.pu}`;
  });
}

check(`C. base current I_base = ${PU.baseKVA} kVA / (root3 * ${PU.baseCurrent.baseKV} kV) = ${PU.baseCurrent.amps} A (${PU.baseCurrent.cite})`, () => {
  const got = roundTo(E.baseCurrent(PU.baseKVA, PU.baseCurrent.baseKV), 1);
  return got === PU.baseCurrent.amps || `got ${got}, published ${PU.baseCurrent.amps}`;
});

for (const key of ['subtransient', 'transient', 'synchronous']) {
  const f = PU.fault[key];
  check(`C. fault current ${f.label}: ${PU.baseCurrent.amps} / ${f.puZ} = ${f.amps} A (${PU.fault.cite})`, () => {
    const got = roundTo(E.faultCurrent(PU.baseCurrent.amps, f.puZ), 0);
    return got === f.amps || `got ${got}, published ${f.amps}`;
  });
}

/* The chain connects: the engine's OWN base current (not just the printed one) reproduces the
 * subtransient fault, so a broken base current cannot hide behind the published 2405.6. */
check('C. the engine base current feeds the fault division: I_base -> I"sc reproduces 9661 A end to end', () => {
  const ib = roundTo(E.baseCurrent(PU.baseKVA, PU.baseCurrent.baseKV), 1);
  return roundTo(E.faultCurrent(ib, PU.fault.subtransient.puZ), 0) === 9661;
});

/* ================================================================== *
 * 🔴 SECTION F. THE REFUSALS. THIS IS THE PRODUCT.
 *
 * Everything above proves the tool reproduces what the sources publish. This section proves it does
 * not claim what they do not: it does not reduce a network, rate equipment, claim conformance, or
 * dress a mirror as a publisher copy. Pattern 19.
 * ================================================================== */

checkThrows('F. reduceNetwork REFUSES: reducing a one-line to its per-unit impedance is the engineered study, not this tool', () => {
  return E.reduceNetwork(undefined);
});
checkThrows('F. reduceNetwork REFUSES even when handed plausible components', () => {
  return E.reduceNetwork([{ id: 'T1', pu: 0.008 }, { id: 'G1', pu: 0.32 }]);
});
check('F. the refusal explains WHY, and does NOT deny that the division IS published (the equal and opposite overclaim)', () => {
  try { E.reduceNetwork(undefined); return false; }
  catch (e) { return e.message.includes('I_base / Z_pu') && e.message.includes('published') && e.message.includes('0.249'); }
});
checkThrows('F. faultCurrent REFUSES a non-positive per-unit impedance rather than returning Infinity as a "fault"', () => {
  return E.faultCurrent(2405.6, 0);
});

/* Grep the shipped build. Assert the absence in the artifact, not only in the behaviour, because the
 * danger is a future edit, not a current bug (03 established this). */
const buildSrc = ['data.js', 'engine.js', 'index.html']
  .map((f) => {
    const p = path.join(__dirname, '..', 'build', f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  }).join('\n');

check('F. CONTROL: the build source was actually read, so the greps below can fail', () => {
  return buildSrc.length > 4000 && buildSrc.includes('faultCurrent');
});

/* WIDEN THE CLAIM SURFACE (2026-07-20, a second reader's catch, #32). The rating-verdict and
 * conformance greps below must run against every file a reader actually reaches, not just the three
 * build files: index.html points the reader at SOURCES.md, and README.md is the GitHub front door
 * where promotional language would most likely creep in. A grep that runs narrower than the claim
 * surface is the exact gap 06 and 07 hit. These files are clean today; the point is to keep them so. */
const docSrc = ['../README.md', '../sources/SOURCES.md', '../PROGRESS.log']
  .map((rel) => {
    const p = path.join(__dirname, '..', rel.replace('../', ''));
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  }).join('\n');
const claimSrc = buildSrc + '\n' + docSrc;
check('F. CONTROL: the reader-facing docs (README, SOURCES, PROGRESS) were read, so the claim-surface greps can fail', () => {
  return docSrc.length > 4000 && docSrc.includes('SOURCES') && docSrc.includes('verify');
});

/* No equipment rating VERDICT ships. Match the affirmative CLAIM grammar ("is adequately rated",
 * "rated for the fault", "safe to energize"), NOT a bare mention of rating, so the honest disavowal
 * ("this tool does not tell you whether your gear is rated for a fault") stays legal. This is 07's F4
 * boundary: a disavowal must be able to quote what it disavows. The residual (a determined paraphrase)
 * is backstopped by the second reader, per #32. */
const RATING_VERDICT_RE = /is adequately rated|adequately rated|rated for the (available )?fault|meets the (interrupting|withstand)|within (its|the) (aic|interrupting|withstand)|safe to (close|operate|energize|proceed)|passes the (aic|withstand)/i;
check('F. the build AND the reader-facing docs ship no equipment-rating verdict (no "adequately rated for the fault", no "safe to energize")', () => {
  return !RATING_VERDICT_RE.test(claimSrc);
});
check('F. CONTROL: the rating-verdict grep fires on a real verdict', () => {
  return RATING_VERDICT_RE.test('the breaker is adequately rated for the available fault') &&
         RATING_VERDICT_RE.test('it is safe to energize the bus');
});
check('F. NEGATIVE CONTROL: the rating-verdict grep stays silent on the honest disavowal', () => {
  return !RATING_VERDICT_RE.test('This tool does not tell you whether your gear is rated for a fault.');
});

/* No conformance grammar to a standard this repo has not read. Match the grammar of a conformance
 * CLAIM, not a standard's name, so naming a public-domain source stays legal (06's boundary). */
const CONFORMANCE_RE = /conforms? to|compliant with|compliance with|conformant|in accordance with|implements IEEE|certified (to|for)|aligned with|adheres to|meets the requirements/i;
check('F. the build AND the reader-facing docs claim no conformance to any standard (IEEE, IEC, ANSI, NEC, NFPA)', () => {
  return !CONFORMANCE_RE.test(claimSrc);
});
check('F. CONTROL: the conformance grep fires on "conforms to", "aligned with" and "adheres to"', () => {
  return CONFORMANCE_RE.test('this conforms to IEEE C37.010') &&
         CONFORMANCE_RE.test('aligned with NFPA 70E') &&
         CONFORMANCE_RE.test('adheres to NEC article 110');
});
check('F. NEGATIVE CONTROL: the conformance grep stays silent on legitimately NAMING a source', () => {
  return !CONFORMANCE_RE.test('The line/phase relations are published in DOE-HDBK-1011/3-92, which is public domain.');
});

/* The not-for-field-use banner must ship (guardrail 1: this tool touches fault math). Read index.html
 * on its own so this tests the shipped PAGE, not a constant that happens to live in data.js. */
const htmlPath = path.join(__dirname, '..', 'build', 'index.html');
const htmlSrc = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
check('F. the not-for-field-use banner ships in the page (guardrail 1)', () => {
  return /not for field use/i.test(htmlSrc);
});

/* The TM mirror must not be relabelled as a publisher copy, and the build must disclose the mirror
 * provenance where it cites TM. #18: a mirror carries a revision risk a publisher copy does not. */
check('F. the provenance grades are pinned: DOE is PUBLISHER, TM is MIRROR, and neither is quietly upgraded', () => {
  return D.PROVENANCE.doe.startsWith('PUBLISHER') && D.PROVENANCE.tm.startsWith('MIRROR');
});
check('F. the shipped build discloses that the TM per-unit example is read at a mirror', () => {
  return /mirror/i.test(buildSrc);
});

/* The DOE Example 1 P_T anomaly is DISCLOSED on the shipped PAGE, not just handled in verify. Grepping
 * index.html on its own (a distinctive disclosure phrase) tests the on-screen disclosure specifically,
 * rather than the data.js constants that section A already pins. A future edit that drops the on-screen
 * note would pass section A and this catches it. */
check('F. the page discloses the Example 1 P_T anomaly on screen (a published inconsistency, shown not hidden)', () => {
  return /shown not hidden/i.test(htmlSrc) && /inconsistenc/i.test(htmlSrc) && htmlSrc.includes('158.0');
});

/* ================================================================== *
 * REPORT
 * ================================================================== */
console.log(`\n10 three-phase sandbox: verify against DOE-HDBK-1011/3-92 (line/phase and power triangle,`);
console.log(`Examples 1 and 2) and TM 5-811-14 App G Example 5 (per-unit and symmetrical fault current).\n`);

if (failures.length) {
  console.log(`${pass} passed, ${failures.length} FAILED\n`);
  for (const f of failures) console.log(`  FAIL  ${f}\n`);
  process.exit(1);
}
console.log(`  ${pass} checks passed.`);
console.log(`  DOE's nine printed answers reproduce to the book's precision; the Ex1 P_T anomaly is pinned.`);
console.log(`  TM's four per-unit lines, the 2405.6 A base current, and the 9661/9434/9252 A faults reproduce.`);
console.log(`  Section F: the tool still refuses to reduce a network, rate equipment, or claim conformance.\n`);

/*
 * HONEST GAPS IN THIS SUITE, recorded because a suite that hides its holes is worse than one with none.
 *
 * 1. THE NETWORK REDUCTION IS NOT REPRODUCED. TM Example 5 reduces ~30 impedances to the .249/.255/.26
 *    reduced pu at MP 4 (Figure G-21). This tool takes those as published and reproduces the division
 *    fault = I_base / Z_pu, plus four individual per-unit conversion lines. It does NOT re-derive the
 *    reduction; reduceNetwork() refuses (§F). A future session that traces the full reduction at the
 *    publisher could add it as a section-C style reproduction.
 *
 * 2. TM 5-811-14 IS READ AT A MIRROR (electricalconnects.com); the .mil/WBDG copy was not reachable
 *    (WBDG 403 on the asset, DTIC rate-limited). App G Example 5 carries no reprint marker (the
 *    manual's one IEEE-242 reprint is on p4-3) and is US Army Corps of Engineers content, so it is
 *    public domain. It is a per-unit METHOD and its arithmetic, low stale-revision risk (#18), and
 *    every published division was recomputed. Still a mirror, and §F keeps it labelled one.
 *
 * 3. ONLY FOUR of TM's per-unit conversion lines are reproduced. The transformer/motor lines whose
 *    equipment kVA could not be read unambiguously from the source were left out rather than guessed
 *    (rule 10). The four reproduced are the utility, two generator reactances, and one transformer.
 *
 * 4. 🔴 SECTION F GREPS CANNOT CATCH ARBITRARY NEW CODE OR A DETERMINED PARAPHRASE. The rating-verdict
 *    and conformance greps match claim grammar, not every possible wording, and a brand-new function
 *    that returned an invented equipment rating without matching those patterns would pass this suite.
 *    Same as 06's lesson #4: a test cannot audit code it has never seen. The backstop is the SECOND
 *    READER, which is why it is a required part of this repo's gate, not optional (#32).
 *
 *    The second reader ALSO caught the CLAIM SURFACE being narrower than the claim: the greps ran only
 *    against the three build files, so README.md and SOURCES.md (which index.html points readers at)
 *    were unguarded. Widened to claimSrc above. The residual is unchanged: the corpus is now wider,
 *    but a determined paraphrase or a brand-new file still needs the second reader.
 */
