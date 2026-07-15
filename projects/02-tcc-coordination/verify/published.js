/*
 * THE ANSWER KEY. GE Multilin 850 instruction manual, Table 4-35, "IEEE CURVE TRIP TIMES (IN
 * SECONDS)", manual p.4-115. 210 published numbers.
 *
 * THIS FILE IS DATA THE ENGINE MUST REPRODUCE. NOTHING HERE IS COMPUTED.
 *
 * Every number below was read out of the publisher's own PDF, fetched from the publisher, parsed
 * from its text layer, and nothing was typed by hand. It is the manufacturer's answer to its own
 * equation, and the engine in ../build/ is required to arrive at all 210 of these independently,
 * from the equation and constants alone, with no knowledge of this file.
 *
 * WHY THIS TABLE IS IN THE REPO WHEN THE REPO'S RULE IS "DO NOT REPRODUCE TABLES"
 *
 * The rule exists and it is a real rule: NFPA 70E and NETA ATS tables get cited and linked here,
 * never copied. This table is treated differently and the distinction is worth stating so a future
 * reader can check the reasoning rather than inherit the conclusion:
 *
 *   - These cells are not creative expression. They are the arithmetic output of an equation and
 *     three constants that the same manual publishes on the same page, and that ../sources/SOURCES.md
 *     already quotes. Anyone holding the equation can regenerate every cell exactly. That is the
 *     opposite of a 70E table, whose numbers are a committee's judgment and exist nowhere else.
 *   - They are here to be CHECKED AGAINST, not to be consulted. Nobody should read a trip time out
 *     of this file. The manual is free, and the link is in SOURCES.md, and that is where a person
 *     goes for the number.
 *   - The purpose is verification of this repo's own claim. A verify phase with no published answer
 *     key is theatre, and 02's whole reason to exist is that this answer key is a NUMBER rather than
 *     a prose verdict.
 *
 * This is a judgment call and it was made deliberately, with the guardrail in view, rather than by
 * forgetting the guardrail existed. It does not generalize: the next table is its own decision.
 *
 * WHAT IS NOT HERE
 *
 * The manual's curve figures, its artwork, its prose, and its ANSI curve family. Cite and link.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Published = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Table 4-35 column headers: current as a multiple of pickup (I/Ipickup).
  var MULTIPLES = [1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];

  // Table 4-35 body. One key per curve shape, one row per TDM setting, ten published trip times
  // per row, in seconds, in MULTIPLES order.
  var TRIP_TIMES = {
    'extremely-inverse': {
      '0.5': [11.341, 4.761, 1.823, 1.001, 0.648, 0.464, 0.355, 0.285, 0.237, 0.203],
      '1.0': [22.682, 9.522, 3.647, 2.002, 1.297, 0.927, 0.709, 0.569, 0.474, 0.407],
      '2.0': [45.363, 19.043, 7.293, 4.003, 2.593, 1.855, 1.418, 1.139, 0.948, 0.813],
      '4.0': [90.727, 38.087, 14.587, 8.007, 5.187, 3.710, 2.837, 2.277, 1.897, 1.626],
      '6.0': [136.090, 57.130, 21.880, 12.010, 7.780, 5.564, 4.255, 3.416, 2.845, 2.439],
      '8.0': [181.454, 76.174, 29.174, 16.014, 10.374, 7.419, 5.674, 4.555, 3.794, 3.252],
      '10.0': [226.817, 95.217, 36.467, 20.017, 12.967, 9.274, 7.092, 5.693, 4.742, 4.065]
    },
    'very-inverse': {
      '0.5': [8.090, 3.514, 1.471, 0.899, 0.654, 0.526, 0.450, 0.401, 0.368, 0.345],
      '1.0': [16.179, 7.028, 2.942, 1.798, 1.308, 1.051, 0.900, 0.802, 0.736, 0.689],
      '2.0': [32.358, 14.055, 5.885, 3.597, 2.616, 2.103, 1.799, 1.605, 1.472, 1.378],
      '4.0': [64.716, 28.111, 11.769, 7.193, 5.232, 4.205, 3.598, 3.209, 2.945, 2.756],
      '6.0': [97.074, 42.166, 17.654, 10.790, 7.849, 6.308, 5.397, 4.814, 4.417, 4.134],
      '8.0': [129.432, 56.221, 23.538, 14.387, 10.465, 8.410, 7.196, 6.418, 5.889, 5.513],
      '10.0': [161.790, 70.277, 29.423, 17.983, 13.081, 10.513, 8.995, 8.023, 7.361, 6.891]
    },
    'moderately-inverse': {
      '0.5': [3.220, 1.902, 1.216, 0.973, 0.844, 0.763, 0.706, 0.663, 0.630, 0.603],
      '1.0': [6.439, 3.803, 2.432, 1.946, 1.688, 1.526, 1.412, 1.327, 1.260, 1.207],
      '2.0': [12.878, 7.606, 4.864, 3.892, 3.377, 3.051, 2.823, 2.653, 2.521, 2.414],
      '4.0': [25.756, 15.213, 9.729, 7.783, 6.753, 6.102, 5.647, 5.307, 5.041, 4.827],
      '6.0': [38.634, 22.819, 14.593, 11.675, 10.130, 9.153, 8.470, 7.960, 7.562, 7.241],
      '8.0': [51.512, 30.426, 19.458, 15.567, 13.507, 12.204, 11.294, 10.614, 10.083, 9.654],
      '10.0': [64.390, 38.032, 24.322, 19.458, 16.883, 15.255, 14.117, 13.267, 12.604, 12.068]
    }
  };

  function cellCount() {
    var n = 0;
    Object.keys(TRIP_TIMES).forEach(function (k) {
      Object.keys(TRIP_TIMES[k]).forEach(function (t) { n += TRIP_TIMES[k][t].length; });
    });
    return n;
  }

  return {
    MULTIPLES: MULTIPLES,
    TRIP_TIMES: TRIP_TIMES,
    cellCount: cellCount,

    // The prose worked example, manual p.4-124, quoted verbatim in ../sources/SOURCES.md. It is a
    // second, independent statement of one cell of the table above, in the manual's own prose.
    WORKED_EXAMPLE: { shape: 'extremely-inverse', tdm: 2, multiple: 5, statedSeconds: 2.59 },

    // Table 4-34, same page. The engine reads these through ../build/curves.js; they are repeated
    // here ONLY so the suite can prove the two files agree. If curves.js is ever edited to
    // disagree with the manual, that has to FAIL rather than quietly verify the engine against
    // its own typo.
    CONSTANTS: {
      'extremely-inverse': { A: 28.2, B: 0.1217, p: 2.000, tr: 29.1 },
      'very-inverse': { A: 19.61, B: 0.491, p: 2.000, tr: 21.6 },
      'moderately-inverse': { A: 0.0515, B: 0.1140, p: 0.02000, tr: 4.85 }
    }
  };
}));
