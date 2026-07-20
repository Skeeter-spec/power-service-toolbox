/*
 * engine.js. A ladder logic interpreter that reproduces one published truth table and builds a close
 * permissive from named elements, and refuses to claim a factory scheme it has not read.
 *
 * The verified core is latch(): the GE Multilin 850 Non-volatile Latch truth table (p4-414, Reset
 * Dominant), reproduced row for row. Everything the permissive does is the boolean AND/NOT of that
 * latch and four more named inputs; it is verified as self consistent logic, not as a reproduction of
 * a vendor's interlock, because none was sourced.
 *
 * WHAT THIS ENGINE REFUSES TO DO, AND WHY THAT IS THE POINT:
 *   - It will not name a factory close permissive scheme. No manual publishing a full one has been
 *     read, so factoryPermissive() throws. The 86 latch IS published and IS reproduced; the combined
 *     interlock is not, and the refusal says exactly that much and no more.
 *   - It ships no relay's default setting as on screen fact. The one relay default in the sources
 *     (GE 850 v2.0x sync defaults) is stale revision risk on a mirror, so it is not used.
 *
 * See ./rungs.js for every constant and its page, and ../sources/SOURCES.md for the audit.
 */
'use strict';

const D = (typeof require !== 'undefined' && typeof module !== 'undefined')
  ? require('./rungs.js')
  : window.LADDER_DATA;

/* ================================================================== *
 * THE LATCH. GE Multilin 850, Non-volatile Latch, Reset Dominant, p4-414.
 *
 * Reset Dominant means a reset wins a simultaneous set, so the operator can always clear the lockout.
 * With neither input asserted the output HOLDS its previous state: that held output is the latch, and
 * it is what a hand reset lockout relay does.
 * ================================================================== */

function latch(set, reset, prev) {
  if (reset) return false;   // On/On -> Off and Off/On -> Off: reset dominant
  if (set) return true;      // On/Off -> On: a trip sets the lockout
  return prev;               // Off/Off -> Previous State: HELD, this is the latch
}

/* Apply the truth table to a named starting state, so the UI and the verify share one implementation.
 * `out` is the string the published table prints; this resolves "Previous State" against prev. */
function latchOutput(set, reset, prev) {
  const on = latch(set, reset, prev);
  return on ? 'On' : 'Off';
}

/* ================================================================== *
 * THE CLOSE PERMISSIVE. This tool's own construction from named elements. See rungs.js PERMIT_*.
 *
 * closePermit is the boolean:
 *   (86 lockout CLEAR) AND (25 sync OK) AND (spring charged) AND NOT(50 trip OR 51 trip)
 * ================================================================== */

function closePermit(inp) {
  const lockoutClear = inp.lockout86 === false;
  const overcurrent = inp.trip50 === true || inp.trip51 === true;   // 50 OR 51
  return lockoutClear && inp.syncOk25 === true && inp.springCharged === true && !overcurrent;
}

/* De Morgan, stated as code so the interpreter can show both forms agree for any inputs:
 * NOT(50 OR 51) === (NOT 50) AND (NOT 51). */
function noOvercurrent_orForm(inp) { return !(inp.trip50 === true || inp.trip51 === true); }
function noOvercurrent_andForm(inp) { return (inp.trip50 !== true) && (inp.trip51 !== true); }

/* Enumerate all 2^5 input combinations. Returns [{inputs, permit}], deterministic in PERMIT_INPUTS
 * order, so the verify can assert the whole function, not a sampled corner of it. */
function enumerate() {
  const keys = D.PERMIT_INPUTS;
  const rows = [];
  for (let m = 0; m < (1 << keys.length); m++) {
    const inputs = {};
    keys.forEach((k, i) => { inputs[k] = Boolean(m & (1 << i)); });
    rows.push({ inputs, permit: closePermit(inputs) });
  }
  return rows;
}

/* The single permitting combination, read from the data, so the UI can show "what it takes to close"
 * without hard coding it a second time. */
function permittingInputs() {
  const req = D.PERMIT_REQUIRED;
  const out = {};
  for (const k of D.PERMIT_INPUTS) out[k] = req[k];
  return out;
}

/* ================================================================== *
 * THE 25 ADVANCE ANGLE. SEL, Thompson 2012, p5. advance angle = slip x 360 x CBCT.
 * A sourced worked example, shown as its own panel. It is NOT wired into a defaulted "in sync"
 * verdict, because no relay default was read at a current publisher copy. See SOURCES.md.
 * ================================================================== */

function advanceAngleDeg(slipHz, breakerCloseSeconds) {
  return slipHz * 360 * breakerCloseSeconds;
}

function slipRateDegPerSec(slipHz) {
  return slipHz * 360;
}

/* ================================================================== *
 * §F REFUSALS. Pattern 19: a refusal is not self enforcing, so it is asserted in verify and grepped
 * in the shipped build. The 86 latch IS published and IS reproduced above; what is NOT sourced is a
 * vendor's full factory permissive scheme, and this refusal must say exactly that, without denying
 * the part that IS published (the equal and opposite overclaim).
 * ================================================================== */

function factoryPermissive(vendor) {
  if (!vendor || !D.VENDOR_SCHEMES[vendor]) {
    throw new Error(
      'No factory close permissive scheme has been sourced and read, so this tool names none. ' +
      'It builds the permissive from named elements whose behaviours are individually sourced. ' +
      'The 86 latch truth table IS published (GE 850 p4-414) and is reproduced here; a vendor\'s ' +
      'full interlock is not, and adding one requires reading that relay\'s permissive logic at ' +
      'the publisher.');
  }
  return D.VENDOR_SCHEMES[vendor];
}

/* ================================================================== */

const ENGINE = {
  latch, latchOutput,
  closePermit, noOvercurrent_orForm, noOvercurrent_andForm, enumerate, permittingInputs,
  advanceAngleDeg, slipRateDegPerSec,
  factoryPermissive,
};

if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
if (typeof window !== 'undefined') window.LADDER_ENGINE = ENGINE;
