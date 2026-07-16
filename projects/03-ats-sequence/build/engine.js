// 03 ATS sequence simulator. The engine.
//
// A deterministic event simulator. Given a NAMED vendor profile and a scenario, it produces an
// ordered timeline of events, each carrying the page of the manufacturer's manual it comes from.
//
// It refuses to run without a vendor profile, and it refuses to run a profile that is not
// `runnable`. There is no vendor neutral mode, because there is no vendor neutral ATS.
//
// WHAT THIS ENGINE DOES NOT KNOW, and says so rather than guessing:
//   1. How long two live sources sit paralleled during a closed transition. ASCO factory presets
//      it and publishes no value (see vendors.js). Emitted as duration: null.
//   2. What a switch does after the failure to synchronize timer expires. The timer is published;
//      the subsequent action is not, in the copy read. Emitted as a terminal unknown.
//   3. The physical contact transfer time of an open transition. Not published as a timer.
//      Modelled as instantaneous and labelled as such.
// Each of those is asserted in verify/verify.js so a later change cannot quietly fill one in.

const NOT_PUBLISHED = null;

// Voltage and frequency acceptability, with the published deadband.
//
// The gap between dropout and pickup is not decoration: ASCO publishes dropout 85% and pickup 90%
// for the normal source (Rev N p.7), and the 5% between them is what stops a source hovering at the
// threshold from chattering the switch. A source that has failed is not available again at 86%.
// It is available again at 90%.
function evaluateSource (prevAvailable, voltagePct, freqPct, th) {
  if (prevAvailable) {
    // Available until it drops BELOW dropout.
    const failed = voltagePct < th.voltageDropout || freqPct < th.freqDropout;
    return !failed;
  }
  // Failed until it rises to AT OR ABOVE pickup. The deadband lives here.
  return voltagePct >= th.voltagePickup && freqPct >= th.freqPickup;
}

// The closed transition sync check permissive. ASCO Rev N p.25, quoted in vendors.js.
//
// STRICT inequalities, deliberately. The manual says "must be LESS THAN 5 degrees", so exactly
// 5.0 degrees is NOT in sync. Asserting the boundary is the difference between reproducing the
// published criterion and approximating it.
function inSync (profile, meas) {
  const sc = profile.syncCheck;
  const checks = {
    phase: Math.abs(meas.phaseDeg) < sc.maxPhaseDeg,
    frequency: Math.abs(meas.freqHz) < sc.maxFreqHz,
    voltage: Math.abs(meas.voltagePct) < sc.maxVoltagePct
  };
  return {
    ok: checks.phase && checks.frequency && checks.voltage,
    checks,
    cite: `${profile.doc} ${profile.part}, p.${sc.page}`
  };
}

function timerValue (profile, key, overrides) {
  const t = profile.timers[key];
  if (!t) throw new Error(`no published timer "${key}" in profile ${profile.id}`);
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
    const v = overrides[key];
    // The published range is a real constraint. A setting outside it is not a setting.
    if (v < t.min || v > t.max) {
      throw new RangeError(
        `${t.label} (${t.feature || 'timer'}) = ${v}${t.unit} is outside the published ` +
        `range ${t.min} to ${t.max}${t.unit} (p.${t.page})`
      );
    }
    return v;
  }
  return t.default;
}

function cite (profile, page) {
  return `${profile.doc} ${profile.part}, p.${page}`;
}

function simulate (profile, scenario) {
  if (!profile) throw new Error('no vendor profile: this engine has no vendor neutral mode');
  if (!profile.runnable) {
    throw new Error(
      `profile ${profile.id} is not runnable: ${profile.runnableNote || 'insufficient traced data'}`
    );
  }

  const s = Object.assign({
    transition: 'open',
    normalReturnsAt: null,       // seconds after the failure. null = never returns.
    generatorReadyAfter: 10,     // GENSET property, NOT an ASCO published timer. See below.
    isTest: false,
    sync: { phaseDeg: 0, freqHz: 0, voltagePct: 0 },
    timers: {}
  }, scenario || {});

  const ev = [];
  const warn = [];
  const push = (t, id, label, extra) => ev.push(Object.assign({ t: round(t), id, label }, extra || {}));

  const tOverride = timerValue(profile, 'overrideNormalOutage', s.timers);
  const t2B = timerValue(profile, 'transferToEmergency', s.timers);
  const t2E = timerValue(profile, 'unloadedRunning', s.timers);
  const t3A = s.isTest
    ? timerValue(profile, 'retransferToNormalTest', s.timers)
    : timerValue(profile, 'retransferToNormal', s.timers);

  let t = 0;
  push(t, 'normal-failed', 'Normal source drops below dropout threshold', {
    cite: cite(profile, profile.thresholds.normal.page),
    detail: `dropout ${profile.thresholds.normal.voltageDropout}% V, ${profile.thresholds.normal.freqDropout}% f`
  });

  // ── 1C. The switch declining to panic. ─────────────────────────────────────────────────────
  push(t, 'override-timer-start', `Feature 1C override timer starts (${tOverride}s)`, {
    cite: cite(profile, profile.timers.overrideNormalOutage.page),
    why: profile.timers.overrideNormalOutage.why
  });

  // THE CENTRAL BEHAVIOUR OF 1C: an outage shorter than the timer is not an outage.
  if (s.normalReturnsAt !== null && s.normalReturnsAt < tOverride) {
    push(s.normalReturnsAt, 'normal-restored-within-override',
      'Normal source restored before the 1C timer expired', {
        cite: cite(profile, profile.timers.overrideNormalOutage.page),
        terminal: true,
        detail: `Outage was ${s.normalReturnsAt}s, shorter than the ${tOverride}s override. ` +
                'No engine start. The load never moved. This is correct behaviour, and it is why ' +
                'a room full of people who saw the lights flicker will tell you the generator ' +
                'failed to start.'
      });
    return finish(profile, s, ev, warn, { engineStarted: false, transferred: false });
  }

  t += tOverride;
  push(t, 'engine-start', 'Engine start signal', { cite: cite(profile, profile.timers.overrideNormalOutage.page) });

  // ── Generator comes up. This is the genset's property, not the switch's. ────────────────────
  t += s.generatorReadyAfter;
  push(t, 'emergency-acceptable', 'Emergency source reaches pickup thresholds', {
    cite: cite(profile, profile.thresholds.emergency.page),
    detail: `pickup ${profile.thresholds.emergency.voltagePickup}% V, ${profile.thresholds.emergency.freqPickup}% f`,
    unsourced: 'The time to get here is a property of the generator set, not of the transfer ' +
               'switch, and no ASCO timer governs it. It is a scenario input.'
  });

  // ── 2B. ────────────────────────────────────────────────────────────────────────────────────
  if (t2B > 0) {
    push(t, 'transfer-timer-start', `Feature 2B transfer to emergency timer starts (${t2B}s)`, {
      cite: cite(profile, profile.timers.transferToEmergency.page)
    });
    t += t2B;
  }

  const toEmerg = doTransition(profile, s, t, 'normal', 'emergency', push, warn);
  if (toEmerg.halted) return finish(profile, s, ev, warn, { engineStarted: true, transferred: false });
  t = toEmerg.t;

  push(t, 'load-on-emergency', 'Load on emergency source', {});

  // ── Normal returns, or it does not. ─────────────────────────────────────────────────────────
  if (s.normalReturnsAt === null) {
    return finish(profile, s, ev, warn, { engineStarted: true, transferred: true, retransferred: false });
  }

  t = Math.max(t, s.normalReturnsAt);
  push(t, 'normal-restored', 'Normal source rises to pickup threshold', {
    cite: cite(profile, profile.thresholds.normal.page),
    detail: `pickup ${profile.thresholds.normal.voltagePickup}% V (dropout was ` +
            `${profile.thresholds.normal.voltageDropout}%: the gap is the deadband)`
  });

  // ── 3A. The switch refusing to believe the utility. ─────────────────────────────────────────
  const t3Aspec = s.isTest ? profile.timers.retransferToNormalTest : profile.timers.retransferToNormal;
  push(t, 'retransfer-timer-start', `Feature 3A retransfer timer starts (${fmt(t3A)})`, {
    cite: cite(profile, t3Aspec.page),
    why: t3Aspec.why,
    detail: s.isTest
      ? 'Test mode: nothing actually failed, so there is nothing to distrust.'
      : 'The normal source failed, so it is presumed to still be under repair.'
  });
  t += t3A;

  const toNormal = doTransition(profile, s, t, 'emergency', 'normal', push, warn);
  if (toNormal.halted) return finish(profile, s, ev, warn, { engineStarted: true, transferred: true, retransferred: false });
  t = toNormal.t;

  push(t, 'load-on-normal', 'Load back on normal source', {});

  // ── 2E. Entirely for the engine. ────────────────────────────────────────────────────────────
  push(t, 'cooldown-start', `Feature 2E unloaded running starts (${fmt(t2E)})`, {
    cite: cite(profile, profile.timers.unloadedRunning.page),
    why: profile.timers.unloadedRunning.why,
    detail: 'The load is already back on the utility. The engine runs on with nothing on it.'
  });
  t += t2E;
  push(t, 'engine-stop', 'Engine stops', { cite: cite(profile, profile.timers.unloadedRunning.page) });

  return finish(profile, s, ev, warn, { engineStarted: true, transferred: true, retransferred: true });
}

// The three transition types. Returns {t, halted}.
function doTransition (profile, s, t, from, to, push, warn) {
  if (s.transition === 'open') {
    push(t, 'open-transition', `Open transition: break before make (${from} opens, then ${to} closes)`, {
      detail: 'The two sources are never connected. The load sees a genuine dead interval.',
      unsourced: 'The physical contact transfer time is not published as a timer in this manual, ' +
                 'so the dead interval is modelled as instantaneous. It is not zero in reality.'
    });
    return { t, halted: false };
  }

  if (s.transition === 'delayed') {
    const dwell = timerValue(profile, 'delayedTransitionTime', s.timers);
    push(t, 'delayed-open', `Delayed transition: ${from} opens, load dwells in neutral (${dwell}s)`, {
      cite: cite(profile, profile.timers.delayedTransitionTime.page),
      why: profile.timers.delayedTransitionTime.why,
      appliesTo: profile.timers.delayedTransitionTime.appliesTo
    });
    t += dwell;
    push(t, 'delayed-close', `Dwell complete: ${to} closes`, {});
    return { t, halted: false };
  }

  if (s.transition === 'closed') {
    const sync = inSync(profile, s.sync);
    push(t, 'sync-check', 'Sync check permissive evaluated', {
      cite: sync.cite,
      appliesTo: profile.syncCheck.appliesTo,
      quote: profile.syncCheck.quote,
      checks: sync.checks,
      measured: s.sync
    });

    if (!sync.ok) {
      const tFail = timerValue(profile, 'failureToSynchronize', s.timers);
      push(t, 'sync-wait', `Sources not in sync: failure to synchronize timer runs (${fmt(tFail)})`, {
        cite: cite(profile, profile.timers.failureToSynchronize.page)
      });
      t += tFail;
      push(t, 'failure-to-synchronize', 'Failure to synchronize', {
        cite: cite(profile, profile.timers.failureToSynchronize.page),
        terminal: true,
        unsourced: 'The timer is published. What the switch does when it expires is NOT published ' +
                   'in the revision read, so this simulator stops here rather than inventing the ' +
                   'next step. See sources/SOURCES.md.'
      });
      warn.push('Closed transition could not synchronise. The manual publishes the timer but not ' +
                'the action taken when it expires, so the sequence is not continued.');
      return { t, halted: true };
    }

    const tSync = timerValue(profile, 'inSyncTimeDelay', s.timers);
    push(t, 'in-sync-delay', `In sync, holding for the in sync time delay (${tSync}s)`, {
      cite: cite(profile, profile.timers.inSyncTimeDelay.page),
      appliesTo: profile.timers.inSyncTimeDelay.appliesTo
    });
    t += tSync;

    // 🔴 THE OVERLAP WITH NO PUBLISHED WIDTH.
    // Make before break: both sources are connected. ASCO factory presets how long and prints no
    // number in the current revision. The event is real; its duration is unknown; the engine says
    // unknown rather than borrowing the 0.5 sec from a superseded 2004 revision.
    push(t, 'sources-paralleled', `Closed transition: make before break, ${from} and ${to} both closed`, {
      duration: NOT_PUBLISHED,
      detail: profile.extendedParallelTime.note,
      unsourced: 'Two live sources are paralleled here. ASCO factory presets the extended parallel ' +
                 'time and publishes no value in Rev N, so this tool cannot tell you how long. ' +
                 'It will not guess: this is the one parameter where guessing matters most.'
    });
    push(t, 'closed-transition-complete', `${from} opens. Load transferred with no interruption.`, {});
    return { t, halted: false };
  }

  throw new Error(`unknown transition type "${s.transition}"`);
}

function finish (profile, s, events, warnings, outcome) {
  return {
    profile: {
      id: profile.id, vendor: profile.vendor, product: profile.product,
      models: profile.models, part: profile.part, revision: profile.revision, revDate: profile.revDate
    },
    transition: s.transition,
    events,
    warnings,
    outcome,
    // Always carried, never resolved. The UI must show it.
    publishedContradictions: [profile.shedLoadInPhase].filter(c => c && c.contradiction),
    duration: events.length ? events[events.length - 1].t : 0
  };
}

function round (n) { return Math.round(n * 1000) / 1000; }

function fmt (sec) {
  if (sec < 60) return `${round(sec)}s`;
  const m = Math.floor(sec / 60), r = round(sec % 60);
  return r ? `${m}m ${r}s` : `${m}m`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { simulate, evaluateSource, inSync, timerValue, doTransition, fmt, NOT_PUBLISHED };
}
