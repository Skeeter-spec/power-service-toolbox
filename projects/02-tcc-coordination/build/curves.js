/*
 * Curve families. Data, traced from the manufacturer's published tables.
 *
 * WHOSE CURVES THESE ARE, AND WHY THE FILE SAYS SO ON EVERY ROW
 *
 * These are the GE Multilin 850 Feeder Protection System's IEEE curve family, read off Table 4-34
 * of its instruction manual (manual page 4-115). They are NOT "the IEEE C37.112 constants". This
 * file will not use that phrase and neither will the app, and the reason is the single most
 * important thing to understand before touching this project:
 *
 *   GE's manual (p.4-115) says its curves "conform to industry standards and the IEEE C37.112-1996
 *   curve classifications". SEL's 351S manual (p.375) says its curves "conform to IEEE C37.112-1996"
 *   too. Both vendors cite the same standard, in their own words. THEIR PUBLISHED CONSTANTS ARE NOT
 *   THE SAME NUMBERS. Computed at equal settings the two families sit about 5x apart.
 *
 * So "the vendor cites the standard" cannot settle which numbers are the standard's, because the
 * other vendor cites it too. IEEE C37.112 itself is gated and has never been read here, so this
 * repo cannot adjudicate it and does not try. What it can do is name the manual it copied and stop
 * talking. See ../sources/SOURCES.md.
 *
 * The 5x is not a rounding difference. In coordination it is the difference between "these devices
 * coordinate" and "the upstream device opens first". Mixing the two tables silently is the failure
 * mode this file's naming is designed to prevent, which is why the family id is 'ge850-ieee' and
 * not 'ieee'.
 *
 * ADDING A SECOND VENDOR
 *
 * Allowed, and the shape of this file anticipates it: add a sibling family with its own id, its own
 * citation, and its own verify fixture read at ITS publisher's PDF. What is NOT allowed is adding a
 * curve to THIS family from another vendor's manual, or averaging them, or picking whichever looks
 * more standard. They are different families that share a word.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * The GE "ANSI curves" family. Its constants are in the same manual and its five constant equation
 * form has not been confirmed against the rendered image. Project 01's lesson was that reading a
 * figure at magnification changes answers. Until someone does that, it is not here.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Curves = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /*
   * GE Multilin 850, Table 4-34 (manual p.4-115), read at the publisher's own PDF.
   *
   * A, B, p drive the trip equation. tr drives the reset equation. Both equations were confirmed by
   * rendering p.4-115 at 9x magnification and reading the grouping by eye, rather than by trusting
   * the text layer, because the text layer flattens a fraction bar into a run of dashes and that has
   * already produced two different wrong equations in this project's history.
   */
  var GE850_IEEE = {
    id: 'ge850-ieee',
    vendor: 'GE Multilin',
    device: '850 Feeder Protection System',
    cite: 'Instruction manual, Table 4-34, manual p.4-115',
    shapes: {
      'extremely-inverse': { label: 'IEEE Extremely Inverse', A: 28.2, B: 0.1217, p: 2.000, tr: 29.1 },
      'very-inverse': { label: 'IEEE Very Inverse', A: 19.61, B: 0.491, p: 2.000, tr: 21.6 },
      'moderately-inverse': { label: 'IEEE Moderately Inverse', A: 0.0515, B: 0.1140, p: 0.02000, tr: 4.85 }
    }
  };

  var FAMILIES = {};
  FAMILIES[GE850_IEEE.id] = GE850_IEEE;

  function family(id) {
    var f = FAMILIES[id];
    if (!f) throw new Error('unknown curve family: ' + id + '. Families are named per vendor on purpose.');
    return f;
  }

  function shape(familyId, shapeId) {
    var f = family(familyId);
    var s = f.shapes[shapeId];
    if (!s) throw new Error('unknown shape "' + shapeId + '" in family ' + familyId);
    return s;
  }

  function shapeIds(familyId) { return Object.keys(family(familyId).shapes); }
  function familyIds() { return Object.keys(FAMILIES); }

  return {
    family: family,
    shape: shape,
    shapeIds: shapeIds,
    familyIds: familyIds,
    DEFAULT_FAMILY: GE850_IEEE.id
  };
}));
