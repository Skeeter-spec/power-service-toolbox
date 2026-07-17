// 04 Relay bench. Device models.
//
// Seven ANSI protective elements as configurable simulated relays: 50, 51, 27, 59, 87, 25, 86.
// Zero dependencies except ONE, and that one dependency is the point of the project.
//
// 🔴 DEVICE 51 IS NOT REIMPLEMENTED HERE. IT IMPORTS PROJECT 02'S ENGINE, LITERALLY.
// The toolbox's thesis is that the tools interlock, and #17 says an interlock in a plan is a
// hypothesis until proven. This one was proven by measurement: driving 02's engine from a relay
// bench shaped call reproduces GE's published "2.59 s" exactly (2.5934). So 04 does not copy 02's
// curve math, it REQUIRES it, and 02's "name the vendor family or throw" refusal comes with it for
// free. An interlock that carried the code but dropped the refusal would be a downgrade.
// See engine51() below. If 02 moves, 04 breaks, and that is correct: a copy that cannot break is a
// copy that can silently drift out of agreement.
//
// 🔴 WHAT UNIFIES ALL SEVEN: EACH ELEMENT ONLY CLAIMS WHAT A DOCUMENT PUBLISHES, AND NAMES WHOSE.
// 50 is a threshold, verified against its own stated behaviour. 51 reproduces 02's 210 cell table.
// 27/59 are definite time, verified against timer behaviour with NO sourced number (so they claim
// none). 87 reproduces the four published minimum slope values of the SEL "Percentage of What?"
// paper AND refuses to run without a named restraint definition, because the paper's whole point is
// that the verdict changes with the choice. 25 reproduces an SEL worked advance angle AND refuses
// without a named relay, because two SEL product lines disagree with each other 10x. 86 reproduces
// the GE 850 non-volatile latch truth table.

'use strict';

// ---- the interlock: pull in 02's verified curve engine for device 51 ----
// Resolved LAZILY through a function, NOT captured into a module-level `var TCC`. In a browser a
// top-level `var TCC` becomes a window global and COLLIDES with 02's own global `TCC` (its engine.js
// does `root.TCC = ...`), clobbering it to null before we could read it. Measured, not theorised.
function getTCC() {
  if (typeof module !== 'undefined' && module.exports) {
    // node / verify: require across projects. 02 is the source of truth for 51's math.
    return require('../../02-tcc-coordination/build/engine.js');
  }
  if (typeof window !== 'undefined') {
    // browser: 02's curves.js + engine.js load first via <script src>, exposing window.TCC.
    return window.TCC || null;
  }
  return null;
}

// =============================================================================================
// DEVICE 50. Instantaneous overcurrent.
//
// A threshold, NOT a curve, and that distinction is why 50 is built here rather than reused from 02:
// 02 models inverse time curves and an instantaneous element has none. It trips whenever current is
// at or above pickup, after a fixed (definite) time delay, with no dependence on how far above.
// There is no published worked example beyond this behaviour, so the element claims none: it asserts
// only that it picks up at pickup and times out at its set delay.
// =============================================================================================

function element50(device, current) {
  if (!(device.pickup > 0)) throw new Error('50 pickup must be > 0 A');
  if (!(device.delay >= 0)) throw new Error('50 delay must be >= 0 s');
  var pickedUp = current >= device.pickup;
  return {
    device: 50,
    pickedUp: pickedUp,
    // definite time: the trip time does not vary with current, unlike 51
    tripTime: pickedUp ? device.delay : Infinity,
    note: 'Instantaneous (definite-time) overcurrent. Trips fixed-time above pickup, ' +
          'independent of magnitude. No inverse curve.',
  };
}

// =============================================================================================
// DEVICE 51. Inverse time overcurrent. IMPORTS PROJECT 02.
//
// device = { family, shape, pickup, tdm } exactly as 02 expects. The trip time, the reset time and
// the multiple-of-pickup all come from 02's engine, which reproduced all 210 cells of the GE 850
// published table to the table's own precision. 04 adds NOTHING to the curve math.
// =============================================================================================

function element51(device, current) {
  var TCC = getTCC();
  if (!TCC) throw new Error('51 requires project 02\'s engine (TCC). In the browser, load ' +
    '02/build/curves.js then 02/build/engine.js before devices.js.');
  // 02 throws on an unnamed curve family ("unknown curve family: ieee. Families are named per vendor
  // on purpose."). 04 inherits that refusal rather than laundering it away.
  var t = TCC.tripTime(device, current);
  return {
    device: 51,
    pickedUp: current > device.pickup,
    tripTime: t,
    multiple: TCC.multiple(device, current),
    note: 'Inverse-time overcurrent. Curve math is project 02\'s verified engine, not a copy.',
  };
}

// =============================================================================================
// DEVICES 27 and 59. Under- and over-voltage. Definite time.
//
// 27 picks up when voltage FALLS to or below pickup; 59 when it RISES to or above pickup. Both time
// out on a fixed pickup delay. NO manufacturer worked example with a number was sourced for these
// (see SOURCES.md), so they assert only their own stated behaviour and the tool must not imply the
// same standard of evidence as 51. The direction is the whole content: getting 27 to trip on high
// voltage would be a silent inversion of exactly the kind 03's "failed at t=0" bug was.
// =============================================================================================

function element27(device, voltage) {
  if (!(device.pickup > 0)) throw new Error('27 pickup must be > 0 V');
  var pickedUp = voltage <= device.pickup;   // UNDER voltage: trips LOW
  return { device: 27, pickedUp: pickedUp, tripTime: pickedUp ? device.pickupDelay : Infinity,
           note: 'Undervoltage. Picks up at or BELOW pickup.' };
}

function element59(device, voltage) {
  if (!(device.pickup > 0)) throw new Error('59 pickup must be > 0 V');
  var pickedUp = voltage >= device.pickup;   // OVER voltage: trips HIGH
  return { device: 59, pickedUp: pickedUp, tripTime: pickedUp ? device.pickupDelay : Infinity,
           note: 'Overvoltage. Picks up at or ABOVE pickup.' };
}

// =============================================================================================
// DEVICE 87. Percentage restrained differential.
//
// 🔴 THIS ELEMENT REFUSES TO RUN WITHOUT A NAMED RESTRAINT DEFINITION, and the refusal is the
// content. SEL's paper "Percentage Restrained Differential, Percentage of What?" (M. J. Thompson)
// publishes TWO restraint definitions that real relays use, and its entire thesis is that the SAME
// injected currents give a DIFFERENT verdict depending on which one the relay uses. A differential
// element that will not tell you which restraint it uses is not answerable. So `restraint` is a
// required argument with no default, exactly as 02's family is and 03's vendor is.
//
// Operate current (the paper, eq. general form): the phasor sum of the winding currents. With CTs
// oriented into the zone, a through current cancels and an internal fault adds.
// Restraint current, verbatim from the paper:
//   (3) AVERAGE:  IRST = k * ( |IW1| + |IW2| + ... + |IWn| )
//   (4) MAXIMUM:  IRST = MAX( |IW1|, |IW2|, ..., |IWn| )
// Trip when IOP exceeds a minimum pickup AND IOP exceeds (slope% / 100) * IRST.
// =============================================================================================

var RESTRAINT_DEFINITIONS = {
  average: { id: 'average', label: 'AVERAGE (eq. 3)',
             cite: 'SEL, Percentage Restrained Differential, Percentage of What? (Thompson), eq. (3)' },
  maximum: { id: 'maximum', label: 'MAXIMUM (eq. 4)',
             cite: 'SEL, Percentage Restrained Differential, Percentage of What? (Thompson), eq. (4)' },
};

function restraintCurrent(restraint, k, windingCurrents) {
  var mags = windingCurrents.map(Math.abs);
  if (restraint === 'average') {
    if (!(k > 0)) throw new Error('87 AVERAGE restraint needs a scaling factor k > 0');
    return k * mags.reduce(function (a, b) { return a + b; }, 0);
  }
  if (restraint === 'maximum') {
    return Math.max.apply(null, mags);
  }
  // No default. Naming the restraint is the whole point of the source.
  throw new Error('87 REFUSED: name the restraint definition ("average" or "maximum"). The SEL ' +
    'paper this element is built on shows the SAME currents give a DIFFERENT verdict under each, ' +
    'so a differential element without a named restraint is not answerable.');
}

function element87(device, windingCurrents) {
  if (!Array.isArray(windingCurrents) || windingCurrents.length < 2) {
    throw new Error('87 needs at least two winding currents');
  }
  var iop = Math.abs(windingCurrents.reduce(function (a, b) { return a + b; }, 0));
  var irt = restraintCurrent(device.restraint, device.k, windingCurrents);
  var slopeFraction = device.slope / 100;
  var overSlope = iop > slopeFraction * irt;
  var overPickup = iop > device.minPickup;
  return {
    device: 87,
    restraint: RESTRAINT_DEFINITIONS[device.restraint].label,
    iop: iop,
    irt: irt,
    operates: overSlope && overPickup,
    // both conditions, stated separately so the UI can show WHY, per the repo's "show your work"
    overSlope: overSlope,
    overPickup: overPickup,
  };
}

// The published Table I fixture: the MINIMUM slope setting that just accommodates a given proportional
// error, per restraint definition. Equations (5) and (6), RENDERED AT 11x AND READ AS AN IMAGE
// because the text layer flattened the fraction bar (the exact trap that produced two wrong equations
// in this repo before):
//   (5) AVERAGE:  SLP1MIN% = [ Err% / ( (200 - Err%) * k ) ] * 100
//   (6) MAXIMUM:  SLP1MIN% = Err%
// The published Table I rounds each result UP to the next whole percent. That is not arbitrary: these
// are MINIMUM slope settings, so a value must be at least this to stay secure, and rounding up is the
// secure direction. Reproduced: Err=27 (the paper's own stated sum of 4+3+5+10+0+5) gives the four
// published values 27 / 32 / 36 / 16 exactly under ceiling.
function minimumSlopePercent(errPercent, restraint, k) {
  var raw;
  if (restraint === 'maximum') {
    raw = errPercent;                                        // eq. (6)
  } else if (restraint === 'average') {
    raw = (errPercent / ((200 - errPercent) * k)) * 100;     // eq. (5)
  } else {
    throw new Error('name the restraint definition');
  }
  return Math.ceil(raw);   // minimum slope: round UP for security
}

// =============================================================================================
// DEVICE 25. Synchronism check.
//
// 🔴 REFUSES TO RUN WITHOUT A NAMED RELAY, and this is 03's ATS law reached from a third direction.
// There is no "the" sync check: two SEL product lines disagree with EACH OTHER by 10x on slip range,
// both current, both read at the publisher. So the element carries per-relay profiles with their own
// provenance, and throws without one, exactly as 02 throws without a named curve family and 03 throws
// without a named vendor profile.
//
// SYNC LOGIC (SEL, "Fundamentals and Advancements in Generator Synchronizing Systems", Thompson; and
// "Design of a Centralized Substation Synchronizing System", Finney et al.): an AND of three
// independent windows. Angle within setting, slip within band, each source voltage within its window.
//
// ADVANCE ANGLE (same SEL paper, reproduced): advance = slip * 360 * CBCT (breaker close time, s).
// The paper's worked value, reproduced exactly: 0.05 Hz slip and a 5 cycle breaker close give 1.5
// degrees, and slip as a rate is 0.05 * 360 = 18 deg/s, which the paper also states.
// =============================================================================================

// Per-relay published ranges. `readAt` and `revision` travel with each number so the UI never
// presents a mirror or a stale default as a current publisher fact.
var SYNC_RELAYS = {
  'sel-751a': {
    id: 'sel-751a', label: 'SEL-751A',
    slipMinHz: 0.05, slipMaxHz: 0.50, angleMinDeg: 0, angleMaxDeg: 80,
    voltMinV: 0, voltMaxV: 300,
    readAt: 'PUBLISHER', revision: 'Data Sheet 20250411, current',
    defaults: null,   // data sheet publishes RANGES only; no factory default was read
    cite: 'SEL-751A Data Sheet, p.23',
  },
  'sel-451-6': {
    id: 'sel-451-6', label: 'SEL-451-6',
    slipMinHz: 0.005, slipMaxHz: 0.500, angleMinDeg: 3, angleMaxDeg: 80,
    voltMinV: null, voltMaxV: null,
    readAt: 'PUBLISHER', revision: 'Data Sheet 20260217, current',
    defaults: null,
    cite: 'SEL-451-6 Data Sheet, p.26',
  },
  'beckwith-m3410a': {
    id: 'beckwith-m3410a', label: 'Beckwith M-3410A',
    slipMinHz: 0.001, slipMaxHz: 0.500, angleMinDeg: 0, angleMaxDeg: 90,
    // Beckwith publishes a delta-VOLTAGE limit as a percentage, unlike SEL's absolute window
    deltaVoltMinPct: 1.0, deltaVoltMaxPct: 50.0,
    readAt: 'PUBLISHER', revision: 'M-3410A Specification, current',
    defaults: null,
    cite: 'Beckwith M-3410A Specification, p.3',
  },
  'ge-850-v2.0x': {
    id: 'ge-850-v2.0x', label: 'GE 850 (v2.0x, 2017)',
    slipMinHz: 0.01, slipMaxHz: 5.00, angleMinDeg: 1, angleMaxDeg: 100,
    voltMinV: 10, voltMaxV: 600000,
    // 🔴 THE ONLY PROFILE WITH DEFAULTS, AND THEY ARE STALE-MIRROR. Read at a distributor mirror at
    // v2.0x (2017); GE currently ships v4.3x (2026), login walled and unread. The UI must label
    // these as such and never present them as a current publisher fact.
    readAt: 'MIRROR', revision: 'v2.0x (2017), distributor mirror; current v4.3x unread',
    defaults: { slipHz: 0.20, angleDeg: 20, voltV: 2000 },
    defaultsStale: true,
    cite: 'GE 850 Instruction Manual v2.0x, pp.4-335 to 4-337',
  },
};

function syncRelay(id) {
  var r = SYNC_RELAYS[id];
  if (!r) {
    throw new Error('25 REFUSED: name the relay. There is no "the" sync check. Two SEL product ' +
      'lines disagree with each other by 10x on slip range. Choose one of: ' +
      Object.keys(SYNC_RELAYS).join(', ') + '.');
  }
  return r;
}

// The advance angle the closing logic aims at. Published formula, reproduced.
function advanceAngleDeg(slipHz, breakerCloseSeconds) {
  return slipHz * 360 * breakerCloseSeconds;
}

// The sync-check decision: an AND of three windows, each checked against the NAMED relay's own range
// or the caller's setting within that range.
function element25(relayId, setting, condition) {
  var relay = syncRelay(relayId);   // throws if unnamed
  // settings must lie within the named relay's published range; clamp-check rather than invent
  function within(v, lo, hi) { return (lo == null || v >= lo) && (hi == null || v <= hi); }

  var angleOk = Math.abs(condition.angleDeg) <= setting.angleDeg;
  var slipOk = Math.abs(condition.slipHz) <= setting.slipHz;
  // voltage window: each source magnitude within [vLow, vHigh] the caller sets
  var vOk = condition.v1 >= setting.vLow && condition.v1 <= setting.vHigh &&
            condition.v2 >= setting.vLow && condition.v2 <= setting.vHigh;

  return {
    device: 25,
    relay: relay.label,
    angleOk: angleOk, slipOk: slipOk, voltageOk: vOk,
    inSync: angleOk && slipOk && vOk,
    settingWithinRange: {
      angle: within(setting.angleDeg, relay.angleMinDeg, relay.angleMaxDeg),
      slip: within(setting.slipHz, relay.slipMinHz, relay.slipMaxHz),
    },
    provenance: { readAt: relay.readAt, revision: relay.revision, cite: relay.cite },
  };
}

// =============================================================================================
// DEVICE 86. Lockout relay. A reset-dominant non-volatile latch.
//
// GE 850 "Non-volatile Latches", p.4-414, truth table rendered at 9x and read as an image. GE's own
// stated purpose is the lockout function: "a permanent logical flag ... does not reset when the relay
// reboots ... permanently blocking relay functions ... until a deliberate HMI action resets the
// latch." Published truth table (Reset Dominant): SET on -> ON; SET off & RESET off -> PREVIOUS
// STATE (the latch); RESET on -> OFF (reset wins a simultaneous set). Non-volatile: survives a
// power-down, exactly like a hand-reset lockout stays tripped through a station outage.
//
// This is NOT the 850's "Reclosure Lockout" (the autoreclose shot-limit state, which shares only the
// word). The device number 86 is IEEE C37.2, cited by number only.
// =============================================================================================

function element86(type, set, reset, previousState) {
  set = !!set; reset = !!reset;
  var prev = !!previousState;
  if (type === 'reset-dominant') {
    // reset wins a tie: RESET on -> off, regardless of SET
    if (reset) return false;
    if (set) return true;
    return prev;                 // both off: HOLD. This line is the latch.
  }
  if (type === 'set-dominant') {
    if (set) return true;
    if (reset) return false;
    return prev;
  }
  throw new Error('86 latch type must be "reset-dominant" or "set-dominant"');
}

// A device 86 is a reset-dominant non-volatile latch, driven by trip inputs, cleared by a manual
// reset. This wraps element86 as the lockout an operator sees.
function lockout86(state, tripInput, manualReset) {
  return {
    device: 86,
    lockedOut: element86('reset-dominant', tripInput, manualReset, state.lockedOut),
    note: 'Non-volatile: this state must persist across a power-down. Clears only on manual reset.',
  };
}

var API = {
  element50: element50, element51: element51, element27: element27, element59: element59,
  element87: element87, element25: element25, element86: element86, lockout86: lockout86,
  restraintCurrent: restraintCurrent, minimumSlopePercent: minimumSlopePercent,
  advanceAngleDeg: advanceAngleDeg, syncRelay: syncRelay,
  RESTRAINT_DEFINITIONS: RESTRAINT_DEFINITIONS, SYNC_RELAYS: SYNC_RELAYS,
  hasTCC: function () { return !!getTCC(); },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
} else if (typeof window !== 'undefined') {
  window.Devices = API;
}
