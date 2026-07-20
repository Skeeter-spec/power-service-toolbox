/*
 * engine.js. The three-phase relations this sandbox reproduces, as pure functions.
 *
 * THE VERIFIED CORE is two published worked examples:
 *   - DOE line/phase and power-triangle relations (delta and wye), reproducing nine printed answers.
 *   - TM 5-811-14 per-unit conversion, base current, and symmetrical fault current = I_base / Z_pu,
 *     reproducing the published .004/.32/.56/.008 pu lines, the 2405.6 A base current, and the
 *     9661/9434/9252 A fault currents.
 *
 * WHAT THIS ENGINE REFUSES TO DO, AND WHY THAT IS THE POINT (pattern 19):
 *   - reduceNetwork() throws. Reducing a one-line to its Thevenin per-unit impedance is the engineered
 *     short-circuit study. TM Example 5 does it (Figure G-21) and PUBLISHES the reduced pu; this tool
 *     reproduces the published fault = I_base / Z_pu division and takes the reduced pu as published.
 *     A wrong Z_pu makes the fault number wrong, so the tool will not manufacture one.
 *   - It ships no interrupting/withstand rating and no "your gear is rated" verdict. It touches fault
 *     math, so it carries the not-for-field-use banner (guardrail 1).
 *
 * See ./data.js for every constant and its page, and ../sources/SOURCES.md for the audit.
 */
'use strict';

const ROOT3 = Math.sqrt(3);

/* ================================================================== *
 * LINE vs PHASE. DOE ES-09-20, eqs (9-5) through (9-8).
 * A required `connection` ('wye' | 'delta') rather than a default, so the caller can never get the
 * wrong relation silently (22's lesson: make the ambiguous axis an argument, not a guess).
 * ================================================================== */

function assertConnection(c) {
  if (c !== 'wye' && c !== 'delta') {
    throw new Error(`connection must be 'wye' or 'delta', got ${JSON.stringify(c)}`);
  }
}

/* delta: V_L = V_phase ;  wye: V_L = root3 * V_phase */
function lineVoltage(connection, vPhase, root3) {
  assertConnection(connection);
  const r = root3 === undefined ? ROOT3 : root3;
  return connection === 'wye' ? r * vPhase : vPhase;
}

/* delta: I_L = root3 * I_phase ;  wye: I_L = I_phase */
function lineCurrent(connection, iPhase, root3) {
  assertConnection(connection);
  const r = root3 === undefined ? ROOT3 : root3;
  return connection === 'delta' ? r * iPhase : iPhase;
}

/* ================================================================== *
 * THE POWER TRIANGLE. DOE ES-09-21. P = root3 V_L I_L cos, S = root3 V_L I_L, Q = root3 V_L I_L sin.
 * sin(theta) is derived from the power factor: sin = sqrt(1 - pf^2). DOE's Example 1 (pf 0.6) uses
 * 0.8 and Example 2 (pf 0.9) uses 0.436, both of which this reproduces.
 * ================================================================== */

function sinFromPf(pf) {
  if (pf < 0 || pf > 1) throw new Error(`power factor must be in [0,1], got ${pf}`);
  return Math.sqrt(1 - pf * pf);
}

/* Watts. */
function realPower(vLine, iLine, pf, root3) {
  const r = root3 === undefined ? ROOT3 : root3;
  return r * vLine * iLine * pf;
}

/* Volt-amperes. */
function apparentPower(vLine, iLine, root3) {
  const r = root3 === undefined ? ROOT3 : root3;
  return r * vLine * iLine;
}

/* Volt-amperes reactive. */
function reactivePower(vLine, iLine, pf, root3) {
  const r = root3 === undefined ? ROOT3 : root3;
  return r * vLine * iLine * sinFromPf(pf);
}

/* Convenience: the whole balanced-load solution from phase quantities, the shape DOE's examples ask
 * for. Returns line quantities and the power triangle in base units (V, A, W, VAR, VA). */
function solve(connection, vPhase, iPhase, pf, root3) {
  const vLine = lineVoltage(connection, vPhase, root3);
  const iLine = lineCurrent(connection, iPhase, root3);
  return {
    vLine, iLine,
    realW: realPower(vLine, iLine, pf, root3),
    reactiveVAR: reactivePower(vLine, iLine, pf, root3),
    apparentVA: apparentPower(vLine, iLine, root3),
  };
}

/* ================================================================== *
 * PER UNIT and SYMMETRICAL FAULT. TM 5-811-14 App G Example 5, G-27..G-29.
 * ================================================================== */

/* Utility (short-circuit) source, G-14: X_u = Base kVA / Utility kVA. */
function perUnitUtility(baseKVA, utilityKVA) {
  if (utilityKVA <= 0) throw new Error('utility kVA must be positive');
  return baseKVA / utilityKVA;
}

/* Own-base conversion at the same voltage base, G-15: X_new = X_old * (Base kVA / Equipment kVA). */
function perUnitOwnBase(puOld, baseKVA, equipKVA) {
  if (equipKVA <= 0) throw new Error('equipment kVA must be positive');
  return puOld * baseKVA / equipKVA;
}

/* Base current in amperes: I_base = Base kVA / (root3 * Base kV). (kVA over kV yields amperes.) */
function baseCurrent(baseKVA, baseKV, root3) {
  const r = root3 === undefined ? ROOT3 : root3;
  if (baseKV <= 0) throw new Error('base kV must be positive');
  return baseKVA / (r * baseKV);
}

/* Symmetrical three-phase fault current: I_fault = I_base / Z_pu. The Z_pu is the reduced per-unit
 * impedance at the fault, which this tool takes as published (or user-supplied), never as something it
 * reduced itself. See reduceNetwork below. */
function faultCurrent(baseCurrentA, puZ) {
  if (puZ <= 0) throw new Error('per-unit impedance must be positive');
  return baseCurrentA / puZ;
}

/* ================================================================== *
 * §F THE REFUSAL. Reducing a network of impedances to one Thevenin per-unit value is the engineered
 * short-circuit study; getting it wrong makes every fault current wrong. This tool reproduces the
 * published division, not the reduction, so this throws. Pattern 19: the refusal is asserted in verify
 * and grepped in the shipped build; it must not deny that the DIVISION is published (the equal and
 * opposite overclaim), only that the REDUCTION is this tool's to perform.
 * ================================================================== */

function reduceNetwork(components) {
  throw new Error(
    'This tool does not reduce a one-line to its per-unit impedance. That network reduction is the ' +
    'engineered short-circuit study, and a wrong Z_pu makes the fault current wrong. What IS ' +
    'reproduced here is the published relation fault = I_base / Z_pu (TM 5-811-14 G-29): supply a ' +
    'Z_pu from a study, or use the published example\'s reduced 0.249 / 0.255 / 0.26 pu.');
}

/* ================================================================== */

const ENGINE = {
  ROOT3,
  assertConnection, lineVoltage, lineCurrent,
  sinFromPf, realPower, apparentPower, reactivePower, solve,
  perUnitUtility, perUnitOwnBase, baseCurrent, faultCurrent,
  reduceNetwork,
};

if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
if (typeof window !== 'undefined') window.TP_ENGINE = ENGINE;
