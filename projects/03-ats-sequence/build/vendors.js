// 03 ATS sequence simulator. Published vendor data.
//
// EVERY value here was read off a rendered page of the manufacturer's own PDF, at 3x, not scraped
// from the text layer. Each carries the page it came from. Nothing in this file is inferred,
// averaged, or filled in from a second vendor.
//
// THE CENTRAL FACT THIS FILE ENCODES: there is no such thing as "the" ATS defaults. ASCO and
// Russelectric agree on the structure of the sequence and disagree on its numbers by up to 6x.
// So a profile is always named, and the engine refuses to run without one. See
// reference/ats-sequence-of-operation.md.
//
// Source: ASCO Group 5 Controller User's Guide, 381333-126 N (09/2018), 7000 Series.
// Fetched from download.schneider-electric.com (the manufacturer). See sources/SOURCES.md.
//
// ⚠ REVISION BOUND. Rev N covers 7000 Series ONLY. Rev K's 4000 Series feature codes (4ATS,
// 4ACTS, 4ADTS) are gone from the current document. This file does not model a 4000 Series switch.

const ASCO_G5 = {
  id: 'asco-group5-revN',
  vendor: 'ASCO',
  product: 'Group 5 Controller',
  models: '7000 Series',
  doc: "Group 5 Controller User's Guide",
  part: '381333-126 N',
  revision: 'N',
  revDate: '09/2018',
  readAt: 'PUBLISHER',
  runnable: true,

  // Timer table, Rev N page 9. Defaults AND adjustable ranges, both published.
  // `appliesTo` is ASCO's own restriction column. It is not our inference.
  timers: {
    overrideNormalOutage: {
      feature: '1C',
      label: 'Override momentary normal source outages',
      default: 1, min: 0, max: 6, unit: 's',
      appliesTo: 'all',
      page: 9,
      why: 'The utility blinks. Without this the switch cranks a diesel over an event that already ended.'
    },
    overrideEmergencyOutage: {
      feature: '1F',
      label: 'Override momentary emergency source outages',
      default: 0, min: 0, max: 3659, unit: 's', // 0 to 60 min 59 sec
      appliesTo: 'all',
      page: 9
    },
    transferToEmergency: {
      feature: '2B',
      label: 'Transfer to emergency',
      default: 0, min: 0, max: 3659, unit: 's',
      appliesTo: 'all',
      page: 9,
      why: 'Zero by default. Exists to stagger several switches so they do not all slam one generator.'
    },
    retransferToNormal: {
      feature: '3A',
      label: 'Retransfer to normal, normal source failed',
      default: 1800, min: 0, max: 3659, unit: 's', // 30 minutes
      appliesTo: 'all',
      page: 9,
      why: 'A utility that just failed is a utility still being worked on. This is the switch refusing to believe it.'
    },
    retransferToNormalTest: {
      feature: '3A',
      label: 'Retransfer to normal, test only',
      default: 30, min: 0, max: 35999, unit: 's', // 30 sec; range 0 to 9 h 59 m 59 s
      appliesTo: 'all',
      page: 9,
      why: 'Nothing failed, so there is nothing to distrust. 30 seconds, not 30 minutes.'
    },
    unloadedRunning: {
      feature: '2E',
      label: 'Unloaded running (engine cooldown)',
      default: 300, min: 0, max: 3659, unit: 's', // 5 minutes
      appliesTo: 'all',
      page: 9,
      why: 'Entirely for the engine. The load is already back on the utility.'
    },
    inSyncTimeDelay: {
      feature: null,
      label: 'In sync time delay',
      default: 1.5, min: 0, max: 3.0, unit: 's',
      appliesTo: '7ACTS, 7ACTB only',   // ASCO's own column. Closed transition switches.
      page: 9
    },
    failureToSynchronize: {
      feature: null,
      label: 'Failure to synchronize',
      default: 300, min: 0, max: 359, unit: 's', // 5 min; range 0 to 5 min 59 sec
      appliesTo: '7ACTS, 7ACTB only',
      page: 9
    },
    delayedTransitionTime: {
      feature: null,
      label: 'Delayed transition time (dwell in neutral)',
      default: 3, min: 0, max: 359, unit: 's',
      appliesTo: '7ADTS, 7ADTB only',
      page: 9,
      why: 'A spinning motor is still generating. The dwell lets its residual voltage decay.'
    },
    inPhaseMonitorTimeDelay: {
      feature: null,
      label: 'In phase monitor time delay',
      default: 1.5, min: 0, max: 3.0, unit: 's',
      appliesTo: '7ATS, 7ATB only',     // OPEN transition switches. A different feature entirely.
      page: 9
    }
  },

  // Voltage and frequency pickup / dropout, Rev N page 7. Percentages of nominal.
  //
  // ⚠ Rev N's own labels on the FREQUENCY rows are BROKEN: it prints "Over Voltage Trip" and
  // "NORMAL VOLTAGE" / "EMERG VOLTAGE" where Rev K (2004) correctly printed "Over Frequency Trip"
  // and "NORMAL FREQUENCY". The footnote and the OF Trip screen names still say frequency. The
  // VALUES are untouched and agree across both revisions. Verified by rendering both revisions at
  // 3x. This is why the repo keeps both copies: the publisher's current copy is authoritative about
  // what is CURRENT, which is not the same as being the better document.
  thresholds: {
    normal: {
      voltageDropout: 85, voltageDropoutMin: 70, voltageDropoutMax: 98,
      voltagePickup: 90, voltagePickupMin: 85, voltagePickupMax: 100,
      freqDropout: 90, freqDropoutMin: 85, freqDropoutMax: 98,
      freqPickup: 95, freqPickupMin: 90, freqPickupMax: 100,
      page: 7
    },
    emergency: {
      voltageDropout: 75, voltageDropoutMin: 70, voltageDropoutMax: 98,
      voltagePickup: 90, voltagePickupMin: 85, voltagePickupMax: 100,
      freqDropout: 90, freqDropoutMin: 85, freqDropoutMax: 98,
      freqPickup: 95, freqPickupMin: 90, freqPickupMax: 100,
      page: 7
    }
  },

  // Rev N page 25, quoted verbatim. This sentence is why project 03 can have a verify phase:
  // it is a published, numeric, pass or fail verdict. Most ATS literature publishes a marketing
  // claim with no number in it.
  //
  // ⚠ CLOSED TRANSITION ONLY. This is the sync check permissive, on 7ACTS/7ACTB. It is NOT the
  // open transition's in phase monitor, which is a different feature on different switch models
  // and for which ASCO publishes NO angle window at all. Do not transplant these numbers.
  syncCheck: {
    appliesTo: '7ACTS, 7ACTB only',
    transition: 'closed',
    maxPhaseDeg: 5,
    maxFreqHz: 0.2,
    maxVoltagePct: 5,
    page: 25,
    quote: 'Three criteria must be met for the sources to be considered in-sync. The phase ' +
           'difference between the sources must be less than 5 degrees, the frequency difference ' +
           'must be less than 0.2 Hz, and the voltage difference must be less than 5%.'
  },

  // The open transition in phase monitor. ASCO publishes a TIME DELAY and nothing else.
  // The absence of an angle is the point: it is asserted in verify/ so nobody adds one later.
  inPhaseMonitor: {
    appliesTo: '7ATS, 7ATB only',
    transition: 'open',
    timeDelayDefault: 1.5,
    anglePublished: null,   // ASCO publishes none. See verify/verify.js.
    page: 9
  },

  // 🔴 A PUBLISHED CONTRADICTION, REPORTED RATHER THAN RESOLVED.
  // The features table (Rev N p.11) says 1.5 second. The narrative on the NEXT PAGE (p.12) says
  // "3 second default time delay". Both revisions print both numbers, fourteen years apart, unfixed.
  // This is NOT general sloppiness in the table: the same narrative page states the In Phase
  // Monitor's 1.5 second default and THAT one agrees with its table exactly. One specific row
  // disagrees with itself.
  // The app surfaces this. It does not pick one and draw a confident chart over it.
  shedLoadInPhase: {
    label: 'Shed load in phase timer',
    contradiction: true,
    tableValue: 1.5, tablePage: 11,
    narrativeValue: 3, narrativePage: 12,
    note: 'ASCO Rev N prints both values on facing pages and has done since Rev K (2004). ' +
          'This tool does not know which is correct, and neither does anyone reading the manual.'
  },

  // 🔴 CUT ON PURPOSE, AND THIS IS THE MOST IMPORTANT ABSENCE IN THE FILE.
  // Rev K (2004) published: extended parallel time, default 0.5 sec, range 0.100 to 1.000 sec,
  // adjustable, setting name CTTS TD XtdParallelTD. Rev N DELETED THE ROW and the narrative now
  // says "the specified FACTORY PRESET extended parallel time" (pp. 26, 27, alarm text p.6).
  // ASCO took the number off the settings menu and published no value.
  //
  // It is the single most attractive number in this source for a simulator to expose as a slider,
  // and it governs how long two live sources sit paralleled during a closed transition. Shipping a
  // 0.100 to 1.000 sec control citing "ASCO's published range" would be citing a superseded 2004
  // revision about exactly the parameter that matters most.
  //
  // So: name it, say ASCO factory presets it, print no number. `value: null` is load bearing and
  // verify/ asserts it stays null.
  extendedParallelTime: {
    label: 'Closed transition extended parallel time',
    value: null,
    min: null,
    max: null,
    factoryPreset: true,
    note: 'ASCO factory presets this and publishes no value in the current revision (N, 09/2018). ' +
          'A default and range existed in Rev K (2004) and are not carried here: that revision is ' +
          'superseded. No sourced value exists.'
  }
};

// Russelectric is a CROSS CHECK, NOT A SECOND SIMULATOR, and the difference is deliberate.
//
// Only two of its timers were traced. A full profile would need a dozen, and inventing the other
// ten from ASCO's shape would fabricate exactly the thing this project exists to disprove: that
// vendors share defaults. So Russelectric is `runnable: false` and appears in the UI only as a
// two row divergence table.
//
// Its manual also publishes a sync window (5 to 20 degrees, 5 to 20% voltage, 0.2 Hz slip, factory
// set at 20) but presents it as a general parameter setup item WITHOUT tying it to a named closed
// transition model the way ASCO ties features to switch types. That is a lead, not a confirmed
// closed transition spec, so it is not encoded.
const RUSSELECTRIC_2000 = {
  id: 'russelectric-model2000',
  vendor: 'Russelectric',
  product: 'Model 2000 Automatic Transfer Control System',
  doc: 'Manual 5 Rev. 15',
  readAt: 'MIRROR',
  runnable: false,
  runnableNote: 'Only two timers were traced from this manual, and its copy is a mirror of ' +
                'unknown revision. Two rows are enough to prove defaults are vendor specific. ' +
                'They are not enough to simulate a Russelectric switch, and filling in the rest ' +
                'from ASCO would fabricate the agreement this project disproves.',
  traced: {
    overrideNormalOutage: { label: 'Engine start override', value: 3, unit: 's' },
    retransferToNormal:   { label: 'Retransfer to normal', value: 300, unit: 's' }
  }
};

// The divergence, computed rather than asserted, so it cannot drift out of step with the data above.
function vendorDivergence () {
  const rows = [];
  for (const key of Object.keys(RUSSELECTRIC_2000.traced)) {
    const russ = RUSSELECTRIC_2000.traced[key];
    const asco = ASCO_G5.timers[key];
    if (!asco) continue;
    rows.push({
      what: russ.label,
      asco: asco.default,
      russ: russ.value,
      unit: 's',
      ratio: russ.value === 0 || asco.default === 0 ? null
        : Math.max(asco.default, russ.value) / Math.min(asco.default, russ.value),
      agree: asco.default === russ.value
    });
  }
  return rows;
}

const VENDORS = { ASCO_G5, RUSSELECTRIC_2000 };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ASCO_G5, RUSSELECTRIC_2000, VENDORS, vendorDivergence };
}
