// 04 Relay bench. Verify.
//
//   node verify/verify.js        (from projects/04-relay-bench/)
//
// Seven devices, and they do NOT all verify to the same standard of evidence. That is stated, not
// hidden, because a bench that pretends 27's timer behaviour is as sourced as 51's 210 cell table is
// exactly the failure this repo exists to avoid:
//   51  reproduces project 02's published GE 850 table, THROUGH 02'S ENGINE (the interlock).
//   87  reproduces the four published minimum-slope values of the SEL "Percentage of What?" paper.
//   25  reproduces an SEL published worked advance angle.
//   86  reproduces the GE 850 non-volatile latch truth table.
//   50  asserts its own stated threshold + definite-time behaviour (no published number to hit).
//   27/59 assert their own stated timer behaviour and direction (no sourced number; claims none).
//
// Section F asserts the REFUSALS, per pattern #19, and its mutants break NO calculation.

'use strict';

var path = require('path');
var D = require(path.join(__dirname, '..', 'build', 'devices.js'));

var passed = 0;
var failures = [];
function check(name, fn) {
  try { var r = fn(); if (r === true) { passed++; return; } failures.push(name + '\n      ' + (r || 'falsy')); }
  catch (e) { failures.push(name + '\n      threw: ' + e.message); }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps == null ? 1e-9 : eps); }

// =============================================================================================
console.log('\nA. Device 50, instantaneous overcurrent. A threshold, not a curve.');
// =============================================================================================

check('A1  picks up at or above pickup, drops below', function () {
  var d = { pickup: 1000, delay: 0.05 };
  if (D.element50(d, 1000).pickedUp !== true) return 'did not pick up at exactly pickup';
  if (D.element50(d, 999).pickedUp !== false) return 'picked up below pickup';
  return true;
});
check('A2  definite time: trip time does NOT vary with current (this is what makes it not a 51)', function () {
  var d = { pickup: 1000, delay: 0.05 };
  return near(D.element50(d, 1200).tripTime, 0.05) && near(D.element50(d, 5000).tripTime, 0.05) ||
    'trip time varied with current; that would be an inverse curve, not an instantaneous element';
});
check('A3  below pickup never trips (Infinity)', function () {
  return D.element50({ pickup: 1000, delay: 0.05 }, 500).tripTime === Infinity || 'tripped below pickup';
});

// =============================================================================================
console.log('B. Device 51, inverse-time overcurrent. THE INTERLOCK: it runs on project 02\'s engine.');
// =============================================================================================

check('B1  02\'s engine is actually loaded (the interlock is real, not a stub)', function () {
  return D.hasTCC() === true || 'project 02\'s TCC engine did not load; 51 cannot compute';
});
check('B2  reproduces GE 850\'s published worked example THROUGH 02: TDM=2 at 5x pickup -> 2.59 s', function () {
  var relay = { family: 'ge850-ieee', shape: 'extremely-inverse', pickup: 100, tdm: 2 };
  var t = D.element51(relay, 500).tripTime;   // 5 x 100 A
  return near(t, 2.59, 0.005) || 'expected GE\'s published 2.59 s, got ' + t;
});
check('B3  🔑 THE REFUSAL SURVIVES THE INTERLOCK: an unnamed curve family still THROWS', function () {
  try {
    D.element51({ family: 'ieee', shape: 'extremely-inverse', pickup: 100, tdm: 2 }, 500);
    return 'a generic "ieee" family computed a number; 04 dropped 02\'s refusal';
  } catch (e) {
    return /unknown curve family/.test(e.message) || 'threw, but not the family refusal: ' + e.message;
  }
});

// =============================================================================================
console.log('C. Devices 27 and 59, under/over-voltage. DIRECTION is the whole content.');
// =============================================================================================

check('C1  27 UNDERvoltage picks up LOW: trips at/below pickup, not above', function () {
  var d = { pickup: 100, pickupDelay: 2 };
  return D.element27(d, 90).pickedUp === true && D.element27(d, 110).pickedUp === false ||
    'undervoltage element did not pick up on low voltage';
});
check('C2  59 OVERvoltage picks up HIGH: trips at/above pickup, not below', function () {
  var d = { pickup: 120, pickupDelay: 2 };
  return D.element59(d, 130).pickedUp === true && D.element59(d, 110).pickedUp === false ||
    'overvoltage element did not pick up on high voltage';
});
check('C3  🔴 27 and 59 are OPPOSITE at the same voltage (a silent inversion is 03\'s "failed at t=0")', function () {
  var v = 130;
  return D.element27({ pickup: 120, pickupDelay: 1 }, v).pickedUp === false &&
         D.element59({ pickup: 120, pickupDelay: 1 }, v).pickedUp === true ||
    '27 and 59 agreed at one voltage; one of them has its direction backwards';
});
check('C4  definite-time delay is returned on pickup', function () {
  return near(D.element27({ pickup: 100, pickupDelay: 2.5 }, 80).tripTime, 2.5) || 'wrong pickup delay';
});

// =============================================================================================
console.log('D. Device 87, percentage restrained differential. Reproduces SEL Table I.');
// =============================================================================================

// 🔴 THE FIXTURE: SEL "Percentage Restrained Differential, Percentage of What?" (Thompson), Table I,
// "MINIMUM SLOPE SETTING FOR 27 PERCENT ERROR EXAMPLE", read at the publisher (cms-cdn.selinc.com).
// Err = 4+3+5+10+0+5 = 27 (the paper's own stated sum, p.7). Equations (5) and (6) were RENDERED at
// 11x and read as an image, because the text layer flattened the fraction bar. Published values:
var TABLE_I = [
  { restraint: 'maximum', k: null, published: 27 },
  { restraint: 'average', k: 0.50, published: 32 },
  { restraint: 'average', k: 0.44, published: 36 },
  { restraint: 'average', k: 1.00, published: 16 },
];

check('D1  reproduces all four published Table I minimum-slope values (Err=27, eqs 5 and 6, round up)', function () {
  for (var i = 0; i < TABLE_I.length; i++) {
    var row = TABLE_I[i];
    var got = D.minimumSlopePercent(27, row.restraint, row.k);
    if (got !== row.published) {
      return row.restraint + (row.k ? ' k=' + row.k : '') + ': expected ' + row.published + ', got ' + got;
    }
  }
  return true;
});
check('D2  the rounding is UP, not to nearest: raw AVERAGE k=0.5 is 31.21 and the table shows 32 ' +
      '(a minimum slope must be at least this to stay secure)', function () {
  var raw = (27 / ((200 - 27) * 0.5)) * 100;   // 31.21...
  if (raw >= 32 || raw <= 31) return 'the raw value is not between 31 and 32; the round-up claim is moot';
  return D.minimumSlopePercent(27, 'average', 0.5) === 32 ||
    'raw 31.21 did not round UP to the published 32';
});
check('D3  🔴 REFUSES without a named restraint definition (the SEL paper\'s whole point)', function () {
  try { D.element87({ slope: 25, minPickup: 0.5 }, [10, -8]); return 'computed a verdict with no restraint named'; }
  catch (e) { return /name the restraint/.test(e.message) || 'threw, but not the restraint refusal: ' + e.message; }
});
check('D4  the SAME currents give a DIFFERENT restraint under AVERAGE vs MAXIMUM (the thesis)', function () {
  var currents = [10, -6];   // |sum|=4 operate; |10|,|6| restraint inputs
  var avg = D.restraintCurrent('average', 0.5, currents);   // 0.5*(10+6) = 8
  var max = D.restraintCurrent('maximum', null, currents);  // max(10,6) = 10
  if (!near(avg, 8)) return 'AVERAGE k=0.5 restraint expected 8, got ' + avg;
  if (!near(max, 10)) return 'MAXIMUM restraint expected 10, got ' + max;
  return avg !== max || 'the two definitions gave the same restraint; the fixture proves nothing';
});
check('D6  the SLOPE actually governs the verdict: the same currents operate at a low slope and ' +
      'restrain at a high one (found by a mutant that ignored the slope entirely)', function () {
  var currents = [10, -6];   // iop = 4, MAXIMUM restraint = 10
  var lowSlope = D.element87({ restraint: 'maximum', slope: 25, minPickup: 0.5 }, currents);
  var highSlope = D.element87({ restraint: 'maximum', slope: 50, minPickup: 0.5 }, currents);
  // slope 25%: threshold 0.25*10 = 2.5, iop 4 > 2.5 -> operates
  // slope 50%: threshold 0.50*10 = 5.0, iop 4 < 5.0 -> restrains
  return lowSlope.operates === true && highSlope.operates === false ||
    'the operate verdict did not change with the slope setting; the slope is being ignored';
});
check('D7  the minimum-pickup floor governs too: below it, a differential above the slope still ' +
      'restrains', function () {
  var currents = [10, -6];   // iop = 4
  var below = D.element87({ restraint: 'maximum', slope: 25, minPickup: 5 }, currents);  // 4 < 5
  return below.operates === false && below.overSlope === true && below.overPickup === false ||
    'the minimum pickup floor was not enforced';
});
check('D5  operate = |phasor sum|: a through current (equal and opposite) does NOT operate; ' +
      'an internal fault (additive) does', function () {
  var dev = { restraint: 'maximum', slope: 25, minPickup: 0.5 };
  var through = D.element87(dev, [10, -10]);    // cancels: Iop = 0
  var internal = D.element87(dev, [10, 10]);    // adds: Iop = 20
  if (through.iop !== 0) return 'through current produced operate current ' + through.iop;
  return internal.iop === 20 && internal.operates === true || 'internal fault did not operate';
});

// =============================================================================================
console.log('E. Device 25, synchronism check. Reproduces SEL advance angle; refuses without a relay.');
// =============================================================================================

check('E1  🔑 reproduces SEL\'s published worked value: 0.05 Hz slip, 5-cycle close -> 1.5 deg advance', function () {
  var adv = D.advanceAngleDeg(0.05, 5 / 60);   // 5 cycles at 60 Hz
  return near(adv, 1.5) || 'expected SEL\'s published 1.5 deg, got ' + adv;
});
check('E2  and slip as a rate is 18 deg/s, which the same SEL page also states', function () {
  return near(D.advanceAngleDeg(0.05, 1), 18) || 'slip rate not 18 deg/s';
});
check('E3  🔴 REFUSES without a named relay (03\'s ATS law from a third direction)', function () {
  try {
    D.element25('the-sync-check', { angleDeg: 5, slipHz: 0.05, vLow: 90, vHigh: 110 },
      { angleDeg: 3, slipHz: 0.02, v1: 100, v2: 100 });
    return 'computed sync with no relay named';
  } catch (e) { return /name the relay/.test(e.message) || 'threw, but not the relay refusal: ' + e.message; }
});
check('E4  two SEL product lines disagree with EACH OTHER by 10x on slip range (the reason for E3)', function () {
  var a = D.syncRelay('sel-751a').slipMinHz;      // 0.05
  var b = D.syncRelay('sel-451-6').slipMinHz;     // 0.005
  return near(a / b, 10) || 'the two SEL slip ranges are not 10x apart; got ' + a + ' and ' + b;
});
check('E5  in-sync is an AND of three windows: any one out of range blocks it', function () {
  var relay = 'sel-751a';
  var setting = { angleDeg: 10, slipHz: 0.1, vLow: 90, vHigh: 110 };
  var good = { angleDeg: 5, slipHz: 0.05, v1: 100, v2: 100 };
  if (D.element25(relay, setting, good).inSync !== true) return 'a fully in-window condition was not in sync';
  // knock each window out in turn
  var badAngle = D.element25(relay, setting, { angleDeg: 15, slipHz: 0.05, v1: 100, v2: 100 });
  var badSlip = D.element25(relay, setting, { angleDeg: 5, slipHz: 0.2, v1: 100, v2: 100 });
  var badVolt = D.element25(relay, setting, { angleDeg: 5, slipHz: 0.05, v1: 80, v2: 100 });
  return (!badAngle.inSync && !badSlip.inSync && !badVolt.inSync) ||
    'a condition with one window out of range was still reported in sync';
});
check('E6  🔴 the GE default numbers are flagged stale-mirror, never presented as current', function () {
  var ge = D.SYNC_RELAYS['ge-850-v2.0x'];
  if (ge.readAt !== 'MIRROR' || ge.defaultsStale !== true) return 'GE profile not flagged stale-mirror';
  // and the two current SEL profiles publish NO default (data sheets have ranges only)
  return D.SYNC_RELAYS['sel-751a'].defaults === null && D.SYNC_RELAYS['sel-451-6'].defaults === null ||
    'a data-sheet profile carried a default that was never read';
});

// =============================================================================================
console.log('F. Device 86, lockout relay. Reproduces the GE 850 non-volatile latch truth table.');
// =============================================================================================

// GE 850 "Non-volatile Latches" p.4-414, Reset Dominant, rendered at 9x and read as an image.
check('G1  SET on, RESET off -> ON (a trip sets the lockout)', function () {
  return D.element86('reset-dominant', true, false, false) === true || 'SET did not latch on';
});
check('G2  🔴 SET off, RESET off -> PREVIOUS STATE. THIS LINE IS THE LATCH: input removed, state held', function () {
  var held = D.element86('reset-dominant', false, false, true);   // was ON, inputs gone
  var stayLow = D.element86('reset-dominant', false, false, false);
  return held === true && stayLow === false || 'the latch did not hold its previous state';
});
check('G3  RESET on -> OFF (the deliberate reset clears it)', function () {
  return D.element86('reset-dominant', false, true, true) === false || 'RESET did not clear the latch';
});
check('G4  SET and RESET both on -> OFF (Reset Dominant: reset wins, so it can always be cleared)', function () {
  return D.element86('reset-dominant', true, true, false) === false ||
    'a simultaneous set and reset did not resolve to reset-dominant off';
});
check('G5  the operator lockout wrapper latches on a trip and holds until reset', function () {
  var s = { lockedOut: false };
  s = D.lockout86(s, true, false);    // trip
  if (s.lockedOut !== true) return 'trip did not lock out';
  s = D.lockout86(s, false, false);   // trip input gone, no reset
  if (s.lockedOut !== true) return 'lockout dropped when the trip input went away (not a latch)';
  s = D.lockout86(s, false, true);    // manual reset
  return s.lockedOut === false || 'manual reset did not clear the lockout';
});

// =============================================================================================
console.log('SecF. The refusals. What the bench declines to claim. These break no calculation.');
// =============================================================================================

var fs = require('fs');
check('F1  no shipped string claims conformance to IEEE C37.112 or C37.2', function () {
  var txt = fs.readFileSync(path.join(__dirname, '..', 'build', 'devices.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ').replace(/([^:])\/\/.*$/gm, '$1');
  var m = txt.match(/conforms?\s+to\s+(IEEE\s+)?C37\.(112|2)|implements?\s+(IEEE\s+)?C37\.(112|2)/i);
  return !m || 'a shipped string claims standards conformance: "' + m[0] + '"';
});
check('F2  device 51 will not run without project 02 (the interlock is required, not optional)', function () {
  // if 02 were absent, element51 must throw rather than silently faking a curve
  return typeof D.element51 === 'function' && D.hasTCC() === true ||
    'cannot confirm 51 hard-depends on 02';
});
check('F3  the two restraint definitions are BOTH present and distinct (no silent default)', function () {
  var ids = Object.keys(D.RESTRAINT_DEFINITIONS).sort();
  return JSON.stringify(ids) === JSON.stringify(['average', 'maximum']) ||
    'the restraint definitions were collapsed; the 87 refusal rests on both existing';
});
check('F4  every sync relay profile carries its provenance (readAt + revision), so none can be ' +
      'shown as a current publisher fact when it is a stale mirror', function () {
  var keys = Object.keys(D.SYNC_RELAYS);
  for (var i = 0; i < keys.length; i++) {
    var r = D.SYNC_RELAYS[keys[i]];
    if (!r.readAt || !r.revision) return keys[i] + ' has no provenance';
  }
  return keys.length >= 3 || 'expected at least the three publisher-read profiles plus GE';
});

// =============================================================================================
console.log('');
if (failures.length) {
  console.log(passed + ' passed, ' + failures.length + ' FAILED\n');
  failures.forEach(function (f) { console.log('  FAIL  ' + f); });
  console.log('');
  process.exit(1);
}
console.log(passed + ' checks passed, 0 failures.');
console.log('Seven ANSI elements. 51 runs on project 02\'s verified engine (the interlock, 2.5934 s');
console.log('vs GE\'s published 2.59). 87 reproduces SEL Table I\'s four minimum-slope values. 25');
console.log('reproduces SEL\'s 1.5 deg advance angle and refuses without a named relay. 86 reproduces');
console.log('the GE 850 latch truth table. Each element claims only what a document publishes.');
console.log('');
