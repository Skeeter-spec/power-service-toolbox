#!/usr/bin/env node
/*
 * VERIFY. Run:  node verify/verify.js
 *
 * The gate for this repo: an app is not published until it reproduces a published worked example and
 * the answer matches the book. This is that check for project 06.
 *
 * WHAT IS BEING VERIFIED, AND AGAINST WHAT.
 *
 *   A. THE PUBLISHED TRUTH TABLE. GE Multilin 850 Instruction Manual, Non-volatile Latches, p4-414,
 *      Reset Dominant. Four rows and a non-volatile property, reproduced row for row. This is the
 *      verified anchor: a published table with published outputs, exactly 05's shape.
 *
 *   B. THE PERMISSIVE. This tool's OWN construction from named elements (86 latch, 25, spring,
 *      50/51). No vendor publishes the full close permissive truth table this repo has read, so it is
 *      NOT claimed as a reproduction. It is verified as self consistent boolean logic: the whole 2^5
 *      truth table is enumerated, every input is shown to gate, and the De Morgan identity the tool
 *      teaches is checked. Honest about what kind of claim this is (03's lesson: assert the criterion
 *      you can, and say so).
 *
 *   C. ONE SOURCED WORKED EXAMPLE. SEL, Thompson 2012, p5: advance angle = slip x 360 x CBCT gives
 *      1.5 degrees, and the slip rate is 18 degrees per second. Two published numbers, reproduced.
 *
 *   F. THE REFUSALS. THIS IS THE PRODUCT. The tool must not name a factory permissive scheme it never
 *      sourced, must not ship a relay default it read on a stale mirror as fact, and must not claim
 *      conformance to a standard this repo has not read. Pattern 19: a refusal is not self enforcing.
 *
 * See ../build/rungs.js for every constant and the page it was read on, and ../sources/SOURCES.md.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const D = require('../build/rungs.js');
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

/* ================================================================== *
 * SECTION A. THE PUBLISHED LATCH TRUTH TABLE, ROW FOR ROW.
 * GE Multilin 850 Instruction Manual, Non-volatile Latches, p4-414, Reset Dominant. This is the
 * answer key. "Previous State" is resolved against BOTH prior states so the held row is really held.
 * ================================================================== */

/* The four published rows, checked against the engine for both possible previous states. */
for (const row of D.LATCH_TRUTH_TABLE) {
  for (const prev of [true, false]) {
    check(`A. latch SET=${row.set} RESET=${row.reset} prev=${prev} -> published "${row.out}" (GE 850 p4-414)`, () => {
      const got = E.latchOutput(row.set, row.reset, prev);
      const expected = row.out === 'Previous State' ? (prev ? 'On' : 'Off') : row.out;
      return got === expected || `got ${got}, published ${row.out}`;
    });
  }
}

/* The single row that IS the latch: input removed, output holds. If this passed only because On/Off
 * also returns On, it would be indistinguishable from a plain OR. So it is checked at BOTH prev
 * states and the two answers must DIFFER: held On stays On, held Off stays Off. */
check('A. the held row actually holds: Off/Off returns On when prev was On, Off when prev was Off (GE 850 p4-414)', () => {
  return E.latch(false, false, true) === true && E.latch(false, false, false) === false;
});

/* Reset Dominant, stated as the row it decides: On/On is Off, not On. An SR latch that were set
 * dominant would answer On here, and only here. This is the row that names the type. */
check('A. Reset Dominant: SET and RESET together give Off, so the operator can always clear it (GE 850 p4-414)', () => {
  return E.latch(true, true, true) === false && E.latch(true, true, false) === false;
});

/* The non-volatile property from the manual's stated purpose (p4-414): the flag survives a reboot.
 * Modelled as: a held state is a function of prev alone, so passing the same prev across a "reboot"
 * (a fresh call with no set/reset) returns the same output. */
check('A. non-volatile: with no input, the output is exactly the prior state, so it survives a reboot (GE 850 p4-414)', () => {
  return D.LATCH_NONVOLATILE === true &&
         E.latch(false, false, true) === true && E.latch(false, false, false) === false;
});

/* ================================================================== *
 * SECTION B. THE CLOSE PERMISSIVE, AS SELF CONSISTENT BOOLEAN LOGIC.
 * NOT a reproduction of a vendor scheme (none was sourced). The whole 2^5 space is enumerated.
 * ================================================================== */

const ROWS = E.enumerate();

check('B. the truth table has exactly 2^5 = 32 rows, the full input space', () => {
  return ROWS.length === 32;
});

/* Exactly ONE combination permits a close, and it is the one the data names as required. A permissive
 * that permitted on two combinations would be a weaker interlock than it claims. */
check('B. exactly one of the 32 combinations permits a close', () => {
  return ROWS.filter((r) => r.permit).length === 1;
});
check('B. the permitting combination is exactly PERMIT_REQUIRED (86 clear, 25 ok, spring, no 50/51)', () => {
  const permitting = ROWS.find((r) => r.permit).inputs;
  return D.PERMIT_INPUTS.every((k) => permitting[k] === D.PERMIT_REQUIRED[k]);
});

/* Every input GATES: from the one permitting state, flipping any single input to its other value must
 * block the close. This is what proves all five inputs are wired in, not just decorative. If any term
 * were dropped from the AND, that input's flip would leave the permit standing and this fails. */
check('B. every one of the five inputs gates: flipping any single one from the permit state blocks the close', () => {
  const base = E.permittingInputs();
  return D.PERMIT_INPUTS.every((k) => {
    const flipped = Object.assign({}, base, { [k]: !base[k] });
    return E.closePermit(flipped) === false;
  });
});

/* Independent re-derivation: closePermit must equal a reference boolean written a second way, for all
 * 32 rows. A test that only re-ran the implementation would pass a broken implementation. */
check('B. closePermit equals the reference boolean for all 32 rows (independent re-derivation)', () => {
  return ROWS.every((r) => {
    const i = r.inputs;
    const ref = (!i.lockout86) && i.syncOk25 && i.springCharged && !i.trip50 && !i.trip51;
    return r.permit === ref;
  });
});

/* The De Morgan identity the tool teaches: NOT(50 OR 51) === (NOT 50) AND (NOT 51), for all inputs.
 * Both forms are implemented separately in the engine so this is a real agreement, not a tautology. */
check('B. De Morgan holds for every row: NOT(50 OR 51) equals (NOT 50) AND (NOT 51)', () => {
  return ROWS.every((r) => E.noOvercurrent_orForm(r.inputs) === E.noOvercurrent_andForm(r.inputs));
});

/* The 86 latch feeds the permissive: a SET lockout (output On) must block the close no matter what
 * else is satisfied. This is the interlock that makes the latch matter to the breaker. */
check('B. a set 86 lockout blocks the close even with everything else satisfied', () => {
  const locked = Object.assign(E.permittingInputs(), { lockout86: E.latch(true, false, false) });
  return locked.lockout86 === true && E.closePermit(locked) === false;
});

/* ================================================================== *
 * SECTION C. THE SOURCED 25 ADVANCE ANGLE. SEL, Thompson 2012, p5.
 * advance angle = slip x 360 x CBCT. "0.05 Hz slip and a breaker close delay of 5 cycles" -> 1.5 deg.
 * ================================================================== */

check('C. advance angle: 0.05 Hz slip, 5 cycle close = 1.5 degrees (SEL Thompson 2012 p5)', () => {
  const seconds = D.SYNC_EXAMPLE.breakerCloseCycles / D.SYNC_EXAMPLE.systemHz;  // 5/60 s
  const got = E.advanceAngleDeg(D.SYNC_EXAMPLE.slipHz, seconds);
  return Math.abs(got - 1.5) < 1e-9 || `got ${got}, published 1.5`;
});
check('C. the slip rate is 18 degrees per second, the other published number on the same page (SEL p5)', () => {
  const got = E.slipRateDegPerSec(D.SYNC_EXAMPLE.slipHz);
  return Math.abs(got - 18) < 1e-9 || `got ${got}, published 18`;
});
check('C. the data module records the published answers it is checked against (SEL Thompson 2012 p5)', () => {
  return D.SYNC_EXAMPLE.advanceAngleDeg === 1.5 && D.SYNC_EXAMPLE.slipRateDegPerSec === 18;
});

/* ================================================================== *
 * 🔴 SECTION F. THE REFUSALS. THIS IS THE PRODUCT.
 *
 * Everything above proves the tool reproduces what a source publishes, or is self consistent where it
 * builds its own logic. This section proves it does not claim what no source publishes. Pattern 19.
 * ================================================================== */

checkThrows('F. factoryPermissive REFUSES when no vendor scheme is named', () => {
  return E.factoryPermissive(undefined);
});
checkThrows('F. factoryPermissive REFUSES an invented vendor scheme name', () => {
  return E.factoryPermissive('acme-relay-9000');
});
check('F. no vendor factory permissive scheme ships, because none has been sourced and read', () => {
  return Object.keys(D.VENDOR_SCHEMES).length === 0;
});
check('F. the refusal explains WHY, so the next reader does not think it is a missing feature', () => {
  try { E.factoryPermissive(undefined); return false; }
  catch (e) {
    return e.message.includes('has been sourced') && e.message.includes('named elements');
  }
});
/* The precise claim matters. The refusal must NOT deny that the 86 latch is published, because it is
 * (GE 850 p4-414, reproduced in section A). Overclaiming the gap is the equal and opposite error, the
 * same failure as 05's "the spec is silent" refusal that section F pins. */
check('F. the refusal does NOT overclaim the gap: it acknowledges the 86 latch IS published (GE 850 p4-414)', () => {
  try { E.factoryPermissive(undefined); return false; }
  catch (e) { return e.message.includes('latch truth table IS published') && e.message.includes('p4-414'); }
});

/* Grep the shipped build. Assert the absence in the artifact, not only in the behaviour, because the
 * danger is a future edit and not a current bug (03 established this). */
const buildSrc = ['rungs.js', 'engine.js', 'index.html']
  .map((f) => {
    const p = path.join(__dirname, '..', 'build', f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  }).join('\n');

check('F. CONTROL: the build source was actually read, so the greps below can fail', () => {
  return buildSrc.length > 4000 && buildSrc.includes('closePermit');
});
/* No relay default setting ships as an on screen fact. The only relay default in the sources is the
 * GE 850 v2.0x sync check default (0.2 Hz / 20 deg), read on a stale mirror. It must not appear as a
 * setpoint in ANY wording. WIDENED 2026-07-20 after a second reader slipped "0.2 Hz slip, 20 degrees"
 * past the first pattern (0.2 is not 0.20, and "default" was not adjacent to the number). The number
 * itself is now the trigger, not its adjacency to the word "default". */
const GE_DEFAULT_RE = /0\.20?\s*Hz|\b20\s*(deg|degrees|°)/i;
check('F. the build ships no GE 850 default sync setting as fact (0.2 or 0.20 Hz / 20 deg, stale mirror)', () => {
  return !GE_DEFAULT_RE.test(buildSrc);
});
check('F. CONTROL: the GE-default grep fires on both the 0.2 and the 0.20 wording, and on 20 deg', () => {
  return GE_DEFAULT_RE.test('factory default 0.2 Hz slip, 20 degrees') &&
         GE_DEFAULT_RE.test('0.20 Hz default');
});
check('F. NEGATIVE CONTROL: the GE-default grep stays silent on this tool\'s own sourced numbers (0.05 Hz, 18 deg)', () => {
  return !GE_DEFAULT_RE.test('0.05 Hz slip x 360 = 18 deg per second');
});
/* No conformance grammar to a standard this repo has not read (IEEE C37.2 device numbers are cited by
 * number only, per the standing guardrail). Match the GRAMMAR of a conformance CLAIM, not a standard's
 * name, so documenting a gap and naming a device-number convention stay legal.
 *
 * WIDENED 2026-07-20 after a second reader slipped "aligned with NFPA 70E" and "adheres to" past the
 * first pattern. Added those verbs. Deliberately did NOT ban "follows"/"per"/"uses": this repo
 * DOCUMENTS its unread standards by naming them ("device numbers follow IEEE C37.2 convention"), and
 * banning those words would push the project toward saying LESS about its own gaps to stay green,
 * which is the exact failure §F exists to prevent. A determined paraphrase can still evade a grep;
 * that residual gap is stated in the honest-gaps note below and is why the second reader is part of
 * the gate, not optional. */
const CONFORMANCE_RE = /conforms? to|compliant with|compliance with|conformant|in accordance with|implements IEEE|certified (to|for)|aligned with|adheres to|meets the requirements/i;
check('F. the build claims no conformance to any standard this repo has not read (e.g. IEEE C37.2, NFPA 70E)', () => {
  return !CONFORMANCE_RE.test(buildSrc);
});
/* CONTROL: must still fire on real conformance claims, including the reworded forms the second reader
 * found. Without this, a loosened pattern could match nothing at all and no one would know (05). */
check('F. CONTROL: the conformance grep fires on "conforms to", "aligned with" and "adheres to"', () => {
  return CONFORMANCE_RE.test('This interpreter conforms to IEEE C37.2.') &&
         CONFORMANCE_RE.test('aligned with NFPA 70E lockout practice') &&
         CONFORMANCE_RE.test('adheres to IEEE C37.2 device numbering');
});
/* NEGATIVE CONTROL: must stay SILENT when a standard is only NAMED or a numbering convention is merely
 * followed, or §F would punish honest disclosure. This is the exact boundary the widening must respect. */
check('F. NEGATIVE CONTROL: the conformance grep stays silent on legitimate naming ("follow ... convention", gated/unread)', () => {
  return !CONFORMANCE_RE.test('Device numbers follow IEEE C37.2 convention; the standard itself is gated and unread.');
});

/* ================================================================== *
 * REPORT
 * ================================================================== */
console.log(`\n06 ladder logic interpreter: verify against the GE Multilin 850 Non-volatile Latch`);
console.log(`truth table (p4-414) and the SEL advance angle worked example (Thompson 2012, p5).\n`);

if (failures.length) {
  console.log(`${pass} passed, ${failures.length} FAILED\n`);
  for (const f of failures) console.log(`  FAIL  ${f}\n`);
  process.exit(1);
}
console.log(`  ${pass} checks passed.`);
console.log(`  The published latch truth table is reproduced row for row, including the held state.`);
console.log(`  The close permissive is enumerated over all 32 inputs and every input gates.`);
console.log(`  Section F: the tool still refuses to name a factory scheme it has no source for.\n`);

/*
 * HONEST GAPS IN THIS SUITE, recorded because a suite that hides its holes is worse than one with none.
 *
 * 1. THE CLOSE PERMISSIVE IS NOT A REPRODUCTION. Section B verifies it as self consistent boolean
 *    logic, not against a published close permissive truth table, because none was found and read.
 *    The 86 latch (section A) and the 25 advance angle (section C) ARE reproductions of published
 *    values; the permissive that combines them is this tool's own construction and is labelled so on
 *    screen and here. If a vendor's full permissive scheme is ever read at the publisher, it becomes
 *    a section A style reproduction and VENDOR_SCHEMES stops being empty.
 *
 * 2. THE GE 850 IS READ ON A DISTRIBUTOR MIRROR (docs.ips.us), v2.0x (2017); GE's current v4.3x is
 *    login walled and unread. The latch truth table is a logic primitive, low stale revision risk, so
 *    it is reproduced. The GE default sync NUMBERS are stale revision risk and are NOT used; section F
 *    greps to keep them out. See ../sources/SOURCES.md.
 *
 * 3. ONLY ONE 25 worked example is traced (SEL Thompson p5). A second vendor's independent prose
 *    example would further de risk section C and has not been done.
 *
 * 4. 🔴 SECTION F GREPS CANNOT CATCH ARBITRARY NEW CODE, AND A SECOND READER PROVED IT (2026-07-20).
 *    An independent second reader found three ways to make this tool OVERCLAIM while this suite stayed
 *    green. Two were grep-too-narrow bugs and are now FIXED and controlled above: a "0.2 Hz / 20 deg"
 *    stale default that dodged the 0.20-only pattern, and an "aligned with / adheres to" conformance
 *    claim that dodged the verb list. The THIRD is not closable by a grep: a brand new function (e.g.
 *    `acmeFactoryPermissive()`) that invents and RETURNS a vendor scheme, without touching
 *    VENDOR_SCHEMES or factoryPermissive(). No pattern can catch that without also firing on this
 *    file's own honest refusal prose, which repeats "factory permissive scheme" many times to say it
 *    has NONE. This is 05's lesson #4 in another shape: a test cannot catch a misread page, and it
 *    cannot audit code it has never seen. The backstop for both is the SECOND READER, which is why it
 *    is a required part of this repo's gate and not an optional nicety. A determined paraphrase of the
 *    conformance or default claims can likewise still evade the widened greps; same backstop.
 */
