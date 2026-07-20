/*
 * rungs.js. The data for the ladder logic interpreter: the published truth table it reproduces, the
 * definition of the close permissive it builds from named elements, and one sourced worked example.
 *
 * Every constant here carries the page it was read on. See ../sources/SOURCES.md for the audit.
 *
 * WHAT IS SOURCED AND WHAT IS THIS TOOL'S OWN CONSTRUCTION, kept apart on purpose:
 *   - The 86 latch truth table is PUBLISHED (GE Multilin 850 Instruction Manual, Non-volatile
 *     Latches, p4-414, Reset Dominant). This tool reproduces it row for row. That is the verified
 *     anchor.
 *   - The 25 advance angle is a PUBLISHED worked example (SEL, Thompson, p5): 1.5 degrees.
 *   - The close permissive itself (86 clear AND 25 ok AND spring charged AND no 50/51 trip) is THIS
 *     TOOL'S OWN construction from those named elements. It is verified as self consistent boolean
 *     logic, not as a reproduction of any one vendor's factory scheme, because no full published
 *     close permissive truth table was sourced. See VENDOR_SCHEMES below: it is empty on purpose.
 */
'use strict';

/* ------------------------------------------------------------------ *
 * THE PUBLISHED TRUTH TABLE. GE Multilin 850 Instruction Manual v2.0x (2017), Non-volatile Latches,
 * p4-414, Reset Dominant type. Read at a distributor mirror (docs.ips.us); GE's current v4.3x is
 * login walled and unread. A latch truth table is a logic primitive, not a tuned setpoint, so the
 * stale revision risk that applies to a default value does not apply to this table. See SOURCES.md.
 *
 * Columns: SET, RESET, Latch output. "Previous State" is the held output, which is the whole point of
 * a latch and of a hand reset lockout relay.
 * ------------------------------------------------------------------ */

const LATCH_TRUTH_TABLE = [
  { set: true,  reset: false, out: 'On',             meaning: 'a trip input sets the lockout' },
  { set: false, reset: false, out: 'Previous State', meaning: 'input removed, state HELD: this is the latch' },
  { set: true,  reset: true,  out: 'Off',            meaning: 'Reset Dominant: reset wins a simultaneous set' },
  { set: false, reset: true,  out: 'Off',            meaning: 'a deliberate reset clears it' },
];

/* Non-volatile property, GE 850 p4-414 verbatim purpose: the flag "is stored safely and does not
 * reset when the relay reboots after being powered down". A hand reset lockout stays tripped through
 * a station outage and still needs a person to reset it. */
const LATCH_NONVOLATILE = true;

/* ------------------------------------------------------------------ *
 * THE CLOSE PERMISSIVE. This tool's own construction from named, individually sourced elements.
 *
 * A breaker close is permitted only when every one of these is satisfied at once:
 *   86 lockout CLEAR   (the latch above is Off: not locked out)
 *   25 sync check OK   (the two sources are in synchronism)
 *   spring charged     (the closing spring has stored energy)
 *   no 50 trip         (no instantaneous overcurrent element asserted)
 *   no 51 trip         (no time overcurrent element asserted)
 *
 * The last two are expressed as NOT(50 OR 51), which De Morgan makes equal to (NOT 50 AND NOT 51).
 * The interpreter teaches that identity rather than picking one form silently.
 * ------------------------------------------------------------------ */

/* The five inputs, in a fixed order so the truth table enumeration is deterministic. */
const PERMIT_INPUTS = ['lockout86', 'syncOk25', 'springCharged', 'trip50', 'trip51'];

/* The single input state under which the permit closes. Every other combination blocks. */
const PERMIT_REQUIRED = {
  lockout86: false,      // lockout CLEAR
  syncOk25: true,        // in sync
  springCharged: true,   // spring charged
  trip50: false,         // no instantaneous trip
  trip51: false,         // no time overcurrent trip
};

/* Human labels for the UI. Kept out of the logic so a relabelling cannot change a verdict. */
const INPUT_LABELS = {
  lockout86: '86 lockout',
  syncOk25: '25 sync check',
  springCharged: 'closing spring',
  trip50: '50 instantaneous',
  trip51: '51 time overcurrent',
};

/* ------------------------------------------------------------------ *
 * ONE SOURCED WORKED EXAMPLE for the 25 element's timing. SEL, "Fundamentals and Advancements in
 * Generator Synchronizing Systems" (M. J. Thompson, 2012), p5, read at the publisher CDN.
 *
 * Published formula: advance angle = slip x 360 x CBCT (breaker close time in seconds).
 * Published values: "using 0.05 Hz slip and a breaker close delay of 5 cycles, the advanced angle
 * would be 1.5 degrees." The same page states slip as a rate is 0.05 x 360 = 18 degrees per second.
 * ------------------------------------------------------------------ */

const SYNC_EXAMPLE = {
  slipHz: 0.05,
  breakerCloseCycles: 5,
  systemHz: 60,                 // 5 cycles = 5/60 s. The example is a 60 Hz system.
  advanceAngleDeg: 1.5,         // the published answer
  slipRateDegPerSec: 18,        // the other published number on the same page
  cite: 'SEL, Thompson 2012, p5',
};

/* ------------------------------------------------------------------ *
 * REFUSALS. No manual publishes a full close permissive interlock scheme that this repo has read, so
 * no vendor scheme ships. This tool builds the permissive from the individually sourced elements
 * above and says so. A future session that reads a vendor's permissive logic at the publisher may add
 * one here; until then this stays empty and the engine refuses to name a factory scheme. See §F of
 * ../verify/verify.js and pattern 19 (a refusal is not self enforcing).
 * ------------------------------------------------------------------ */

const VENDOR_SCHEMES = {};

/* ------------------------------------------------------------------ */

const DATA = {
  LATCH_TRUTH_TABLE, LATCH_NONVOLATILE,
  PERMIT_INPUTS, PERMIT_REQUIRED, INPUT_LABELS,
  SYNC_EXAMPLE, VENDOR_SCHEMES,
};

if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
if (typeof window !== 'undefined') window.LADDER_DATA = DATA;
