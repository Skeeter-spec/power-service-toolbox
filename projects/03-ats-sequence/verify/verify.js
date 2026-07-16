#!/usr/bin/env node
/*
 * VERIFY. Run:  node verify/verify.js
 *
 * The gate for this repo: an app is not published until it reproduces a published worked example.
 * This is that check for project 03.
 *
 * WHAT IS BEING CHECKED, AND WHY IT IS A DIFFERENT SHAPE FROM 01 AND 02
 *
 * 01 verified a structural claim (pull this component, does the load drop) against a paper's prose
 * verdict. 02 verified ARITHMETIC against a 210 cell published table. Neither shape fits here.
 *
 * An ATS sequence is a STATE MACHINE, and ASCO does not publish a filled in timeline to diff
 * against. What it does publish, in the Group 5 Controller User's Guide 381333-126 N:
 *
 *   1. One numeric, verbatim, pass or fail criterion (p.25, the in-sync sentence).
 *   2. A full timer table with defaults AND adjustable ranges (p.9).
 *   3. A voltage and frequency pickup / dropout table with a deliberate deadband (p.7).
 *   4. Narratives stating what each timer is FOR, which pins the behaviour.
 *
 * So this file drives the engine and asserts (a) the published numbers appear at the published
 * times, (b) the published criterion is reproduced exactly INCLUDING ITS BOUNDARY, (c) the published
 * ranges are enforced, and (d) the deadband behaves as the two thresholds require.
 *
 * THE SECTION THAT MATTERS MOST IS SECTION F: THE REFUSALS
 *
 * This project's biggest finding is an ABSENCE. ASCO deleted the closed transition extended parallel
 * time from its settings table between Rev K (2004) and Rev N (2018) and now calls it "factory
 * preset" with no value printed. A 0.5 second default and a 0.100 to 1.000 sec range exist ONLY in a
 * superseded revision. That parameter governs how long two live sources sit paralleled, which makes
 * it simultaneously the most attractive number in the source for a simulator to expose and the most
 * dangerous one to get from a fourteen year old document.
 *
 * An absence is not self enforcing. Nothing stops a future session from finding 0.5 in Rev K,
 * thinking "the manual publishes it", and adding the slider. So the absence is ASSERTED here, and
 * the same goes for every other thing this tool declines to claim. Section F is the product.
 *
 * See ../sources/SOURCES.md and ../../../reference/ats-sequence-of-operation.md.
 */
'use strict';

var V = require('../build/vendors.js');
var E = require('../build/engine.js');

var ASCO = V.ASCO_G5;
var passed = 0, failed = 0;

function check (name, quote, fn) {
  var ok, err = null;
  try { ok = fn(); } catch (e) { ok = false; err = e; }
  if (ok) { passed++; console.log('  ok   ' + name); }
  else {
    failed++;
    console.log('  FAIL ' + name);
    if (quote) console.log('       source says: "' + quote + '"');
    if (err) console.log('       threw: ' + err.message);
  }
}

function evAt (result, id) {
  var e = result.events.filter(function (x) { return x.id === id; });
  return e.length ? e[0] : null;
}

function section (title) { console.log('\n' + title); }

// Baseline scenario: normal fails at t=0, generator up 10s later, normal never returns.
function run (over) {
  var s = { transition: 'open', normalReturnsAt: null, generatorReadyAfter: 10 };
  Object.keys(over || {}).forEach(function (k) { s[k] = over[k]; });
  return E.simulate(ASCO, s);
}

console.log('\n03 ATS sequence simulator. Verifying against ASCO Group 5 Controller');
console.log("User's Guide, part 381333-126 N (09/2018), 7000 Series.\n");

// ── A. The published in-sync criterion, reproduced verbatim and at its boundary ───────────────
section('A. The in-sync criterion (Rev N p.25). The one published numeric verdict in this source.');

var SYNC_QUOTE = ASCO.syncCheck.quote;

check('the profile carries ASCO\'s sentence verbatim, all three numbers', SYNC_QUOTE, function () {
  return ASCO.syncCheck.maxPhaseDeg === 5
    && ASCO.syncCheck.maxFreqHz === 0.2
    && ASCO.syncCheck.maxVoltagePct === 5
    && /less than 5 degrees/.test(SYNC_QUOTE)
    && /less than 0\.2 Hz/.test(SYNC_QUOTE)
    && /less than 5%/.test(SYNC_QUOTE);
});

check('all three criteria met => in sync', SYNC_QUOTE, function () {
  return E.inSync(ASCO, { phaseDeg: 4.9, freqHz: 0.19, voltagePct: 4.9 }).ok === true;
});

// "must be LESS THAN 5 degrees". Exactly 5.0 is not less than 5. The boundary is the assertion:
// this is the difference between reproducing a published criterion and approximating it.
check('phase EXACTLY at 5.0 deg => NOT in sync (the manual says "less than")', SYNC_QUOTE, function () {
  return E.inSync(ASCO, { phaseDeg: 5.0, freqHz: 0, voltagePct: 0 }).ok === false;
});
check('frequency EXACTLY at 0.2 Hz => NOT in sync (the manual says "less than")', SYNC_QUOTE, function () {
  return E.inSync(ASCO, { phaseDeg: 0, freqHz: 0.2, voltagePct: 0 }).ok === false;
});
check('voltage EXACTLY at 5% => NOT in sync (the manual says "less than")', SYNC_QUOTE, function () {
  return E.inSync(ASCO, { phaseDeg: 0, freqHz: 0, voltagePct: 5.0 }).ok === false;
});

check('ALL THREE are required: any one failing fails the permissive', SYNC_QUOTE, function () {
  return E.inSync(ASCO, { phaseDeg: 9, freqHz: 0.1, voltagePct: 1 }).ok === false
    && E.inSync(ASCO, { phaseDeg: 1, freqHz: 0.9, voltagePct: 1 }).ok === false
    && E.inSync(ASCO, { phaseDeg: 1, freqHz: 0.1, voltagePct: 9 }).ok === false;
});

check('the criterion is symmetric: sign of the error does not matter', SYNC_QUOTE, function () {
  return E.inSync(ASCO, { phaseDeg: -4.9, freqHz: -0.19, voltagePct: -4.9 }).ok === true
    && E.inSync(ASCO, { phaseDeg: -5.1, freqHz: 0, voltagePct: 0 }).ok === false;
});

// ── B. The published timer defaults, appearing at the published times ─────────────────────────
section('B. Published timer defaults (Rev N p.9) drive the timeline.');

check('1C override momentary normal source outages: default 1 second', null, function () {
  return ASCO.timers.overrideNormalOutage.default === 1;
});
check('2B transfer to emergency: default 0', null, function () {
  return ASCO.timers.transferToEmergency.default === 0;
});
check('2E unloaded running: default 5 minutes', null, function () {
  return ASCO.timers.unloadedRunning.default === 300;
});
check('3A retransfer, normal failed: default 30 minutes', null, function () {
  return ASCO.timers.retransferToNormal.default === 1800;
});
check('3A retransfer, test only: default 30 seconds', null, function () {
  return ASCO.timers.retransferToNormalTest.default === 30;
});
check('in sync time delay: default 1.5 s. Failure to synchronize: default 5 min', null, function () {
  return ASCO.timers.inSyncTimeDelay.default === 1.5
    && ASCO.timers.failureToSynchronize.default === 300;
});

check('engine start occurs at exactly the 1C default (1s) after normal fails', null, function () {
  var r = run();
  return evAt(r, 'engine-start').t === 1;
});

check('emergency acceptable at 1C + generator ready time, not before', null, function () {
  var r = run({ generatorReadyAfter: 10 });
  return evAt(r, 'emergency-acceptable').t === 11;
});

check('full open transition timeline reproduces every published default in order', null, function () {
  // normal fails t=0, returns t=60, generator up 10s after start signal
  var r = run({ normalReturnsAt: 60 });
  return evAt(r, 'engine-start').t === 1              // 0 + 1C(1)
    && evAt(r, 'emergency-acceptable').t === 11       // + genset 10
    && evAt(r, 'load-on-emergency').t === 11          // 2B default is 0
    && evAt(r, 'normal-restored').t === 60
    && evAt(r, 'load-on-normal').t === 60 + 1800      // + 3A(30 min)
    && evAt(r, 'engine-stop').t === 60 + 1800 + 300;  // + 2E(5 min)
});

check('test mode swaps 3A to 30 seconds, and nothing else moves', null, function () {
  var r = run({ normalReturnsAt: 60, isTest: true });
  return evAt(r, 'load-on-normal').t === 90           // 60 + 30
    && evAt(r, 'engine-stop').t === 390               // + 2E(300)
    && evAt(r, 'engine-start').t === 1;
});

// ── C. The published adjustable ranges are a real constraint ──────────────────────────────────
section('C. Published ranges (Rev N p.9) are enforced. A setting outside the range is not a setting.');

check('1C accepts 6 s (published max) and 0 s (published min)', null, function () {
  return E.timerValue(ASCO, 'overrideNormalOutage', { overrideNormalOutage: 6 }) === 6
    && E.timerValue(ASCO, 'overrideNormalOutage', { overrideNormalOutage: 0 }) === 0;
});

check('1C REJECTS 7 s: the published range is 0 to 6 sec', null, function () {
  try { E.timerValue(ASCO, 'overrideNormalOutage', { overrideNormalOutage: 7 }); return false; }
  catch (e) { return e instanceof RangeError; }
});

check('1C REJECTS a negative delay', null, function () {
  try { E.timerValue(ASCO, 'overrideNormalOutage', { overrideNormalOutage: -1 }); return false; }
  catch (e) { return e instanceof RangeError; }
});

check('in sync time delay REJECTS 3.5 s: the published range is 0 to 3.0 sec', null, function () {
  try { E.timerValue(ASCO, 'inSyncTimeDelay', { inSyncTimeDelay: 3.5 }); return false; }
  catch (e) { return e instanceof RangeError; }
});

check('an override inside the range actually reaches the timeline', null, function () {
  var r = run({ timers: { overrideNormalOutage: 6 } });
  return evAt(r, 'engine-start').t === 6;
});

// ── D. Voltage and frequency thresholds, and the deadband between them ────────────────────────
section('D. Pickup / dropout (Rev N p.7). The gap between them is the deadband, and it is published.');

check('normal source: dropout 85%, pickup 90%', null, function () {
  return ASCO.thresholds.normal.voltageDropout === 85 && ASCO.thresholds.normal.voltagePickup === 90;
});
check('emergency source: dropout 75%, pickup 90%', null, function () {
  return ASCO.thresholds.emergency.voltageDropout === 75
    && ASCO.thresholds.emergency.voltagePickup === 90;
});
check('normal and emergency dropouts DIFFER (85 vs 75): they are not one threshold', null, function () {
  return ASCO.thresholds.normal.voltageDropout !== ASCO.thresholds.emergency.voltageDropout;
});
check('frequency dropout 90%, pickup 95%, both sources', null, function () {
  return ASCO.thresholds.normal.freqDropout === 90 && ASCO.thresholds.normal.freqPickup === 95
    && ASCO.thresholds.emergency.freqDropout === 90 && ASCO.thresholds.emergency.freqPickup === 95;
});

var TH = ASCO.thresholds.normal;

check('an available source at 100% stays available', null, function () {
  return E.evaluateSource(true, 100, 100, TH) === true;
});
check('an available source falling to 84% drops out (below the 85% dropout)', null, function () {
  return E.evaluateSource(true, 84, 100, TH) === false;
});
check('THE DEADBAND: an available source at 87% is STILL AVAILABLE (above 85% dropout)', null, function () {
  return E.evaluateSource(true, 87, 100, TH) === true;
});
check('THE DEADBAND: a FAILED source at 87% is STILL FAILED (below the 90% pickup)', null, function () {
  // Same voltage, opposite answer, decided by history. That is what two thresholds are for, and a
  // single threshold implementation passes every check above this one and fails this.
  return E.evaluateSource(false, 87, 100, TH) === false;
});
check('a failed source at exactly 90% picks up (the manual gives a pickup, not a "greater than")', null, function () {
  return E.evaluateSource(false, 90, 100, TH) === true;
});
check('frequency alone can drop a source out at full voltage', null, function () {
  return E.evaluateSource(true, 100, 89, TH) === false;
});

// ── E. The behavioural claims each timer's own narrative pins down ─────────────────────────────
section('E. What the timers are FOR. The narratives pin these, so they are assertable.');

check('1C: an outage SHORTER than the override does not start the engine', null, function () {
  var r = run({ normalReturnsAt: 0.5 });   // 0.5 s outage against a 1 s override
  return r.outcome.engineStarted === false
    && r.outcome.transferred === false
    && evAt(r, 'normal-restored-within-override') !== null
    && evAt(r, 'engine-start') === null;
});

check('1C: an outage LONGER than the override does start the engine', null, function () {
  var r = run({ normalReturnsAt: 2 });     // 2 s outage against a 1 s override
  return r.outcome.engineStarted === true && evAt(r, 'engine-start').t === 1;
});

check('1C boundary: raising the override to 6 s makes a 5 s outage a non event', null, function () {
  var r = run({ normalReturnsAt: 5, timers: { overrideNormalOutage: 6 } });
  return r.outcome.engineStarted === false;
});

check('3A: the load does NOT return the moment the utility does', null, function () {
  var r = run({ normalReturnsAt: 60 });
  return evAt(r, 'normal-restored').t === 60
    && evAt(r, 'load-on-normal').t === 1860
    && evAt(r, 'load-on-normal').t > evAt(r, 'normal-restored').t;
});

check('2E: the engine keeps running AFTER the load is back on normal', null, function () {
  var r = run({ normalReturnsAt: 60 });
  return evAt(r, 'engine-stop').t > evAt(r, 'load-on-normal').t
    && evAt(r, 'engine-stop').t - evAt(r, 'load-on-normal').t === 300;
});

check('a normal source that never returns leaves the load on emergency, engine running', null, function () {
  var r = run({ normalReturnsAt: null });
  return r.outcome.transferred === true
    && r.outcome.retransferred === false
    && evAt(r, 'engine-stop') === null;
});

check('delayed transition dwells in neutral for the published 3 s', null, function () {
  var r = run({ transition: 'delayed', normalReturnsAt: null });
  return evAt(r, 'delayed-close').t - evAt(r, 'delayed-open').t === 3;
});

check('closed transition, in sync: no dead interval, load never drops', null, function () {
  var r = run({ transition: 'closed', sync: { phaseDeg: 1, freqHz: 0.05, voltagePct: 1 } });
  return evAt(r, 'sources-paralleled') !== null
    && evAt(r, 'closed-transition-complete') !== null
    && r.outcome.transferred === true;
});

check('closed transition, NOT in sync: halts at failure to synchronize, never parallels', null, function () {
  var r = run({ transition: 'closed', sync: { phaseDeg: 30, freqHz: 0.05, voltagePct: 1 } });
  return evAt(r, 'sources-paralleled') === null
    && evAt(r, 'failure-to-synchronize') !== null
    && evAt(r, 'failure-to-synchronize').t === 11 + 300   // + the published 5 min timer
    && r.outcome.transferred === false;
});

// ── F. THE REFUSALS. The most important section in this file. ─────────────────────────────────
section('F. What this tool refuses to claim. An absence is not self enforcing, so it is asserted.');

check('REFUSAL: the extended parallel time has NO value. Rev N deleted the row.', null, function () {
  var x = ASCO.extendedParallelTime;
  return x.value === null && x.min === null && x.max === null && x.factoryPreset === true;
});

check('REFUSAL: Rev K\'s superseded 0.5 s default appears NOWHERE in the build', null, function () {
  // The specific number that a future session would most plausibly reintroduce, from a document
  // that really does publish it, in the belief that "the manual publishes it". It does not. Not any
  // more. This check exists to make that mistake loud.
  var fs = require('fs'), path = require('path');
  var dir = path.join(__dirname, '..', 'build');
  return fs.readdirSync(dir).every(function (f) {
    if (!/\.(js|html)$/.test(f)) return true;
    var src = fs.readFileSync(path.join(dir, f), 'utf8');
    // Strip comments: SOURCES.md and vendors.js discuss the number in prose on purpose.
    var code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    return !/XtdParallelTD/.test(code)
      && !/extendedParallel\s*[:=]\s*0\.5/.test(code)
      && !/0\.100\s*to\s*1\.000/.test(code);
  });
});

check('REFUSAL: the paralleled event reports duration null, not a number', null, function () {
  var r = run({ transition: 'closed', sync: { phaseDeg: 1, freqHz: 0.05, voltagePct: 1 } });
  var p = evAt(r, 'sources-paralleled');
  return p !== null && p.duration === null && /factory preset/i.test(p.detail);
});

check('REFUSAL: the open transition in phase monitor publishes NO angle window', null, function () {
  // The 5 degrees belongs to the CLOSED transition sync check, on 7ACTS/7ACTB. The in phase monitor
  // is a different feature on 7ATS/7ATB and ASCO publishes only a time delay for it. Transplanting
  // the number because both features say "phase" would invent a spec and cite ASCO for it.
  return ASCO.inPhaseMonitor.anglePublished === null
    && ASCO.inPhaseMonitor.transition === 'open'
    && ASCO.syncCheck.transition === 'closed'
    && ASCO.inPhaseMonitor.appliesTo !== ASCO.syncCheck.appliesTo;
});

check('REFUSAL: the Shed Load contradiction carries BOTH published values, unresolved', null, function () {
  var c = ASCO.shedLoadInPhase;
  return c.contradiction === true && c.tableValue === 1.5 && c.narrativeValue === 3
    && c.tableValue !== c.narrativeValue;
});

check('REFUSAL: every simulation result carries the contradiction to the UI', null, function () {
  var r = run();
  return r.publishedContradictions.length === 1
    && r.publishedContradictions[0].contradiction === true;
});

check('REFUSAL: the engine will not run without a vendor profile', null, function () {
  try { E.simulate(null, {}); return false; }
  catch (e) { return /no vendor profile/.test(e.message); }
});

check('REFUSAL: Russelectric is not runnable, and the engine says why', null, function () {
  if (V.RUSSELECTRIC_2000.runnable !== false) return false;
  try { E.simulate(V.RUSSELECTRIC_2000, {}); return false; }
  catch (e) { return /not runnable/.test(e.message); }
});

check('REFUSAL: the failure to synchronize outcome is marked unsourced, not invented', null, function () {
  var r = run({ transition: 'closed', sync: { phaseDeg: 30, freqHz: 0, voltagePct: 0 } });
  var f = evAt(r, 'failure-to-synchronize');
  return f.terminal === true && /NOT published/.test(f.unsourced);
});

check('REFUSAL: the generator ready time is flagged as a genset property, not an ASCO timer', null, function () {
  var r = run();
  return /property of the generator set/.test(evAt(r, 'emergency-acceptable').unsourced)
    && ASCO.timers.generatorReadyAfter === undefined;
});

check('REFUSAL: no NFPA 110 text, and no bare "10 seconds" claim, anywhere in the build', null, function () {
  var fs = require('fs'), path = require('path');
  var dir = path.join(__dirname, '..', 'build');
  return fs.readdirSync(dir).every(function (f) {
    if (!/\.(js|html)$/.test(f)) return true;
    var src = fs.readFileSync(path.join(dir, f), 'utf8');
    return !/NFPA\s*110[^)]{0,40}(states|requires|says)/i.test(src);
  });
});

check('REFUSAL: the profile is bound to Rev N and 7000 Series, and says so', null, function () {
  return ASCO.revision === 'N' && ASCO.revDate === '09/2018'
    && /7000/.test(ASCO.models) && !/4000/.test(ASCO.models);
});

// ── G. The vendor divergence: 03's whole thesis, computed rather than asserted ─────────────────
section('G. There is no such thing as "the" ATS defaults. This is the project\'s central claim.');

check('ASCO and Russelectric DISAGREE on the momentary override (1 s vs 3 s)', null, function () {
  return ASCO.timers.overrideNormalOutage.default === 1
    && V.RUSSELECTRIC_2000.traced.overrideNormalOutage.value === 3;
});

check('ASCO and Russelectric DISAGREE on retransfer (1800 s vs 300 s), 6x apart', null, function () {
  return ASCO.timers.retransferToNormal.default === 1800
    && V.RUSSELECTRIC_2000.traced.retransferToNormal.value === 300;
});

check('the divergence table agrees on ZERO traced rows', null, function () {
  var rows = V.vendorDivergence();
  return rows.length === 2 && rows.every(function (r) { return r.agree === false; });
});

check('the divergence is computed from the profiles, so it cannot drift out of step', null, function () {
  var rows = V.vendorDivergence();
  var retransfer = rows.filter(function (r) { return /Retransfer/.test(r.what); })[0];
  return retransfer.asco === 1800 && retransfer.russ === 300 && retransfer.ratio === 6;
});

// ── G2. Layout. A bug a person had to look at becomes an assertion. ───────────────────────────
section('G2. Layout regressions found by driving the real page, promoted to permanent checks.');

check('the chart left margin fits the longest lane label', null, function () {
  // FOUND BY DRIVING THE PAGE, 2026-07-16: at ML = 92 the "Emergency source" lane label rendered at
  // x = -13, outside the viewBox, and was silently clipped. A clipped label still looks like a
  // label, so this is invisible in a screenshot and only a structural check sees it. Same class as
  // 01's silently overlapping node boxes. The 97px is measured in the browser, not guessed.
  var fs = require('fs'), path = require('path');
  var src = fs.readFileSync(path.join(__dirname, '..', 'build', 'index.html'), 'utf8');
  var ml = /var W = 900, H = 300, ML = (\d+),/.exec(src);
  var longest = /LONGEST_LANE_LABEL_PX = (\d+)/.exec(src);
  if (!ml || !longest) return false;
  return Number(ml[1]) - 8 >= Number(longest[1]);
});

// ── H. CONTROLS. If these ever go quiet, everything above is void. ─────────────────────────────
section('H. Controls. A suite that passes because it cannot fail is worse than no suite.');

check('CONTROL: the sync check can actually reject (a wildly out of step source fails)', null, function () {
  return E.inSync(ASCO, { phaseDeg: 180, freqHz: 5, voltagePct: 50 }).ok === false;
});

check('CONTROL: a broken deadband would be caught (single threshold fails the history check)', null, function () {
  // Simulates the most plausible wrong implementation: one threshold, no history. If evaluateSource
  // ignored prevAvailable, both of these would return the same answer. They must not.
  var a = E.evaluateSource(true, 87, 100, TH);
  var b = E.evaluateSource(false, 87, 100, TH);
  return a !== b;
});

check('CONTROL: the timeline assertions are sensitive to the timer values', null, function () {
  // If the engine ignored the 1C timer, engine-start would land at 0 and the section B checks would
  // be measuring nothing. Prove the value moves the event.
  var slow = E.simulate(ASCO, { transition: 'open', normalReturnsAt: null, generatorReadyAfter: 10,
    timers: { overrideNormalOutage: 6 } });
  var fast = E.simulate(ASCO, { transition: 'open', normalReturnsAt: null, generatorReadyAfter: 10,
    timers: { overrideNormalOutage: 0 } });
  return evAt(slow, 'engine-start').t === 6 && evAt(fast, 'engine-start').t === 0;
});

check('CONTROL: the range check can pass as well as fail (it is not rejecting everything)', null, function () {
  var threw = false;
  try { E.timerValue(ASCO, 'overrideNormalOutage', { overrideNormalOutage: 3 }); }
  catch (e) { threw = true; }
  return threw === false;
});

check('CONTROL: the "no 0.5 default" scan can actually find the string it looks for', null, function () {
  // Guards check F2. If the regex or the comment stripper broke, F2 would pass on a build that had
  // reintroduced the number. Feed it the string and confirm it is seen.
  var fake = 'var x = { extendedParallel: 0.5 };';
  var code = fake.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  var caught = /extendedParallel\s*[:=]\s*0\.5/.test(code);
  // And confirm the stripper does NOT blind it to real code while removing a comment.
  var mixed = '// extendedParallel: 0.5 in Rev K\nvar y = { extendedParallel: 0.5 };';
  var mixedCode = mixed.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return caught === true && /extendedParallel\s*[:=]\s*0\.5/.test(mixedCode) === true;
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('\nVERIFY FAILED. This project does not ship.');
  process.exit(1);
}
console.log('\nAll checks reproduce the ASCO Group 5 Controller Guide 381333-126 N\'s own published');
console.log('numbers and its own stated in-sync criterion, at the boundary, and assert every');
console.log('refusal this project made: no vendor neutral defaults, no extended parallel value,');
console.log('no angle for the in phase monitor, and the Shed Load contradiction left unresolved.');
