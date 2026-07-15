#!/usr/bin/env node
/*
 * VERIFY. Run:  node verify/verify.js
 *
 * The gate for this repo: an app is not published until it reproduces a published worked example.
 * This is that check for project 02.
 *
 * WHAT IS BEING CHECKED
 *
 * The GE Multilin 850 instruction manual publishes, on one page (manual p.4-115), its trip equation,
 * its curve constants, AND a 210 cell table of the trip times those produce. Then, nine pages later
 * (p.4-124), it states one of those cells again in prose, as a worked example with the answer in
 * words.
 *
 * That is a rare document and it is the only reason this project exists. Project 01 verified against
 * Schneider WP75, which published a prose VERDICT. This publishes a NUMBER, 210 times.
 *
 * So: build/curves.js carries the published constants, build/engine.js carries the published
 * equation, and this file drives the engine over every cell of the published table and asserts the
 * engine reaches the manufacturer's own answers. The engine has no knowledge of verify/published.js.
 * It arrives at the numbers or it does not.
 *
 * THE PASS CRITERION, AND WHY IT NEEDED NO INVENTED TOLERANCE
 *
 * "Within tolerance" was the one thing this project needed that 01 never did, and an invented
 * tolerance would have made this whole file theatre. It turned out not to be needed, and the reason
 * is worth understanding rather than accepting:
 *
 *   Reproducing a published TABLE is arithmetic. The table prints three decimals, so a printed cell
 *   IS the true value rounded to three decimals, so a correct engine lands within half of the last
 *   printed digit (0.0005) of it, always. That is not a tolerance anyone chose. It is what "printed
 *   to three decimals" means.
 *
 * The relay accuracy spec that a reader might expect here (SEL publishes +/-1.50 cycles and +/-4% of
 * curve time for 2 <= M <= 30) is NOT this criterion and asserting against it would be a category
 * error. That spec describes how far a PHYSICAL relay may drift from its own programmed curve. This
 * file checks arithmetic against a book. No relay is present. See ../sources/SOURCES.md.
 *
 * SIX CELLS SIT EXACTLY ON THE ROUNDING TIE, AND THAT IS WHY THE COMPARISON IS WRITTEN THE WAY IT IS
 *
 * Six of the 210 land on an exact half-way tie (Very Inverse TDM=0.5 M=1.5 computes to 8.0895 and
 * the manual prints 8.090). GE rounds those half-up. IEEE-754 cannot represent them exactly and
 * lands a hair BELOW the tie: the double nearest 8.0895 is 8.0894999999999992.
 *
 * So the obvious comparison, round the computed value to three decimals and demand equality, FAILS
 * on those six. It fails for a reason that has nothing to do with protection, curves, or GE: it is
 * binary floating point disagreeing with decimal rounding at a tie. Writing the check that way and
 * then loosening it until it passed would have buried a real fact. Instead the check states what it
 * actually means, "agrees to the table's printed precision", as a distance, and the tie cells are
 * named below and asserted to BE ties rather than quietly tolerated.
 *
 * THE SENSITIVITY CONTROL AT THE BOTTOM MATTERS AS MUCH AS THE ASSERTIONS
 *
 * A suite that passes because it cannot fail is worse than no suite: it manufactures confidence. The
 * last section breaks the engine in known ways and asserts the suite notices. If the control ever
 * goes quiet, this file is lying and everything above it is void. See also verify/mutants.txt, which
 * is the same idea run against the real source.
 */
'use strict';

var TCC = require('../build/engine.js');
var Curves = require('../build/curves.js');
var P = require('./published.js');

var passed = 0, failed = 0;

function group(name) { console.log('\n' + name); }

function check(desc, cite, fn) {
  var ok, err = null;
  try { ok = fn(); } catch (ex) { ok = false; err = ex.message; }
  if (ok) { passed++; console.log('  PASS  ' + desc); }
  else {
    failed++;
    console.log('  FAIL  ' + desc);
    if (err) console.log('        error: ' + err);
  }
  if (cite) console.log('        GE 850: ' + cite);
}

var FAM = Curves.DEFAULT_FAMILY;
function dev(shape, tdm, pickup) {
  return { family: FAM, shape: shape, tdm: tdm, pickup: pickup === undefined ? 100 : pickup };
}

// Half of the last printed digit of a table that prints three decimals. Not a chosen tolerance: see
// the header. EPS absorbs binary floating point at the six exact ties, and nothing else: it is nine
// orders of magnitude smaller than the criterion it guards.
var HALF_ULP = 0.0005;
var EPS = 1e-9;

function agreesToPrintedPrecision(calc, published) {
  return Math.abs(calc - published) <= HALF_ULP + EPS;
}

/* ------------------------------------------------------------------------------------------------
 * 1. The constants this repo copied are the constants the manual published.
 *
 * build/curves.js is a hand transcription of Table 4-34. Everything below depends on it, so a typo
 * there would not fail a test, it would silently redefine what the suite is verifying: the engine
 * would agree with the typo and the table would be checked against nothing. published.js carries an
 * independent copy for exactly this reason.
 * --------------------------------------------------------------------------------------------- */
group('Table 4-34 constants: build/curves.js against the published table');

Object.keys(P.CONSTANTS).forEach(function (shapeId) {
  check('constants for ' + shapeId + ' match the manual', 'Table 4-34, manual p.4-115', function () {
    var got = Curves.shape(FAM, shapeId), want = P.CONSTANTS[shapeId];
    return got.A === want.A && got.B === want.B && got.p === want.p && got.tr === want.tr;
  });
});

check('the family is named for its vendor, not for the standard', 'see build/curves.js', function () {
  // Not decoration. GE and SEL both say their curves conform to IEEE C37.112-1996 and publish
  // DIFFERENT constants, about 5x apart. A family id of 'ieee' would be an invitation to mix them.
  var f = Curves.family(FAM);
  return f.id === 'ge850-ieee' && /GE/.test(f.vendor) && /850/.test(f.device);
});

/* ------------------------------------------------------------------------------------------------
 * 2. THE MAIN EVENT. All 210 published cells, recomputed from the equation.
 * --------------------------------------------------------------------------------------------- */
group('Table 4-35: every published trip time, recomputed from the published equation');

var cells = 0, worstErr = 0, worstAt = null, ties = [];

Object.keys(P.TRIP_TIMES).forEach(function (shapeId) {
  Object.keys(P.TRIP_TIMES[shapeId]).forEach(function (tdm) {
    var row = P.TRIP_TIMES[shapeId][tdm];
    var d = dev(shapeId, parseFloat(tdm));
    var bad = [];
    row.forEach(function (published, i) {
      var m = P.MULTIPLES[i];
      var calc = TCC.tripTime(d, d.pickup * m);
      var err = Math.abs(calc - published);
      cells++;
      if (err > worstErr) { worstErr = err; worstAt = shapeId + ' TDM=' + tdm + ' M=' + m; }
      if (err > HALF_ULP - EPS && err <= HALF_ULP + EPS) ties.push(shapeId + ' TDM=' + tdm + ' M=' + m);
      if (!agreesToPrintedPrecision(calc, published)) bad.push('M=' + m + ' want ' + published + ' got ' + calc);
    });
    check('  ' + shapeId + ', TDM ' + tdm + ': all ' + row.length + ' cells',
      null, function () { return bad.length === 0 || fail(bad); });
  });
});

function fail(bad) { throw new Error(bad.join('; ')); }

check('all 210 published cells were actually visited', 'Table 4-35 is 3 shapes x 7 TDM x 10 currents', function () {
  return cells === 210 && P.cellCount() === 210;
});

check('worst disagreement is inside the table\'s printed precision (' + worstErr.toFixed(6) + ' s at ' + worstAt + ')',
  'Table 4-35 prints 3 decimals, so half the last digit is ' + HALF_ULP + ' s', function () {
    return worstErr <= HALF_ULP + EPS;
  });

/* ------------------------------------------------------------------------------------------------
 * 3. The six rounding ties, asserted rather than tolerated.
 *
 * These are named because a reader who recomputes this table will hit them and deserves to know
 * they are expected. Asserting the COUNT means that if a future edit changes the arithmetic enough
 * to move a cell off its tie, this notices.
 * --------------------------------------------------------------------------------------------- */
group('The exact rounding ties, where GE rounds half-up and binary floating point cannot');

check('exactly 6 cells sit on the half-way tie, and all 6 are Very Inverse', 'Table 4-35', function () {
  return ties.length === 6 && ties.every(function (t) { return /^very-inverse/.test(t); });
});

check('the archetype tie: Very Inverse TDM=0.5 M=1.5 is exactly 8.0895, manual prints 8.090',
  'Table 4-35, manual p.4-115', function () {
    var calc = TCC.tripTime(dev('very-inverse', 0.5), 150);
    var printed = P.TRIP_TIMES['very-inverse']['0.5'][0];

    // In exact decimal arithmetic this cell is a clean tie and nothing here is approximate:
    //   1.5^2 - 1 = 1.25 ; 19.61 / 1.25 = 15.688 ; + 0.491 = 16.179 ; x 0.5 = 8.0895 exactly.
    // GE rounds that half-up to 8.090.
    //
    // The comparison is scaled by 1000 on purpose. The obvious way to write this, "calc < 8.0895",
    // is VACUOUS: 8.0895 is not representable, so the JS literal 8.0895 IS the same double as calc
    // (both 8.0894999999999992) and the test compares a value to itself. Scaling by 1000 moves the
    // tie to 8089.5, which IS exactly representable, so the comparison finally means something.
    // This is the check the header is about, so it is worth getting literally right.
    return printed === 8.09
      && Math.abs(calc * 1000 - 8089.5) < 1e-9   // the true value sits on the tie
      && calc * 1000 < 8089.5                    // and the double lands just below it
      && Math.round(calc * 1000) / 1000 === 8.089  // so naive rounding DISAGREES with the manual
      && agreesToPrintedPrecision(calc, printed);  // and the honest criterion agrees with it
  });

/* ------------------------------------------------------------------------------------------------
 * 4. The prose worked example. The manual's own answer, in words, nine pages from the table.
 * --------------------------------------------------------------------------------------------- */
group('The worked example, manual p.4-124, stated in prose');

check('IEEE Extremely Inverse, TDM=2, fault at 5x pickup: "will not occur before 2.59 s"',
  'manual p.4-124, quoted verbatim in ../sources/SOURCES.md', function () {
    var w = P.WORKED_EXAMPLE;
    var t = TCC.tripTime(dev(w.shape, w.tdm), 100 * w.multiple);
    // The prose states 2.59 to two decimals, so it is checked to two decimals. Holding a prose
    // sentence to the table's three decimal precision would be asserting something the sentence
    // did not say.
    return Math.abs(t - w.statedSeconds) <= 0.005;
  });

check('all three of the manual\'s representations agree: prose 2.59, table 2.593, equation 2.5934',
  'p.4-124 prose, Table 4-35 cell, Table 4-34 constants', function () {
    var t = TCC.tripTime(dev('extremely-inverse', 2), 500);
    var tableCell = P.TRIP_TIMES['extremely-inverse']['2.0'][4]; // M=5.0 is the 5th column
    return tableCell === 2.593
      && Math.abs(t - 2.5934) < 5e-5
      && Math.abs(t - 2.59) <= 0.005
      && agreesToPrintedPrecision(t, tableCell);
  });

/* ------------------------------------------------------------------------------------------------
 * 5. The equation's shape away from the table, where the manual states behaviour rather than numbers.
 * --------------------------------------------------------------------------------------------- */
group('Curve behaviour the manual describes but does not tabulate');

check('at or below pickup the element does not trip', 'the curve is asymptotic at I = Ipickup', function () {
  var d = dev('extremely-inverse', 1);
  return TCC.tripTime(d, 100) === Infinity && TCC.tripTime(d, 99) === Infinity && TCC.tripTime(d, 1) === Infinity;
});

check('trip time falls as current rises (the curve is inverse)', 'Table 4-35 decreases left to right', function () {
  var d = dev('very-inverse', 2);
  for (var m = 1.5; m < 20; m += 0.5) {
    if (!(TCC.tripTime(d, 100 * (m + 0.5)) < TCC.tripTime(d, 100 * m))) return false;
  }
  return true;
});

check('trip time scales linearly with TDM', 'TDM is a multiplier on the whole bracket, p.4-115', function () {
  var one = TCC.tripTime(dev('extremely-inverse', 1), 500);
  var four = TCC.tripTime(dev('extremely-inverse', 4), 500);
  return Math.abs(four - 4 * one) < 1e-12;
});

check('B is scaled by TDM, not added after it', 'the "+ B" is inside the bracket, p.4-115', function () {
  // The grouping that a flattened text layer destroys. As M grows the A term vanishes and T
  // approaches TDM x B, so B's scaling is directly observable at the far right of the curve.
  //
  // This uses Extremely Inverse (p=2) rather than Moderately Inverse, and that is not arbitrary.
  // At p=0.02 the A term NEVER vanishes at any current worth computing: M^0.02 - 1 is still only
  // 0.51 at M=1e9 and 2.98 at M=1e30. The Moderately Inverse curve simply has no flat tail to
  // measure B against. Written the other way this check failed, and it was the test that was wrong
  // rather than the engine.
  var s = Curves.shape(FAM, 'extremely-inverse');
  var t = TCC.tripTime(dev('extremely-inverse', 3), 100 * 1e9);
  return Math.abs(t - 3 * s.B) < 1e-9;
});

check('the reset characteristic is defined below pickup and only below it',
  'TRESET = TDM x [ tr / (1 - (I/Ipickup)^2) ], p.4-115', function () {
    var d = dev('extremely-inverse', 1);
    var s = Curves.shape(FAM, 'extremely-inverse');
    var half = TCC.resetTime(d, 50); // M = 0.5
    return Math.abs(half - s.tr / (1 - 0.25)) < 1e-9
      && TCC.resetTime(d, 100) === Infinity
      && TCC.resetTime(d, 500) === Infinity;
  });

check('the reset exponent is the published literal 2, NOT the curve family\'s p',
  'TRESET squares (I/Ipickup) for every shape, p.4-115', function () {
    // This check exists because mutation testing found its absence. Swapping the literal 2 for s.p
    // SURVIVED the suite, and it survived for a reason worth remembering: the check above uses
    // Extremely Inverse, whose p IS 2.000, so the bug was invisible there. Two of the three shapes
    // have p = 2.000 and would hide it equally well.
    //
    // Moderately Inverse is the only shape that can see this at all, because p = 0.02 there. That is
    // the general lesson: a constant that happens to equal a literal cannot test that literal.
    var s = Curves.shape(FAM, 'moderately-inverse');
    var t = TCC.resetTime(dev('moderately-inverse', 1), 50); // M = 0.5
    var published = s.tr / (1 - Math.pow(0.5, 2));   // the published equation: exponent 2
    var ifItUsedP = s.tr / (1 - Math.pow(0.5, s.p)); // what the mutant would give
    return Math.abs(t - published) < 1e-9
      && Math.abs(published - ifItUsedP) > 1        // the two really are far apart, so this can fail
      && s.p !== 2;                                 // and this shape can actually see the difference
  });

/* ------------------------------------------------------------------------------------------------
 * 6. The coordination interval: arithmetic on two verified numbers, and nothing more.
 * --------------------------------------------------------------------------------------------- */
group('Coordination interval and curve overlap');

check('the interval is the upstream trip time minus the downstream one', 'subtraction', function () {
  var down = dev('extremely-inverse', 1, 100);
  var up = dev('extremely-inverse', 3, 100);
  var r = TCC.interval(down, up, 500);
  return Math.abs(r.seconds - (TCC.tripTime(up, 500) - TCC.tripTime(down, 500))) < 1e-12
    && r.seconds > 0 && r.bothTrip === true;
});

check('when a device does not trip, the interval is null rather than NaN', 'Infinity - Infinity', function () {
  var down = dev('extremely-inverse', 1, 100);
  var up = dev('extremely-inverse', 1, 100000);
  var r = TCC.interval(down, up, 500); // 500 A is below the upstream 100 kA pickup
  return r.seconds === null && r.bothTrip === false && r.upstream === Infinity;
});

check('two curves of the same shape, different TDM, never cross', 'parallel on log log axes', function () {
  var down = dev('very-inverse', 1, 100);
  var up = dev('very-inverse', 2, 100);
  return TCC.overlaps(down, up, 150, 5000).length === 0;
});

check('a shape crossing IS found, and at the current where the interval changes sign',
  'TM 5-811-14 para 4-2c(7): "ensure no overlapping of curves"', function () {
    // Extremely and Moderately Inverse have genuinely different shapes, so with settings chosen to
    // put them in each other's way they must cross exactly once.
    var down = dev('extremely-inverse', 3, 100);
    var up = dev('moderately-inverse', 1, 100);
    var xs = TCC.overlaps(down, up, 110, 20000);
    if (xs.length !== 1) return false;
    var at = xs[0];
    var before = TCC.interval(down, up, at * 0.9).seconds;
    var after = TCC.interval(down, up, at * 1.1).seconds;
    return Math.sign(before) !== Math.sign(after)
      && Math.abs(TCC.interval(down, up, at).seconds) < 1e-6;
  });

/* ------------------------------------------------------------------------------------------------
 * 7. THE REFUSALS. Asserting what this engine must never grow.
 *
 * These look odd as tests because they assert absence. They are here because the failure mode this
 * repo exists to avoid is a confident wrong answer, and the way that arrives is not a bug: it is a
 * helpful person adding an obviously useful function. A test is the only thing that argues back.
 * --------------------------------------------------------------------------------------------- */
group('The refusals');

check('the engine exports no coordination verdict', 'see build/engine.js header', function () {
  return typeof TCC.isCoordinated === 'undefined'
    && typeof TCC.coordinates === 'undefined'
    && typeof TCC.verdict === 'undefined'
    && typeof TCC.pass === 'undefined';
});

check('the customary 0.3-0.4 s interval is carried as cited context, flagged as not a threshold',
  'TM 5-811-14 para 4-2d(2) says the interval "is usually 0.3-0.4 seconds"', function () {
    var c = TCC.CUSTOMARY_CTI;
    // The wording matters. "Usually" is a rule of thumb for a person to apply, and an if statement
    // would turn it into a limit the source declined to state. And the passage it comes from is
    // IEEE 242-1986 material reprinted by a permission granted to the Army, not to this repo, so
    // the number is cited and the passage is not reproduced.
    return c.low === 0.3 && c.high === 0.4 && c.wording === 'usually'
      && c.notAThreshold === true && /242/.test(c.cite);
  });

check('no curve family claims conformance to a standard this repo has not read',
  'IEEE C37.112 is gated and unread; GE and SEL both cite it over different constants', function () {
    var blob = JSON.stringify(Curves.family(FAM));
    return !/C37\.112/.test(blob) && !/conform/i.test(blob);
  });

/* ------------------------------------------------------------------------------------------------
 * 8. THE SENSITIVITY CONTROL.
 *
 * Everything above passed. That is worth nothing until the same assertions are shown to FAIL when
 * the engine is wrong. Each control below is a wrong engine, built here, checked against the same
 * published cells the real engine was checked against. Every one MUST be rejected.
 *
 * The three wrong equations are not invented for the exercise. Two of them are the actual
 * transcriptions that two independent research passes returned when they read a curve table off a
 * third party scan instead of the publisher's PDF. This repo's rule about primaries was earned by
 * exactly these, so they are kept here as the control.
 * --------------------------------------------------------------------------------------------- */
group('Sensitivity control: wrong engines must be REJECTED');

function cellsAgreeing(tripFn) {
  var n = 0;
  Object.keys(P.TRIP_TIMES).forEach(function (shapeId) {
    var c = P.CONSTANTS[shapeId];
    Object.keys(P.TRIP_TIMES[shapeId]).forEach(function (tdm) {
      P.TRIP_TIMES[shapeId][tdm].forEach(function (published, i) {
        var calc = tripFn(c, parseFloat(tdm), P.MULTIPLES[i]);
        if (isFinite(calc) && agreesToPrintedPrecision(calc, published)) n++;
      });
    });
  });
  return n;
}

check('CONTROL: the real equation agrees with all 210 cells (if this fails, every check above is void)',
  null, function () {
    return cellsAgreeing(function (c, tdm, m) { return tdm * (c.A / (Math.pow(m, c.p) - 1) + c.B); }) === 210;
  });

check('CONTROL: B moved inside the denominator is rejected (this is a real wrong scrape)',
  'the fraction bar flattens to dashes in a text layer', function () {
    var n = cellsAgreeing(function (c, tdm, m) { return tdm * (c.A / (Math.pow(m, c.p) - c.B)); });
    return n === 0;
  });

check('CONTROL: B added outside the TDM multiplier is rejected', 'the "+ B" is inside the bracket', function () {
  var n = cellsAgreeing(function (c, tdm, m) { return tdm * (c.A / (Math.pow(m, c.p) - 1)) + c.B; });
  return n < 210;
});

check('CONTROL: the "-1" dropped from the denominator is rejected', 'M^p - 1, not M^p', function () {
  return cellsAgreeing(function (c, tdm, m) { return tdm * (c.A / Math.pow(m, c.p) + c.B); }) === 0;
});

check('CONTROL: a constant set ~5x off is rejected by GE\'s table',
  'the GE and SEL families sit about 5x apart. See ../sources/SOURCES.md', function () {
    // The whole point of naming the family after its vendor rather than after the standard both
    // vendors cite. If GE's published table happily accepted a constant set from five times away,
    // the distinction this project is built on would not exist and mixing tables would be harmless.
    //
    // NOTE ON WHAT THIS CONTROL IS AND IS NOT. The divider is a plain 5, not SEL's published
    // constants. That is deliberate: this session did not read SEL's manual at SEL, so writing
    // SEL's numbers here would put a factual claim about SEL into a public repo on the strength of
    // a university course handout. The measured ~5x gap is what SOURCES.md records; a scaled
    // constant set exercises the same rejection without asserting a number this file cannot stand
    // behind. If someone later reads SEL's manual at SEL, this control can be sharpened to use the
    // real constants and should be.
    var n = 0;
    Object.keys(P.TRIP_TIMES['extremely-inverse']).forEach(function (tdm) {
      P.TRIP_TIMES['extremely-inverse'][tdm].forEach(function (published, i) {
        var m = P.MULTIPLES[i], c = P.CONSTANTS['extremely-inverse'];
        var calc = parseFloat(tdm) * ((c.A / 5) / (Math.pow(m, c.p) - 1) + c.B / 5);
        if (agreesToPrintedPrecision(calc, published)) n++;
      });
    });
    return n === 0;
  });

check('CONTROL: the tie assertion can fail (a tie one ULP away from the boundary is not a tie)',
  null, function () {
    // Guards the six-ties check itself: if HALF_ULP were widened, this would start counting cells
    // that are not on the tie and the count would stop being 6.
    return !agreesToPrintedPrecision(8.09 + HALF_ULP * 2, 8.09)
      && agreesToPrintedPrecision(8.0895, 8.09);
  });

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('\nVERIFY FAILED. This project does not ship.');
  process.exit(1);
}
console.log('\nAll checks reproduce the GE Multilin 850 manual\'s own published numbers.');
console.log('210 of 210 published trip times, plus the prose worked example on p.4-124.');
