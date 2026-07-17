// 07 Switching order and LOTO planner. Verify.
//
//   node verify/verify.js        (from projects/07-switching-order/)
//
// WHAT THIS SUITE CHECKS AGAINST, AND WHY IT IS SHAPED THE WAY IT IS.
//
// This is a FOURTH shape of verify in this repo, and naming it helps 04-10 plan:
//   01 checked a structural claim against a prose verdict.
//   02 checked ARITHMETIC against a 210 cell published table.
//   03 was a state machine with no published timeline, so the criterion + defaults + ranges WERE
//      the answer key.
//   05 had the strongest shape available: the source printed the answer in literal hex bytes.
//   07 is different again: THE SOURCE PUBLISHES THE ANSWER TO A QUESTION, IN PROSE, ON NAMED
//      DEVICES, AND ASKS THE SAME CIRCUIT TWO DIFFERENT QUESTIONS AND GETS TWO DIFFERENT ANSWERS.
//
// That last part is what makes this fixture strong rather than merely present. Any model can be bent
// to reproduce one answer. Example 1 and Example 2 share ONE figure, and each published answer is
// WRONG for the other question. A model that has the topology subtly wrong cannot satisfy both.
//
// 🔴 WHAT THIS SUITE CANNOT DO, STATED SO NOBODY LATER ASSUMES IT DID.
// It cannot tell you the pages were read correctly. The limits and the quotes in topology.js are two
// representations of ONE transcribed fact, so no assertion here can catch a misread page. The
// instrument for that is a SECOND READER, and it ran: the source phase read Example 1's figure and
// recorded "a disconnect either side" of the breaker, and the second read at 14x counted three
// blades and found the missing one was the entire point of the example. Both reads are at the
// publisher. That is the evidence, and this file is not.

'use strict';

const path = require('path');
const { TOPOLOGIES, PUBLISHED_ANSWERS } = require(path.join(__dirname, '..', 'build', 'topology.js'));
const E = require(path.join(__dirname, '..', 'build', 'engine.js'));
const fs = require('fs');

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    const r = fn();
    if (r === true) { passed++; return; }
    failures.push(name + '\n      ' + (r || 'returned falsy'));
  } catch (e) {
    failures.push(name + '\n      threw: ' + e.message);
  }
}

function eq(actual, expected, what) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  return a === b ? true : (what || '') + ' expected ' + b + ' got ' + a;
}

function clone(topo) { return JSON.parse(JSON.stringify(topo)); }

// Apply a published clearance to a topology's state: the breakers BPA opens, and the limits BPA
// opens or checks open. This is how Example 2 is asked against the state Example 1 leaves behind.
function applyClearance(topo, key) {
  const ans = PUBLISHED_ANSWERS[key];
  for (const pcbId of ans.pcbsCheckedOpen) {
    topo.devices.find((d) => d.id === pcbId).state = 'open';
  }
  for (const limitId of ans.limits) {
    topo.devices.find((d) => d.id === limitId).state = 'open';
  }
  return topo;
}

// =============================================================================================
console.log('\nA. The model, and the things about it that are inference rather than drawing');
// =============================================================================================

check('A1  every device references nodes that exist', () => {
  for (const t of Object.values(TOPOLOGIES)) {
    for (const d of t.devices) {
      for (const n of d.between) {
        if (!t.nodes[n]) return t.id + '/' + d.id + ' references unknown node ' + n;
      }
    }
  }
  return true;
});

check('A2  every device kind is one the domain has (pcb, isolating, ground, fixed)', () => {
  const ok = ['pcb', 'isolating', 'ground', 'fixed'];
  for (const t of Object.values(TOPOLOGIES)) {
    for (const d of t.devices) {
      if (ok.indexOf(d.kind) === -1) return t.id + '/' + d.id + ' has kind ' + d.kind;
    }
  }
  return true;
});

check('A3  Example 1 figure: THREE disconnects per terminal, not two ' +
      '(the source phase recorded two, and the missing one is the point of the example)', () => {
  const t = TOPOLOGIES['bpa-x2-ex1'];
  const central = ['a10_aux_bus_disc', 'a10_line_side_disc', 'a10_main_bus_disc'];
  const east = ['a3_aux_bus_disc', 'a3_line_side_disc', 'a3_main_bus_disc'];
  for (const id of central.concat(east)) {
    const d = t.devices.find((x) => x.id === id);
    if (!d) return 'missing ' + id;
    if (d.kind !== 'isolating') return id + ' is ' + d.kind;
  }
  return true;
});

check('A4  the Auxiliary Bus Disconnect hangs off the LINE node, not off the breaker ' +
      '(a model built the other way calls a line isolated while it sits fed from the aux bus)', () => {
  const t = TOPOLOGIES['bpa-x2-ex1'];
  const aux = t.devices.find((d) => d.id === 'a10_aux_bus_disc');
  if (aux.between.indexOf('central_line_node') === -1) {
    return 'aux bus disconnect does not touch the line node: ' + JSON.stringify(aux.between);
  }
  // and it must NOT touch either terminal of the breaker
  if (aux.between.indexOf('central_a10_line_terminal') !== -1 ||
      aux.between.indexOf('central_a10_bus_terminal') !== -1) {
    return 'aux bus disconnect touches a breaker terminal';
  }
  return true;
});

check('A5  the ONE device whose name this repo inferred is flagged as inferred, and nothing ' +
      'published rests on it', () => {
  const t = TOPOLOGIES['bpa-x2-ex1'];
  const inferred = t.devices.filter((d) => d.nameIsInferred).map((d) => d.id);
  if (!eq(inferred, ['a3_main_bus_disc'], 'inferred names')) return eq(inferred, ['a3_main_bus_disc']);
  for (const key of Object.keys(PUBLISHED_ANSWERS)) {
    const ans = PUBLISHED_ANSWERS[key];
    if (ans.limits.indexOf('a3_main_bus_disc') !== -1) {
      return 'a published answer rests on an inferred device name';
    }
  }
  return true;
});

check('A6  the one modelling ASSUMPTION that is not BPA\'s is flagged (the X.3 feeder is radial)', () => {
  const t = TOPOLOGIES['bpa-x3-ex1'];
  return t.nodes.feeder_node.assumption === true ||
    'the feeder-is-not-a-source assumption is load bearing and must be flagged';
});

check('A7  a clearance zone extends ACROSS a breaker: seeded at one terminal of A-10 it reaches the ' +
      'other. A breaker is not an isolation boundary, and this is INFERRED from a published answer ' +
      'rather than stated: BPA Example 2 makes the disconnects on BOTH sides of A-10 the limits of ' +
      'one clearance, which is only true if that clearance spans the breaker.', () => {
  // WHY THIS CHECK EXISTS: mutation testing found `pcb` in ZONE_TRAVERSABLE was unexercised. Every
  // published fixture asks about the breaker as a DEVICE, which seeds both terminals directly, so
  // the traversal never ran. That is a coverage hole, not dead code: the traversal is what a
  // clearance requested at a NODE next to a breaker depends on, and the UI can ask for one.
  const zone = E.clearanceZone(clone(TOPOLOGIES['bpa-x2-ex1']),
    { type: 'node', id: 'central_a10_line_terminal' });
  return zone.has('central_a10_bus_terminal') ||
    'a clearance seeded on one side of A-10 did not reach the other side. If a breaker bounds a ' +
    'zone, then Example 2 could not have the disconnects on both sides as one clearance\'s limits.';
});

check('A8  the source search does not path through the GROUND GRID to find a source. ' +
      '⚠ THIS IS THIS TOOL\'S OWN MODEL CLAIM, ASSERTED ON THIS TOOL\'S OWN FIXTURE, AND BPA ' +
      'DOES NOT STATE IT. It is labelled that way on purpose and no published answer rests on it.', () => {
  // WHY THIS FIXTURE IS SYNTHETIC, which is a decision and not laziness.
  // Mutation testing found the ground guard in reachesSourceAvoidingZone executes but changes no
  // published answer: in every BPA fixture a real source is reachable without the ground grid, so
  // walking through it finds the same sources and the answers agree. A survivor is a finding, and
  // this one is a coverage hole rather than dead code, because an input DOES distinguish the two
  // readings. No published input does.
  //
  // The repo's rule (#20) is that a mutant you cannot kill without asserting unsourced behaviour is
  // out of scope. This is not that case, and the difference is worth naming: 03's unkillable mutant
  // needed a FACT ABOUT A DEVICE that only the manufacturer's manual could answer (what happens at
  // an outage of exactly 1.000 s). "Is the ground grid an energization path" is not a fact about
  // BPA's equipment at all. It is this model's own choice, so this model's own fixture can assert it
  // without inventing anything about the source. What would be dishonest is dressing it up as BPA's.
  const t = {
    id: 'synthetic-ground-path',
    nodes: {
      work: { label: 'the work', source: false },
      beyond: { label: 'beyond the disconnect', source: false },
      ground: { label: 'ground grid', source: false },
      island: { label: 'an unrelated circuit', source: false },
      src: { label: 'a source', source: true },
    },
    devices: [
      { id: 'd1', kind: 'isolating', between: ['work', 'beyond'], state: 'closed' },
      { id: 'gs_a', kind: 'ground', between: ['beyond', 'ground'], state: 'closed' },
      { id: 'gs_b', kind: 'ground', between: ['island', 'ground'], state: 'closed' },
      { id: 'd2', kind: 'fixed', between: ['island', 'src'], state: 'closed' },
    ],
  };
  // Beyond d1 there is no source except by walking out through one ground switch, across the ground
  // grid, and back up another into an unrelated circuit. That is not an energization path, so d1 is
  // not a limit.
  const { limits } = E.clearanceLimits(t, { type: 'node', id: 'work' });
  return limits.indexOf('d1') === -1 ||
    'the search reached a source by walking through the ground grid, so a disconnect with nothing ' +
    'live behind it was reported as a clearance limit';
});

// =============================================================================================
console.log('B. BPA X.2 Example 1, P-45: a Work Clearance on the line. The published answer.');
// =============================================================================================

check('B1  limits reproduce BPA\'s published four devices, both terminals', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const { limits } = E.clearanceLimits(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  return eq(limits, ans.limits.slice().sort(), 'X.2 Ex 1 limits');
});

check('B2  BPA\'s own verbs reproduce: "check open, and tag A-10 Auxiliary Bus Disconnect and ' +
      'open and tag A-10 Line Side Disconnect" (P-45)', () => {
  const t = clone(TOPOLOGIES['bpa-x2-ex1']);
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const { limits } = E.clearanceLimits(t, ans.workItem);
  for (const id of limits) {
    const got = E.tagAction(t.devices.find((d) => d.id === id));
    if (got !== ans.actions[id]) return id + ': expected "' + ans.actions[id] + '" got "' + got + '"';
  }
  return true;
});

check('B3  the Main Bus Disconnect is NOT a limit for a clearance on the line ' +
      '(it is the answer to Example 2\'s question, one page later, and it is wrong for this one)', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const { limits } = E.clearanceLimits(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  return limits.indexOf('a10_main_bus_disc') === -1 || 'main bus disconnect reported as a limit';
});

check('B4  the ground switches are NOT limits: ground is not a source ' +
      '(BPA: "The ground switches at both terminals would remain open")', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const { limits } = E.clearanceLimits(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  return (limits.indexOf('gs_7233') === -1 && limits.indexOf('gs_7243') === -1) ||
    'a ground switch was reported as a clearance limit';
});

check('B5  the breakers BPA opens by supervisory control are the ones the rule forces open first ' +
      '("de-energize ... by opening PCBs A-10 and A-3 by supervisory control")', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const got = E.pcbsToCheckOpen(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  return eq(got, ans.pcbsCheckedOpen.slice().sort(), 'PCBs to check open');
});

// =============================================================================================
console.log('C. BPA X.2 Example 2, P-47: a Test Clearance on A-10 itself. SAME FIGURE. Different answer.');
// =============================================================================================

check('C1  limits reproduce BPA\'s published two devices: Line Side and MAIN BUS', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex2-a10-test-clearance'];
  const t = applyClearance(clone(TOPOLOGIES['bpa-x2-ex1']), 'x2-ex1-line-work-clearance');
  const { limits } = E.clearanceLimits(t, ans.workItem);
  return eq(limits, ans.limits.slice().sort(), 'X.2 Ex 2 limits');
});

check('C2  the Auxiliary Bus Disconnect is NOT a limit here, though it WAS one for Example 1 ' +
      '(same circuit, one page apart: this is the pair that makes the fixture)', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex2-a10-test-clearance'];
  const t = applyClearance(clone(TOPOLOGIES['bpa-x2-ex1']), 'x2-ex1-line-work-clearance');
  const { limits } = E.clearanceLimits(t, ans.workItem);
  return limits.indexOf('a10_aux_bus_disc') === -1 || 'aux bus disconnect reported as a limit for the PCB clearance';
});

check('C3  🔑 THE PREDICTION. Example 1 OPENS the Line Side Disconnect. Example 2, written for the ' +
      'time "the line is out of service on a Work Clearance", CHECKS IT OPEN. Run Example 1, keep ' +
      'the state it leaves, ask Example 2, and BPA\'s second verb falls out.', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex2-a10-test-clearance'];
  const t = applyClearance(clone(TOPOLOGIES['bpa-x2-ex1']), 'x2-ex1-line-work-clearance');
  const { limits } = E.clearanceLimits(t, ans.workItem);
  for (const id of limits) {
    const got = E.tagAction(t.devices.find((d) => d.id === id));
    if (got !== ans.actions[id]) return id + ': expected "' + ans.actions[id] + '" got "' + got + '"';
  }
  return true;
});

check('C4  the SAME verb is NOT produced from the initial state: without Example 1 having run, the ' +
      'Line Side Disconnect is closed and BPA\'s Example 2 wording would not reproduce ' +
      '(proves C3 measures the state carryover and not a constant)', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex2-a10-test-clearance'];
  const t = clone(TOPOLOGIES['bpa-x2-ex1']);   // NOT preceded by Example 1
  const got = E.tagAction(t.devices.find((d) => d.id === 'a10_line_side_disc'));
  return got === 'open and tag' ||
    'expected the un-preceded state to give "open and tag", got "' + got + '" (C3 may be vacuous)';
});

check('C5  limits are TOPOLOGICAL, not stateful: the Line Side Disconnect is ALREADY OPEN in ' +
      'Example 2 and is still a published limit. The tag is the point, not the opening.', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex2-a10-test-clearance'];
  const t = applyClearance(clone(TOPOLOGIES['bpa-x2-ex1']), 'x2-ex1-line-work-clearance');
  const lsd = t.devices.find((d) => d.id === 'a10_line_side_disc');
  if (lsd.state !== 'open') return 'fixture wrong: LSD should be open after Example 1';
  const { limits } = E.clearanceLimits(t, ans.workItem);
  return limits.indexOf('a10_line_side_disc') !== -1 ||
    'an already-open device was dropped from the limits; BPA publishes it as one';
});

check('C6  NO breaker is opened in Example 2, because BPA says A-10 "is already open and on Local ' +
      'control". An already-open limit is CHECKED open, not operated, so it drags no breaker in ' +
      'with it.', () => {
  // WHY THIS CHECK EXISTS: mutation testing found that treating already-open limits as operations
  // survived. It survived because Example 1's already-open limit (the Auxiliary Bus Disconnect)
  // sits on a leaf node with nothing beyond it, so the extra walk found no breaker. Example 2's
  // already-open limit is the Line Side Disconnect, and beyond IT lies the whole line and A-3. So
  // this is the fixture that can see the difference, and BPA publishes the answer: nothing.
  const ans = PUBLISHED_ANSWERS['x2-ex2-a10-test-clearance'];
  const t = applyClearance(clone(TOPOLOGIES['bpa-x2-ex1']), 'x2-ex1-line-work-clearance');
  const got = E.pcbsToCheckOpen(t, ans.workItem);
  return eq(got, ans.pcbsCheckedOpen, 'PCBs to check open for Example 2');
});

// =============================================================================================
console.log('D. BPA X.3 Example 1, P-52: the bypass. 01\'s one way bus tie bug, published as a figure.');
// =============================================================================================

check('D1  limits reproduce BPA\'s published two: "the open hot-stick operated Bus Disconnect and ' +
      'Feeder Disconnect"', () => {
  const ans = PUBLISHED_ANSWERS['x3-ex1-pcb-dispatcher-tag'];
  const { limits } = E.clearanceLimits(clone(TOPOLOGIES['bpa-x3-ex1']), ans.workItem);
  return eq(limits, ans.limits.slice().sort(), 'X.3 Ex 1 limits');
});

check('D2  both are "check open and tag": BPA calls them "the OPEN hot-stick operated" disconnects', () => {
  const t = clone(TOPOLOGIES['bpa-x3-ex1']);
  const ans = PUBLISHED_ANSWERS['x3-ex1-pcb-dispatcher-tag'];
  const { limits } = E.clearanceLimits(t, ans.workItem);
  for (const id of limits) {
    const got = E.tagAction(t.devices.find((d) => d.id === id));
    if (got !== ans.actions[id]) return id + ': expected "' + ans.actions[id] + '" got "' + got + '"';
  }
  return true;
});

check('D3  the Bypass Disconnect is not itself a limit: it touches neither terminal of the PCB', () => {
  const ans = PUBLISHED_ANSWERS['x3-ex1-pcb-dispatcher-tag'];
  const { limits } = E.clearanceLimits(clone(TOPOLOGIES['bpa-x3-ex1']), ans.workItem);
  return limits.indexOf('bypass_disc') === -1 || 'the bypass was reported as a limit';
});

check('D4  🔴 THE BYPASS IS LOAD BEARING FOR BPA\'S PUBLISHED ANSWER. Delete the bypass edge and ' +
      'the feeder side of the breaker reaches no source, so the Feeder Disconnect stops being a ' +
      'limit and BPA\'s answer stops reproducing. This is why the search is undirected.', () => {
  const t = clone(TOPOLOGIES['bpa-x3-ex1']);
  t.devices = t.devices.filter((d) => d.id !== 'bypass_disc');
  const ans = PUBLISHED_ANSWERS['x3-ex1-pcb-dispatcher-tag'];
  const { limits } = E.clearanceLimits(t, ans.workItem);
  if (limits.indexOf('feeder_disc') !== -1) {
    return 'removing the bypass changed nothing: the fixture does not measure what it claims';
  }
  return eq(limits, ['bus_disc'], 'limits without the bypass');
});

check('D5  the feeder is STILL ENERGIZED with the breaker open between its own two open ' +
      'disconnects, because the bypass carries it around the outside', () => {
  const t = clone(TOPOLOGIES['bpa-x3-ex1']);
  if (!E.energized(t, 'feeder_node')) return 'the feeder came out dead; the bypass is closed';
  if (E.energized(t, 'pcb_feeder_terminal')) return 'the isolated breaker terminal came out live';
  return true;
});

check('D6  open the bypass and the feeder goes dead: D5 measures the bypass and not a constant', () => {
  const t = clone(TOPOLOGIES['bpa-x3-ex1']);
  t.devices.find((d) => d.id === 'bypass_disc').state = 'open';
  return E.energized(t, 'feeder_node') === false ||
    'the feeder stayed live with the bypass open; D5 is vacuous';
});

// =============================================================================================
console.log('E. The rule. BPA S-6 IV.4.C, P-8: "PCB(s) shall be checked open before operating ' +
            'isolating devices."');
// =============================================================================================

check('E1  the emitted sequence for Example 1 honours IV.4.C', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const seq = E.emitSequence(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  const r = E.checkRuleIV4C(seq);
  return r.ok || 'IV.4.C violated: ' + r.violations.join('; ');
});

check('E2  BPA\'s own example obeys BPA\'s own rule: the breakers come first, the disconnects after ' +
      '("de-energize ... by opening PCBs A-10 and A-3 by supervisory control" and only THEN ' +
      '"open or check open and tag the appropriate disconnect switches")', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const seq = E.emitSequence(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  const lastPcb = seq.steps.map((s) => s.kind).lastIndexOf('pcb');
  const firstOperated = seq.steps.findIndex((s) => s.kind === 'isolating' && s.op === 'open and tag');
  if (lastPcb === -1) return 'no breaker steps emitted at all';
  if (firstOperated === -1) return 'no disconnect is operated; the rule is not engaged';
  return lastPcb < firstOperated ||
    'a breaker is checked open at step ' + (lastPcb + 1) + ', after a disconnect is operated at step ' +
    (firstOperated + 1);
});

check('E3  the checker can FAIL: reverse the sequence and IV.4.C is violated ' +
      '(a green gate proves nothing until it has been watched going red)', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const seq = E.emitSequence(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  seq.steps.reverse();
  const r = E.checkRuleIV4C(seq);
  return r.ok === false || 'the rule checker passed a sequence that operates a disconnect before ' +
    'the breaker is checked open. It is not measuring anything.';
});

check('E5  CHECKING a disconnect open is not OPERATING one, so it does not engage the rule. The rule ' +
      'says "before OPERATING isolating devices", and BPA\'s own Example 1 has the Switchman ' +
      '"open OR CHECK OPEN and tag the appropriate disconnect switches" as two different acts.', () => {
  // WHY THIS CHECK EXISTS: mutation testing found that counting a check-open as an operation
  // survived, because emitSequence always puts the breakers first, so no emitted sequence can tell
  // the two readings apart. The distinction is real and it is BPA's own word ("operating"), so the
  // fixture is built by hand rather than emitted.
  const seq = {
    steps: [
      { kind: 'isolating', op: 'check open and tag', device: 'a disconnect already open' },
      { kind: 'pcb', op: 'check open', device: 'a breaker' },
      { kind: 'isolating', op: 'open and tag', device: 'a disconnect being operated' },
    ],
  };
  const r = E.checkRuleIV4C(seq);
  return r.ok || 'the rule fired on a sequence that checks a disconnect open before the breaker. ' +
    'Checking open is not operating: BPA\'s rule says "before operating isolating devices". ' +
    'Violations reported: ' + r.violations.join('; ');
});

check('E6  and that reading is not a loophole: move the breaker AFTER the disconnect that is ' +
      'actually operated and the rule still fires', () => {
  const seq = {
    steps: [
      { kind: 'isolating', op: 'check open and tag', device: 'a disconnect already open' },
      { kind: 'isolating', op: 'open and tag', device: 'a disconnect being operated' },
      { kind: 'pcb', op: 'check open', device: 'a breaker' },
    ],
  };
  return E.checkRuleIV4C(seq).ok === false ||
    'the rule passed a sequence operating a disconnect before the breaker was checked open';
});

check('E4  the grounding order is attributed to OSHA and NOT to BPA ' +
      '(BPA S-6 VI.8 defers portable grounding to a separate manual that was never fetched)', () => {
  return /1910\.269/.test(E.RULE_GROUNDING.id) && /govinfo/.test(E.RULE_GROUNDING.cite) ||
    'the grounding rule must name its own publisher';
});

// =============================================================================================
console.log('F. The refusals. What the tool declines to claim. These break no calculation.');
// =============================================================================================
//
// 🔴 WHY SECTION F EXISTS, copied in shape from 03. This repo's product is what its tools decline to
// claim, and until 03 that refusal lived only in prose, where nothing stops the next session undoing
// it in good faith. The concrete danger here: a future session reads "BPA publishes a worked example"
// and ships a generated step list labelled as BPA's switching order. No ordinary test looks for that,
// because nothing is broken. The mutants for this section change no number and only make the tool
// claim more than its sources do.

check('F1  the emitted sequence declares itself generated and declares no step list is published', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const seq = E.emitSequence(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  return (seq.generated === true && seq.publishedStepList === false) ||
    'a generated sequence must say so in the object, not only in a comment';
});

check('F2  the disclaimer states the specific negative finding, not a vague hedge', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const seq = E.emitSequence(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  return /does not publish a filled in Switching Order/.test(seq.disclaimer) || 'disclaimer too vague';
});

// 🔴 F3 AND F4 READ THE SHIPPED STRINGS, NOT THE COMMENTS, AND THE REASON IS A FALSE POSITIVE THIS
// SUITE ALREADY PRODUCED. F4 first fired on engine.js's own comment explaining that BPA does NOT
// publish the rule's rationale. A disavowal has to quote the thing it disavows, so scanning comments
// makes the honest note indistinguishable from the dishonest claim.
//
// The scoping is principled rather than convenient: a SHIPPED STRING reaches a reader and can
// mislead one. A comment reaches the next session, where the surrounding paragraph is right there.
// The refusal these checks defend is about what the TOOL says, so they read what the tool says.
//
// ⚠ THE TEMPTING FIX WAS TO REWORD THE COMMENT UNTIL THE REGEX WENT QUIET. That is gaming your own
// checker: the sentence would have been just as attributive and the check just as blind. Both of
// these are mutation tested in mutants.txt, in the direction that matters: an attribution planted in
// a shipped string must go RED. A checker that cannot fire is worse than no checker.
function shippedStrings(txt) {
  return txt
    .replace(/\/\*[\s\S]*?\*\//g, ' ')     // block comments
    .replace(/^\s*\/\/.*$/gm, ' ')          // whole-line comments
    .replace(/([^:])\/\/.*$/gm, '$1');      // trailing comments, leaving http:// alone
}

check('F3  🔴 NO SHIPPED STRING IN THE BUILD ATTRIBUTES A SWITCHING ORDER OR A STEP LIST TO BPA', () => {
  const dir = path.join(__dirname, '..', 'build');
  const bad = [
    /BPA'?s\s+(own\s+)?switching\s+order/i,
    /switching\s+order\s+(published|from)\s+by?\s*BPA/i,
    /BPA\s+publishes\s+(a|the)\s+(step|switching\s+order)/i,
    /as\s+published\s+by\s+BPA/i,
  ];
  for (const f of fs.readdirSync(dir)) {
    const txt = shippedStrings(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const re of bad) {
      const m = txt.match(re);
      if (m) return f + ' attributes a sequence to BPA: "' + m[0] + '"';
    }
  }
  return true;
});

check('F4  🔴 THE BUILD DOES NOT PUBLISH IV.4.C\'S RATIONALE IN BPA\'S VOICE. BPA states the order ' +
      'and never says why: 86 pages searched for "load break", "under load", "interrupt", ' +
      '"load current". Naming a Load-Break Disconnect as a class is evidence, not a statement.', () => {
  const dir = path.join(__dirname, '..', 'build');
  // The failure is an ATTRIBUTION, not the words themselves. "BPA says a disconnect has no
  // interrupting rating" is the sentence that must never ship. The same words are legitimate when
  // saying BPA does NOT say them, which is why this reads shipped strings and not comments.
  const bad = /(BPA|S-6|the (rule|document|source))[^.]{0,60}(says|states|explains|because)[^.]{0,90}(interrupting rating|arcs? under load|cannot interrupt|no load[- ]break)/i;
  for (const f of fs.readdirSync(dir)) {
    const txt = shippedStrings(fs.readFileSync(path.join(dir, f), 'utf8'));
    const m = txt.match(bad);
    if (m) return f + ' attributes the rationale to the source: "' + m[0] + '"';
  }
  return true;
});

check('F5  🔴 THE ENGINE REFUSES TO ASSUME A BREAKER CAN INTERRUPT. A PCB with no published ' +
      'line-drop capability THROWS rather than being quietly opened ' +
      '(BPA X.5 Ex 2, P-54: a PCB "inadequate for line-dropping")', () => {
  const t = clone(TOPOLOGIES['bpa-x2-ex1']);
  t.devices.find((d) => d.id === 'a10_pcb').lineDropCapable = null;   // capability now unpublished
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  try {
    E.pcbsToCheckOpen(t, ans.workItem);
    return 'the engine opened a breaker whose interrupting capability no source publishes';
  } catch (e) {
    return /inadequate for line-dropping/.test(e.message) ||
      'it threw, but not about the published counterexample: ' + e.message;
  }
});

check('F6  that refusal is not blanket: a PCB whose capability BPA DOES publish is opened normally ' +
      '(a tool that refuses everything has not made a judgement)', () => {
  const ans = PUBLISHED_ANSWERS['x2-ex1-line-work-clearance'];
  const got = E.pcbsToCheckOpen(clone(TOPOLOGIES['bpa-x2-ex1']), ans.workItem);
  return got.length === 2 || 'expected A-10 and A-3 to be opened on BPA\'s published say-so';
});

check('F7  the X.3 breaker\'s capability is null, not true: BPA never says the oil-recloser can ' +
      'drop that feeder', () => {
  const pcb = TOPOLOGIES['bpa-x3-ex1'].devices.find((d) => d.id === 'x3_pcb');
  return pcb.lineDropCapable === null ||
    'an unpublished capability was asserted as ' + JSON.stringify(pcb.lineDropCapable);
});

check('F8  every refusal names the source line that makes it a refusal and not a missing feature', () => {
  for (const r of E.REFUSALS) {
    if (!r.because || r.because.length < 40) return r.id + ' has no stated source';
  }
  return E.REFUSALS.length >= 4 || 'expected the four refusals this project committed to';
});

check('F9  Example 5 is NOT encoded, and the reason is recorded in the build rather than dropped ' +
      '(its answer is published; its mechanism is not, and picking a model that makes the answer ' +
      'come out is an answer key grading itself)', () => {
  const txt = fs.readFileSync(path.join(__dirname, '..', 'build', 'topology.js'), 'utf8');
  if (Object.keys(PUBLISHED_ANSWERS).some((k) => /ex5|acb/i.test(k))) {
    return 'Example 5 is encoded; if its mechanism was resolved, this check should be replaced';
  }
  return /ACB-1/.test(txt) && /alternate/i.test(txt) ||
    'the Example 5 decision must stay written down where the next session will read it';
});

// =============================================================================================

console.log('');
if (failures.length) {
  console.log(passed + ' passed, ' + failures.length + ' FAILED\n');
  for (const f of failures) console.log('  FAIL  ' + f);
  console.log('');
  process.exit(1);
}
console.log(passed + ' checks passed, 0 failures.');
console.log('Reproduces three published answers from two traced figures: X.2 Ex 1 (P-45), X.2 Ex 2');
console.log('(P-47) on the same figure with a different answer, and X.3 Ex 1 (P-52) with the bypass.');
console.log('');
