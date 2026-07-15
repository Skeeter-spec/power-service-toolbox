/*
 * TCC engine. Inverse time overcurrent trip times, and the coordination interval between two devices.
 *
 * Educational. Not for field use. This reproduces published worked examples so they can be
 * explored. It is not an engineered coordination study and it does not tell you whether your
 * devices coordinate.
 *
 * WHAT THIS COMPUTES
 *
 * tripTime(): the operate time of one inverse time overcurrent element, from the equation its
 * manufacturer publishes, driven by the constants that manufacturer publishes. This is the whole
 * load bearing claim of the project and it is checked hard: verify/ recomputes all 210 cells of the
 * manufacturer's own published trip time table. 210 of 210 agree. See ../sources/SOURCES.md.
 *
 * interval(): the arithmetic difference between two devices' trip times at one current. Subtraction
 * of two numbers that are each verified. Nothing more.
 *
 * overlap(): where, if anywhere, two curves cross over a current range.
 *
 * WHAT THIS DELIBERATELY DOES NOT COMPUTE: A COORDINATION VERDICT
 *
 * There is no isCoordinated(). There is no pass. There is no fail. This is the same decision project
 * 01 made when it refused to print a tier, and it is made here for a sharper reason.
 *
 * The obvious thing to gate on is the 0.3 to 0.4 second coordination time interval. That number is
 * real and it is published, and this project will not gate on it, twice over:
 *
 *   1. IT IS NOT A THRESHOLD. Its own source says the interval "is usually 0.3-0.4 seconds".
 *      "Usually" is a rule of thumb for an engineer to apply with judgment, not a limit for a
 *      program to compare against. Turning "usually" into an if statement invents a precision the
 *      source refused to claim, and then prints it in a box where it reads as a finding.
 *   2. ITS PROVENANCE IS NOT WHAT IT LOOKS LIKE. It reaches the free literature through
 *      TM 5-811-14, a US Army Corps of Engineers document, which is public domain. But that
 *      document's coordination time interval section carries an asterisk, and the asterisk says:
 *      "Reprinted with permission from ANSI/IEEE Standard 242-1986 ... copyright 1986 by IEEE."
 *      The permission was granted to the Army. It was not granted to this repo. So the section
 *      that carries the number is not public domain even though the document around it is, and
 *      this repo cites the number and does not reproduce the passage.
 *
 * What the app does with that number instead: it draws it as context and attributes it, so a reader
 * can see their interval against the customary band and make the call themselves. The judgment stays
 * with the person. That is the honest version and it is also the more useful one.
 *
 * overlap() IS reported as a finding, and that asymmetry is deliberate. "Ensure no overlapping of
 * curves" is TM 5-811-14's coordination procedure in the Army's OWN prose (section c(7)), outside
 * the asterisked section, so it is public domain and this repo may state it. It also needs no
 * number: two curves either cross or they do not. A method that needs no invented constant is worth
 * more here than a constant this repo cannot source.
 *
 * LIMITS, STATED PLAINLY
 *
 * - One curve family, one vendor. See build/curves.js for why that is a feature.
 * - The time overcurrent element only. No instantaneous element, no definite time, no fuse damage
 *   curve, no transformer inrush point, no motor starting curve. A real composite TCC has all of
 *   them and this has none of them.
 * - Ideal curves. A real relay departs from its own programmed curve; SEL publishes +/-1.50 cycles
 *   and +/-4% of curve time for 2 <= M <= 30 for the 351S. This engine computes the curve, not the
 *   relay, so every number here is the book answer and not a field measurement.
 * - No CT saturation, no burden, no dc offset, no reclosing.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TCC = factory(root.Curves);
}(typeof self !== 'undefined' ? self : this, function (Curves) {
  'use strict';

  if (typeof Curves === 'undefined' && typeof require === 'function') Curves = require('./curves.js');

  /*
   * The trip equation, GE Multilin 850 manual p.4-115, confirmed by reading the rendered image at
   * 9x rather than the text layer:
   *
   *     T = TDM x [ A / ( (I/Ipickup)^p - 1 ) + B ]
   *
   * Note the grouping, because it is exactly what a flattened text layer destroys: the fraction bar
   * spans ((I/Ipickup)^p - 1), and "+ B" is OUTSIDE the fraction but INSIDE the bracket, so B is
   * scaled by TDM. Getting that wrong is not a small error; a transcription that put B inside the
   * denominator predicts a relay tripping at its own pickup current, which is not a relay.
   */
  function tripTime(device, current) {
    var s = Curves.shape(device.family, device.shape);
    var m = multiple(device, current);

    // At or below pickup the element does not time out at all: M^p - 1 goes to zero and the curve is
    // asymptotic. Returning Infinity says "never" honestly. Returning a big number would let a
    // caller plot a point on a curve that does not exist there.
    if (m <= 1) return Infinity;

    return device.tdm * (s.A / (Math.pow(m, s.p) - 1) + s.B);
  }

  /*
   * The reset equation, same page:
   *
   *     TRESET = TDM x [ tr / ( 1 - (I/Ipickup)^2 ) ]
   *
   * Only defined below pickup, and only when RESET is set to "Timed" with energy capacity at 100%,
   * which is the manual's own stated condition. Above pickup the element is timing toward a trip,
   * not resetting, so this returns Infinity there rather than a negative number. The exponent is a
   * literal 2 in the published equation, not the family's p.
   */
  function resetTime(device, current) {
    var s = Curves.shape(device.family, device.shape);
    var m = multiple(device, current);
    if (m >= 1) return Infinity;
    return device.tdm * (s.tr / (1 - Math.pow(m, 2)));
  }

  function multiple(device, current) {
    if (!(device.pickup > 0)) throw new Error('pickup must be > 0 amps');
    return current / device.pickup;
  }

  /*
   * The coordination interval at one current: how much later the upstream device operates than the
   * downstream one. Positive means the downstream device gets there first, which is the sequence you
   * want. Negative means the upstream device operates first, which in the field means a fault on a
   * feeder takes out the main.
   *
   * This returns a NUMBER and no verdict. See the header.
   */
  function interval(downstream, upstream, current) {
    var td = tripTime(downstream, current);
    var tu = tripTime(upstream, current);
    return {
      current: current,
      downstream: td,
      upstream: tu,
      // Infinity - Infinity is NaN, and "neither device trips" is a real state worth naming rather
      // than leaking a NaN into the UI.
      seconds: (isFinite(td) && isFinite(tu)) ? tu - td : null,
      bothTrip: isFinite(td) && isFinite(tu)
    };
  }

  /*
   * Where two curves cross, over a current range.
   *
   * Method: walk the range on a log spaced grid, watch the sign of (upstream - downstream), and
   * report every place it changes. Between two samples that straddle a crossing, bisect to pin the
   * current down. Log spacing because a TCC is read on log log axes and a linear grid would spend
   * all its samples in the high current end where nothing happens.
   *
   * This finds crossings, not tangencies: two curves that touch at exactly one point and do not
   * cross produce no sign change and are not reported. That is a real limit and it is stated rather
   * than papered over, because the sampled approach cannot honestly claim otherwise.
   */
  function overlaps(downstream, upstream, fromCurrent, toCurrent, samples) {
    samples = samples || 400;
    var pts = [];
    var lo = Math.log(fromCurrent), hi = Math.log(toCurrent);
    for (var i = 0; i <= samples; i++) {
      var c = Math.exp(lo + (hi - lo) * i / samples);
      var d = interval(downstream, upstream, c);
      pts.push({ current: c, sign: d.bothTrip ? Math.sign(d.seconds) : null });
    }
    var found = [];
    for (var j = 1; j < pts.length; j++) {
      var a = pts[j - 1], b = pts[j];
      if (a.sign === null || b.sign === null) continue;
      if (a.sign === 0 || b.sign === 0) continue;
      if (a.sign !== b.sign) found.push(bisect(downstream, upstream, a.current, b.current));
    }
    return found;
  }

  function bisect(downstream, upstream, lo, hi) {
    var sLo = Math.sign(interval(downstream, upstream, lo).seconds);
    for (var i = 0; i < 60; i++) {
      var mid = Math.sqrt(lo * hi); // geometric midpoint: this is a log axis
      var s = Math.sign(interval(downstream, upstream, mid).seconds);
      if (s === sLo) lo = mid; else hi = mid;
    }
    return Math.sqrt(lo * hi);
  }

  /*
   * A curve as plottable points, for the SVG. Log spaced in current, and it starts just above
   * pickup because the curve is asymptotic AT pickup and a point there is not on the curve.
   */
  function curvePoints(device, fromCurrent, toCurrent, samples) {
    samples = samples || 200;
    var out = [];
    var start = Math.max(fromCurrent, device.pickup * 1.005);
    if (start >= toCurrent) return out;
    var lo = Math.log(start), hi = Math.log(toCurrent);
    for (var i = 0; i <= samples; i++) {
      var c = Math.exp(lo + (hi - lo) * i / samples);
      var t = tripTime(device, c);
      if (isFinite(t)) out.push({ current: c, seconds: t });
    }
    return out;
  }

  /*
   * The customary coordination time interval, carried as CITED CONTEXT and never as a threshold.
   *
   * Read the header before using this for anything. The band is quoted as "usually" by its source,
   * and the source's own section is IEEE 242-1986 material reprinted under a permission this repo
   * does not hold. So: the numbers are named, the passage is not reproduced, and no code compares
   * anything against them. The app draws the band and lets the reader judge.
   */
  var CUSTOMARY_CTI = {
    low: 0.3,
    high: 0.4,
    wording: 'usually',
    appliesTo: 'inverse time overcurrent relays in series',
    cite: 'TM 5-811-14 para 4-2d(2), which reprints ANSI/IEEE 242-1986 by permission',
    notAThreshold: true
  };

  return {
    tripTime: tripTime,
    resetTime: resetTime,
    multiple: multiple,
    interval: interval,
    overlaps: overlaps,
    curvePoints: curvePoints,
    CUSTOMARY_CTI: CUSTOMARY_CTI
  };
}));
