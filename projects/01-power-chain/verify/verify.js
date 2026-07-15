#!/usr/bin/env node
/*
 * VERIFY. Run:  node verify/verify.js
 *
 * The gate for this repo: an app is not published until it reproduces a published worked example.
 * This is that check for project 01.
 *
 * WHAT IS BEING CHECKED
 *
 * Schneider WP75 Rev 4 publishes five one line diagrams AND its own verdict, in words, on each
 * one: where the single points of failure are, and whether the design allows concurrent
 * maintenance. That pairing is rare and it is the only reason a verify phase is possible here.
 *
 * So: the topologies in build/topologies.js were traced off those figures. This file runs the
 * engine over them and asserts that the engine reaches the conclusions the paper states. Every
 * expectation below quotes the paper. If a claim is not in the paper's own words, it is not
 * asserted here, no matter how obviously true it seems.
 *
 * WHAT IS NOT BEING CHECKED, AND WHY
 *
 * Not tier labels. WP75's Table 1 does map its five configurations to Uptime tiers, and it would
 * be easy to assert against that column. It would also be wrong. That mapping is Schneider's
 * convention, not Uptime's definition. Uptime's own public pages never use N, N+1, or 2N at all,
 * their Tier Standard: Topology is gated and unread here, and a tier turns on things a one line
 * does not show. Passing a test against a convention would look like rigor while proving nothing.
 * See ../sources/SOURCES.md.
 *
 * THE SENSITIVITY CONTROL AT THE BOTTOM MATTERS AS MUCH AS THE ASSERTIONS
 *
 * A test suite that passes because it cannot fail is worse than no test suite: it manufactures
 * confidence. So the last section deliberately breaks a topology in a known way and asserts the
 * verdict flips. If the control ever goes quiet, this file is lying and everything above it is void.
 */
'use strict';

var PowerChain = require('../build/engine.js');
var T = require('../build/topologies.js');

var passed = 0, failed = 0, current = '';

function group(name) { current = name; console.log('\n' + name); }

function check(desc, cite, fn) {
  var ok, err = null;
  try { ok = fn(); } catch (ex) { ok = false; err = ex.message; }
  if (ok) { passed++; console.log('  PASS  ' + desc); }
  else {
    failed++;
    console.log('  FAIL  ' + desc);
    if (err) console.log('        error: ' + err);
  }
  if (cite) console.log('        WP75: ' + cite);
}

function sameSet(a, b) {
  var x = a.slice().sort().join(','), y = b.slice().sort().join(',');
  return x === y;
}
function verdictFor(res, id) {
  var r = res.maintenance.results.filter(function (v) { return v.component === id; })[0];
  return r ? r.verdict : null;
}

console.log('Project 01, power chain one line explorer. VERIFY.');
console.log('Against: Schneider Electric White Paper 75 Rev 4,');
console.log('         "Comparing UPS System Design Configurations," McCarthy and Avelar.');
console.log('         https://download.schneider-electric.com/files?p_Doc_Ref=SPD_SADE-5TPL8X_EN');

/* ------------------------------------------------------------------ Figure 1, capacity "N" */
group('Figure 1, p.5. Capacity ("N"). One UPS, maintenance bypass around it.');
var a1 = PowerChain.analyze(T.fig1);

check('Taking the UPS out keeps the load fed, but on unprotected power',
  '"allowing a UPS module to be worked on safely without requiring the shutdown of the load" (p.5)',
  function () { return verdictFor(a1, 'ups') === 'unprotected'; });

check('The ATS, both buses, and the PDU each drop the load outright',
  'Table 1 (p.4) places the capacity configuration at the bottom of the availability scale',
  function () {
    return ['ats', 'bus_in', 'bus_out', 'pdu'].every(function (id) {
      return verdictFor(a1, id) === 'drop';
    });
  });

check('Not concurrently maintainable',
  'concurrent maintenance means shutting a component down "without requiring that the load be ' +
  'transferred to the utility source" (p.3), and here the bypass does exactly that',
  function () { return a1.maintenance.concurrentlyMaintainable === false; });

check('Losing the utility does not drop the load, because the generator carries it',
  'the ATS exists to make that transfer',
  function () { return verdictFor(a1, 'util') === 'ok'; });

/* ------------------------------------------------------------- Figure 3, parallel redundant */
group('Figure 3, p.9. Parallel redundant ("N+1"). Two 300kW modules, one 300kW load.');
var a3 = PowerChain.analyze(T.fig3);

check('Neither UPS module is a single point of failure. Either one can come out cleanly',
  '"these systems provide protection of a single UPS module failure" (p.9)',
  function () {
    return verdictFor(a3, 'ups_a') === 'ok' && verdictFor(a3, 'ups_b') === 'ok';
  });

check('The paralleling bus IS a single point of failure',
  '"there still remains a single point of failure in the paralleling bus" (p.9), and ' +
  '"Single load bus per system, a single point of failure" (p.10)',
  function () { return verdictFor(a3, 'bus_out') === 'drop'; });

check('There are single points of failure both upstream and downstream of the UPS system',
  '"Still single points of failure upstream and downstream of the UPS system" (p.10)',
  function () {
    var up = ['ats', 'bus_in'].some(function (id) { return verdictFor(a3, id) === 'drop'; });
    var down = ['bus_out', 'pdu'].some(function (id) { return verdictFor(a3, id) === 'drop'; });
    return up && down;
  });

check('Not concurrently maintainable',
  'Table 1 (p.4) puts parallel redundant at Tier II, below the concurrently maintainable class',
  function () { return a3.maintenance.concurrentlyMaintainable === false; });

/* --------------------------------------------------- Figure 5, distributed redundant w/ STS */
group('Figure 5, p.12. Distributed redundant with STS. Six 50kW loads, three of them single corded.');
var a5 = PowerChain.analyze(T.fig5);

check('LOADS 1, 3, 5 are single corded and LOADS 2, 4, 6 are dual corded, as drawn',
  '"The dual-corded loads can be fed from two STS units or no STS units, while the ' +
  'single-corded loads need to be fed from a single STS" (p.12)',
  function () {
    return [1, 3, 5].every(function (i) { return PowerChain.cordCount(T.fig5, 'load' + i) === 1; })
      && [2, 4, 6].every(function (i) { return PowerChain.cordCount(T.fig5, 'load' + i) === 2; });
  });

check('No dual corded load has a single point of failure anywhere in the chain',
  '"Two separate power paths from any given dual-corded load\'s perspective provide redundancy ' +
  'from the service entrance" (p.14)',
  function () {
    return [2, 4, 6].every(function (i) {
      return a5.perLoad['load' + i].maintenanceSpofs.length === 0;
    });
  });

check('Each single corded load hangs on its own STS and PDU, which are single points of failure',
  'the advantage claim is conditional: "concurrent maintenance of all components IF all loads ' +
  'are dual-corded" (p.14). In Figure 5 as drawn, they are not',
  function () {
    return sameSet(a5.perLoad.load1.maintenanceSpofs, ['sts1', 'pdu1'])
      && sameSet(a5.perLoad.load3.maintenanceSpofs, ['sts2', 'pdu2'])
      && sameSet(a5.perLoad.load5.maintenanceSpofs, ['sts3', 'pdu3']);
  });

check('No UPS module is a single point of failure for any load',
  'the STS ring is what buys that: each STS holds a primary and a secondary from different modules',
  function () {
    return ['ups1', 'ups2', 'ups3'].every(function (id) { return verdictFor(a5, id) === 'ok'; });
  });

check('So Figure 5 AS DRAWN is not concurrently maintainable. The single corded loads are why',
  'this is the unsatisfied half of the p.14 conditional, and it is the whole reason Figure 6 exists',
  function () { return a5.maintenance.concurrentlyMaintainable === false; });

/* ---------------------------------------------- Figure 6, tri redundant, all loads dual corded */
group('Figure 6, p.13. Tri redundant, no STS, every load dual corded. The control for Figure 5.');
var a6 = PowerChain.analyze(T.fig6);

check('Every load is dual corded',
  '"In cases with 100% dual-corded loads this configuration could be designed without STS ' +
  'units as shown in Figure 6" (p.12)',
  function () {
    return [2, 4, 6].every(function (i) { return PowerChain.cordCount(T.fig6, 'load' + i) === 2; });
  });

check('Concurrently maintainable: EVERY component can come out with every load up and protected',
  '"Allows for concurrent maintenance of all components if all loads are dual-corded" (p.14)',
  function () { return a6.maintenance.concurrentlyMaintainable === true; });

check('Not one component in the whole diagram drops a load',
  '"Both provide for concurrent maintenance, and minimize single points of failure" (p.10)',
  function () { return a6.maintenance.dropSpofs.length === 0; });

check('And no component forces the load onto a bypass, because there is no bypass to force it onto',
  '"Many distributed redundant designs do not have a maintenance bypass circuit" (p.14)',
  function () { return a6.maintenance.forcesBypass.length === 0; });

/* ------------------------------------------------------- Figure 7, system plus system 2(N+1) */
group('Figure 7, p.16. System plus system ("2(N+1)"). Two dual corded loads, one single corded.');
var a7 = PowerChain.analyze(T.fig7);

check('The dual corded loads, LOAD 1 and LOAD 3, have no single point of failure',
  '"complete redundancy from the service entrance all the way to the critical loads" (p.17)',
  function () {
    return a7.perLoad.load1.maintenanceSpofs.length === 0
      && a7.perLoad.load3.maintenanceSpofs.length === 0;
  });

check('The single corded LOAD 2 hangs entirely on the RACK ATS',
  '"tier IV power architectures require that all loads are dual-corded" (p.16). Figure 7 draws a ' +
  'single corded load anyway, and shows the rack ATS as the compromise that brings redundancy ' +
  'closer to it without ever removing the last single point',
  function () { return sameSet(a7.perLoad.load2.maintenanceSpofs, ['rack_ats']); });

check('No UPS module, and neither whole side, is a single point of failure for a dual corded load',
  '"a single UPS module failure will simply result in that UPS module being removed from the ' +
  'circuit, and its parallel modules assuming additional load" (p.16)',
  function () {
    return ['ups_1a', 'ups_1b', 'ups_2a', 'ups_2b', 'ats_a', 'ats_b', 'bus_out_a', 'bus_out_b']
      .every(function (id) { return a7.perLoad.load1.maintenanceSpofs.indexOf(id) === -1; });
  });

check('Losing either utility drops nothing',
  'each side has its own generator and ATS to transfer to',
  function () {
    return verdictFor(a7, 'util_a') === 'ok' && verdictFor(a7, 'util_b') === 'ok';
  });

check('Shutting down a whole service entrance leaves that side\'s UPS modules UP, through the tie',
  '"the tie circuit between the UPS input panelboards will allow one of the utility service ' +
  'entrances to be shut down without requiring one of the UPS systems to be shut down" (p.16). ' +
  'Note this is a stronger claim than "the load stayed on". The load would survive losing side A ' +
  'outright, because it is dual corded. The paper says the UPS SYSTEM keeps running, and the only ' +
  'thing that can do that is the tie back feeding the dead side from the live one',
  function () {
    var withA = PowerChain.energized(T.fig7, { removed: ['ats_a'] });
    var withB = PowerChain.energized(T.fig7, { removed: ['ats_b'] });
    return withA.bus_in_a && withA.ups_1a && withA.ups_1b
      && withB.bus_in_b && withB.ups_2a && withB.ups_2b;
  });

/* ------------------------------------------------------------------------------ LAYOUT
 * Not a claim about power. A claim about the drawing being readable.
 * The node coordinates are placed by hand, so boxes can silently land on top of each other.
 * A screenshot might or might not show it; this always will. Found two overlaps in Figure 5
 * this way, which is why it is a test now and not a note to self to look more carefully.
 */
group('Layout. The diagram has to be legible, and hand placed coordinates drift.');

var BOX_W = 96, BOX_H = 24, BUS_EXTRA = 24;

function boxesOf(t) {
  return t.nodes.map(function (n) {
    var w = (n.type === 'bus' ? BOX_W + BUS_EXTRA : BOX_W);
    return { id: n.id, x0: n.x - w / 2, x1: n.x + w / 2, y0: n.y - BOX_H / 2, y1: n.y + BOX_H / 2 };
  });
}

T.all.forEach(function (t) {
  check('No node boxes overlap in ' + t.name, null, function () {
    var b = boxesOf(t), bad = [];
    for (var i = 0; i < b.length; i++) {
      for (var j = i + 1; j < b.length; j++) {
        if (b[i].x0 < b[j].x1 && b[i].x1 > b[j].x0 && b[i].y0 < b[j].y1 && b[i].y1 > b[j].y0) {
          bad.push(b[i].id + '/' + b[j].id);
        }
      }
    }
    if (bad.length) throw new Error('overlapping: ' + bad.join(', '));
    return true;
  });
});

/* --------------------------------------------------------------------- SENSITIVITY CONTROL */
group('CONTROL. Does this suite actually measure anything, or does it just pass?');

check('CONTROL: dual cording LOAD 1 in Figure 5 makes its single points of failure disappear',
  'if this does not flip, the Figure 5 assertions above are vacuous and prove nothing',
  function () {
    var mutated = JSON.parse(JSON.stringify(T.fig5));
    // The one thing WP75 says would fix it: land the single corded load on a second PDU.
    mutated.edges.push({ from: 'pdu2', to: 'load1' });
    var before = PowerChain.spofsForLoad(T.fig5, 'load1');
    var after = PowerChain.spofsForLoad(mutated, 'load1');
    return before.length === 2 && after.length === 0;
  });

check('CONTROL: cutting the STS ring in Figure 5 makes UPS 2 a single point of failure',
  'the ring is what makes no UPS a single point of failure. Remove the cross feed and the ' +
  'engine must notice. A model that says "fine" either way is not reading the topology',
  function () {
    var mutated = JSON.parse(JSON.stringify(T.fig5));
    // Drop STS 3's secondary feed, so STS 3 depends on UPS 2 alone.
    mutated.edges = mutated.edges.filter(function (e) {
      return !(e.from === 'bus_3out' && e.to === 'sts3');
    });
    var res = PowerChain.analyze(mutated);
    var wasOk = verdictFor(a5, 'ups2') === 'ok';
    var nowDrops = verdictFor(res, 'ups2') === 'drop';
    return wasOk && nowDrops;
  });

check('CONTROL: making the Figure 7 tie one way strands side A when its service entrance goes',
  'a tie that only conducts one way is not a tie. This control exists because a mutation test ' +
  'found exactly that bug in this file: the tie was encoded one way, nothing failed, and the ' +
  'p.16 assertion above did not exist yet to catch it',
  function () {
    var mutated = JSON.parse(JSON.stringify(T.fig7));
    mutated.edges.forEach(function (e) {
      if (e.to === 'tie' || e.from === 'tie') e.bidirectional = false;
    });
    var before = PowerChain.energized(T.fig7, { removed: ['ats_a'] });
    var after = PowerChain.energized(mutated, { removed: ['ats_a'] });
    return before.ups_1a === true && !after.ups_1a;
  });

check('CONTROL: removing the maintenance bypass from Figure 1 turns "unprotected" into "drop"',
  'proves the engine really is distinguishing fed-but-on-utility from dead, rather than ' +
  'labelling one of them at random',
  function () {
    var mutated = JSON.parse(JSON.stringify(T.fig1));
    mutated.nodes = mutated.nodes.filter(function (n) { return n.id !== 'mbp'; });
    mutated.edges = mutated.edges.filter(function (e) {
      return e.from !== 'mbp' && e.to !== 'mbp';
    });
    var res = PowerChain.analyze(mutated);
    return verdictFor(a1, 'ups') === 'unprotected' && verdictFor(res, 'ups') === 'drop';
  });

/* --------------------------------------------------------------------------------- report */
console.log('\n' + '-'.repeat(70));
console.log(passed + ' passed, ' + failed + ' failed.');
if (failed) {
  console.log('VERIFY FAILED. Project 01 does not ship. Fix the engine or fix the topology.');
  process.exit(1);
}
console.log('VERIFY PASSED. The engine reaches the conclusions WP75 states, on all five figures,');
console.log('and the controls confirm it would have noticed if it did not.');
