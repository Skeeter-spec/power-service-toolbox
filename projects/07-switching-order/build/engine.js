// 07 Switching order and LOTO planner. Engine.
//
// WHAT THIS COMPUTES, AND WHY IT IS NOT WHAT THE PROJECT ORIGINALLY WENT LOOKING FOR.
//
// The search was for a published switching order: a numbered list, step 1 open this, step 2 check
// that. Encode the circuit, generate the list, diff it against BPA's. That is how 02 works: 210
// published numbers, reproduce all 210.
//
// THERE IS NO SUCH LIST. Not in BPA S-6's 86 pages, not in Reclamation FIST 1-1 or 1-2, which
// reference a Switching Procedure Form carrying the device sequence and only ever print it blank.
// Nobody publishes a filled in switching order, because a switching order is written for one circuit
// on one day by the Switchman standing in front of it. That was checked twice and is still true.
//
// 🔑 BUT THE ABSENCE WAS RECORDED POINTING THE WRONG WAY. It was written down as "the most important
// gap, it shapes the whole verify phase", which treated the missing step list as the binding
// constraint. It is not. BPA DOES NOT PRINT THE STEPS. IT PRINTS THE LIMITS OF A CLEARANCE, on named
// devices, in at least eight worked examples. And the limits are the harder half: the steps are local
// and situational, the limits are a property of the circuit and the job, and they are the thing you
// get wrong and die.
//
// So this engine computes LIMITS and reproduces BPA's published ones. It also emits a sequence, and
// asserts BPA's ordering rule against it, but it never claims that sequence is BPA's. See REFUSALS.

'use strict';

// =============================================================================================
// THE RULE. BPA S-6 section IV.4.C, page label P-8, PDF page 12, verbatim:
//
//   "Each power circuit breaker to be operated or checked shall be identified by its designated
//    System Operations number and name.
//    PCB(s) shall be checked open before operating isolating devices."
//
// A flat imperative. No arithmetic, no tolerance, no convention: a sequence either honours it or it
// does not. That is what makes it a gate a program can check.
//
// ⚠ THE RULE'S RATIONALE IS NOT PUBLISHED, AND THIS FILE DOES NOT INVENT ONE. It would be natural to
// write that the rule exists because a disconnect has no interrupting rating and arcs when opened
// under load. BPA NEVER SAYS THAT. All 86 pages were searched for "load break", "under load",
// "interrupt" and "load current": the rule is stated bare. What the document does instead is name a
// "Load-Break Disconnect (LBD)" as its own device class (P-54), distinct from both the PCB and the
// ordinary isolating device. That distinction is EVIDENCE, and it is not a STATEMENT, and those are
// different objects. This repo ships the second.
// =============================================================================================

const RULE_IV_4_C = {
  id: 'IV.4.C',
  cite: 'BPA S-6, section IV.4.C, page label P-8 (PDF p.12)',
  text: 'PCB(s) shall be checked open before operating isolating devices.',
};

// 29 CFR 1910.269(n)(6), read at govinfo.gov. A second checkable rule from a second public domain
// publisher. The regulation states BOTH halves rather than saying "reverse", so both are asserted
// rather than inferred.
const RULE_GROUNDING = {
  id: '29 CFR 1910.269(n)(6)',
  cite: '29 CFR 1910.269(n)(6)(i) and (ii), 2024 edition, read at govinfo.gov',
  attach: 'attaches the ground-end connection first and then attaches the other end',
  remove: 'removes the grounding device from the line or equipment ... before he or she removes the ground-end connection',
  // ⚠ DO NOT ATTRIBUTE THIS TO BPA. BPA S-6 section VI.8 defers its portable grounding rules to a
  // separate BPA Accident Prevention Manual (G-1, G-7) which was never fetched. This order comes
  // from OSHA, a different organisation.
};

// =============================================================================================
// GRAPH PRIMITIVES. The traversal is UNDIRECTED, and that is a decision with a bug behind it.
//
// 01 encoded a bus tie one way, so one side could never back feed the other. Mutation testing found
// it. A tie that conducts one way is not a tie. BPA then publishes the same shape as a FIGURE, in
// X.3 Example 1: a bypass disconnect in parallel with a breaker and both its disconnects, where
// opening the breaker leaves the feeder energized from the outside. Electricity does not care which
// way the drawing was typed in.
// =============================================================================================

function deviceEndpoints(device) { return device.between; }

function otherEnd(device, nodeId) {
  const [a, b] = device.between;
  if (a === nodeId) return b;
  if (b === nodeId) return a;
  return null;
}

function devicesAt(topo, nodeId) {
  return topo.devices.filter((d) => d.between.indexOf(nodeId) !== -1);
}

// Kinds a clearance ZONE grows through. A PCB is NOT an isolating device: BPA opens breakers to
// de-energize and then still requires disconnects to be opened and tagged as the limits. So the zone
// crosses a breaker and stops at a disconnect. That single line is most of the domain.
const ZONE_TRAVERSABLE = ['pcb', 'fixed'];

// =============================================================================================
// clearanceZone: the electrically continuous region the work sits in.
// =============================================================================================

function clearanceZone(topo, workItem) {
  const seed = [];
  if (workItem.type === 'node') {
    seed.push(workItem.id);
  } else if (workItem.type === 'device') {
    const dev = topo.devices.find((d) => d.id === workItem.id);
    if (!dev) throw new Error('unknown device: ' + workItem.id);
    seed.push(dev.between[0], dev.between[1]);
  } else {
    throw new Error('workItem.type must be "node" or "device"');
  }

  const zone = new Set(seed);
  const queue = seed.slice();
  while (queue.length) {
    const n = queue.shift();
    for (const d of devicesAt(topo, n)) {
      if (ZONE_TRAVERSABLE.indexOf(d.kind) === -1) continue;
      const far = otherEnd(d, n);
      if (far && !zone.has(far)) { zone.add(far); queue.push(far); }
    }
  }
  return zone;
}

// =============================================================================================
// clearanceLimits: the isolating devices that stand between the work and every source.
//
// 🔴 THE LIMITS ARE TOPOLOGICAL, NOT STATEFUL, AND BPA'S OWN EXAMPLES PROVE IT TWICE.
// It is tempting to compute limits against the CURRENT state: only count a device if something is
// live through it right now. That is wrong, and BPA publishes the counterexamples:
//
//   - X.2 Example 2 (P-47): the A-10 Line Side Disconnect is ALREADY OPEN, because Example 1 opened
//     it. It is still a limit. BPA's verb is "check open and tag".
//   - X.2 Example 5 (P-51): ACB-1 is described in BPA's own words as "the open low voltage isolating
//     device", and a Do Not Operate tag "shall also be placed on" it "as a Clearance limit".
//
// A limit is not about what IS energizing the zone. It is about what COULD. The tag is the point, not
// the opening. So the source search below treats every isolating device outside the zone as though it
// were closed: the question is "could this device connect the zone to a source", not "does it".
//
// Getting this wrong is not academic. Compute limits against the live state and Example 2's answer
// collapses to a single device, because with the Auxiliary Bus Disconnect already open the line node
// reaches nothing. BPA says two.
// =============================================================================================

function reachesSourceAvoidingZone(topo, startNode, zone) {
  const seen = new Set([startNode]);
  const queue = [startNode];
  while (queue.length) {
    const n = queue.shift();
    const node = topo.nodes[n];
    if (!node) throw new Error('unknown node: ' + n);
    if (node.source) return true;
    for (const d of devicesAt(topo, n)) {
      // A ground switch leads to the ground grid, which is not a source. Never a limit.
      if (d.kind === 'ground') continue;
      const far = otherEnd(d, n);
      // Never re-enter the zone: a path back through the work is not an energization path to it.
      if (!far || zone.has(far) || seen.has(far)) continue;
      seen.add(far); queue.push(far);
    }
  }
  return false;
}

function clearanceLimits(topo, workItem) {
  const zone = clearanceZone(topo, workItem);
  const limits = [];
  for (const d of topo.devices) {
    if (d.kind !== 'isolating') continue;
    const [a, b] = d.between;
    const aIn = zone.has(a);
    const bIn = zone.has(b);
    if (aIn === bIn) continue;              // both in, or both out: not on the boundary
    const far = aIn ? b : a;
    if (reachesSourceAvoidingZone(topo, far, zone)) limits.push(d.id);
  }
  return { zone: Array.from(zone), limits: limits.sort() };
}

// =============================================================================================
// energized: state-dependent reachability. SEPARATE from limits on purpose.
//
// Limits answer "what must be tagged" and are topological. THIS answers "what is live right now" and
// is stateful. Conflating them is the bug described above. This is the function that shows the X.3
// feeder still sitting energized through a closed bypass while the breaker between its own two open
// disconnects is dead.
// =============================================================================================

function energized(topo, nodeId) {
  const seen = new Set([nodeId]);
  const queue = [nodeId];
  while (queue.length) {
    const n = queue.shift();
    if (topo.nodes[n] && topo.nodes[n].source) return true;
    for (const d of devicesAt(topo, n)) {
      if (d.state !== 'closed') continue;   // an open device conducts nothing
      const far = otherEnd(d, n);
      if (!far || seen.has(far)) continue;
      seen.add(far); queue.push(far);
    }
  }
  return false;
}

// =============================================================================================
// tagAction: BPA's own verb, derived from the device's state.
//
// "check open and tag" for a device already open. "open and tag" for one that is closed. This is not
// a style choice, it is transcribed from the examples, and it is where the model earns its keep:
// Example 1 OPENS the Line Side Disconnect, and Example 2, one page later, CHECKS IT OPEN. Run the
// examples in the order BPA wrote them and the second verb falls out of the first example's actions.
// =============================================================================================

function tagAction(device) {
  return device.state === 'open' ? 'check open and tag' : 'open and tag';
}

// =============================================================================================
// pcbsToCheckOpen: which breakers rule IV.4.C forces open before any disconnect is operated.
//
// A disconnect that is already open is never OPERATED: it is checked open and tagged. So it does not
// trigger the rule. Only a CLOSED limit has to be opened, and before it is, the breakers that can
// interrupt what is flowing through it must be checked open.
//
// 🔴 THE ENGINE THROWS ON A BREAKER WHOSE INTERRUPTING CAPABILITY IS NOT PUBLISHED, RATHER THAN
// ASSUMING IT. BPA X.5 Example 2 (P-54) documents a PCB "determined to be inadequate for
// line-dropping", with the protective relay schemes "modified to prevent this PCB from being the last
// one to open by relay operation". So "every breaker can interrupt what flows through it" is an
// assumption this very source contradicts in a named bay. A tool that prints "open the PCB" is making
// it silently. This one refuses, the way 03's engine throws without a named vendor profile: the
// refusal as a type error rather than a paragraph nobody reads.
// =============================================================================================

function pcbsToCheckOpen(topo, workItem) {
  const { zone, limits } = clearanceLimits(topo, workItem);
  const zoneSet = new Set(zone);
  const out = [];

  for (const limitId of limits) {
    const limit = topo.devices.find((d) => d.id === limitId);
    if (limit.state === 'open') continue;   // checked open, not operated: the rule is not engaged

    // Walk outward from the limit's far side and collect the breakers in series with it.
    const far = zoneSet.has(limit.between[0]) ? limit.between[1] : limit.between[0];
    const seen = new Set([far]);
    const queue = [far];
    while (queue.length) {
      const n = queue.shift();
      for (const d of devicesAt(topo, n)) {
        if (d.kind === 'ground') continue;
        const nxt = otherEnd(d, n);
        if (!nxt || zoneSet.has(nxt) || seen.has(nxt)) continue;
        if (d.kind === 'pcb') {
          if (d.lineDropCapable !== true) {
            throw new Error(
              'REFUSED: ' + d.label + ' would have to interrupt load for ' + limit.label +
              ' to be opened, and no source read by this project publishes that it can. BPA S-6 X.5 ' +
              'Example 2 (P-54) documents a PCB "inadequate for line-dropping", so this tool does not ' +
              'assume a breaker can drop what flows through it. Name the capability, with a citation, ' +
              'or route the clearance another way.'
            );
          }
          if (out.indexOf(d.id) === -1) out.push(d.id);
        }
        seen.add(nxt); queue.push(nxt);
      }
    }
  }
  return out.sort();
}

// =============================================================================================
// emitSequence + checkRuleIV4C.
//
// 🔴 REFUSAL, AND IT IS THE MOST IMPORTANT ONE IN THE FILE. THE SEQUENCE BELOW IS NOT BPA'S.
// No step list is published anywhere in S-6. This one is generated by this tool, from the rule and
// the state, and every object it emits carries `generated: true` and `publishedStepList: false` so
// that the claim cannot be quietly lost on the way to a screen. verify.js asserts the flags AND greps
// the whole build for any sentence attributing a sequence to BPA.
//
// This is not defensive writing. It is the specific thing a future session will get wrong in good
// faith, the way 03's superseded ASCO parallel-time slider was one honest reading away from shipping.
// =============================================================================================

function emitSequence(topo, workItem) {
  const { limits } = clearanceLimits(topo, workItem);
  const steps = [];

  for (const pcbId of pcbsToCheckOpen(topo, workItem)) {
    const pcb = topo.devices.find((d) => d.id === pcbId);
    steps.push({
      op: 'check open', deviceId: pcb.id, device: pcb.label, kind: 'pcb',
      why: RULE_IV_4_C.text, cite: RULE_IV_4_C.cite,
    });
  }
  for (const limitId of limits) {
    const d = topo.devices.find((x) => x.id === limitId);
    steps.push({
      op: tagAction(d), deviceId: d.id, device: d.label, kind: 'isolating', isLimit: true,
    });
  }

  return {
    steps,
    generated: true,
    publishedStepList: false,
    disclaimer:
      'This sequence was generated by this tool. BPA S-6 does not publish a filled in Switching ' +
      'Order anywhere in its 86 pages, and neither does Reclamation FIST 1-1 or 1-2. What BPA ' +
      'publishes is the LIMITS of a clearance, and those are what this project reproduces. Nothing ' +
      'here is a switching order, and nothing here is a substitute for a Dispatcher.',
  };
}

// The gate. Every PCB check-open step must precede every isolating-device operation.
function checkRuleIV4C(sequence) {
  const steps = sequence.steps;
  const firstIsolatingOp = steps.findIndex((s) => s.kind === 'isolating' && s.op !== 'check open and tag');
  const violations = [];
  if (firstIsolatingOp !== -1) {
    for (let i = firstIsolatingOp + 1; i < steps.length; i++) {
      if (steps[i].kind === 'pcb' && steps[i].op === 'check open') {
        violations.push(
          steps[i].device + ' is checked open at step ' + (i + 1) + ', after ' +
          steps[firstIsolatingOp].device + ' is operated at step ' + (firstIsolatingOp + 1) + '.'
        );
      }
    }
  }
  return { ok: violations.length === 0, violations, rule: RULE_IV_4_C };
}

// =============================================================================================
// REFUSALS. What this tool declines to do, and the source line that makes each a refusal rather
// than a missing feature. verify.js has a section asserting every one of them, with mutants that
// break NO calculation and only make the tool claim more than its sources do.
// =============================================================================================

const REFUSALS = [
  {
    id: 'no-published-step-list',
    refuses: 'presenting any generated sequence as BPA\'s switching order',
    because: 'BPA S-6 publishes no filled in Switching Order in 86 pages. Reclamation FIST 1-1 and ' +
             '1-2 reference a Switching Procedure Form and only ever show it blank.',
  },
  {
    id: 'no-rule-rationale',
    refuses: 'explaining why IV.4.C exists, in BPA\'s voice',
    because: 'IV.4.C states the order and gives no reason. All 86 pages searched for "load break", ' +
             '"under load", "interrupt", "load current": the rule is bare. BPA naming a ' +
             '"Load-Break Disconnect" as its own class (P-54) is evidence, not a statement.',
  },
  {
    id: 'no-assumed-interrupting-capability',
    refuses: 'assuming a PCB can interrupt what flows through it',
    because: 'BPA X.5 Example 2 (P-54) documents a PCB "determined to be inadequate for ' +
             'line-dropping" with the relaying modified so it is never the last to open.',
  },
  {
    id: 'not-a-field-tool',
    refuses: 'being used in the field',
    because: 'A clearance is a human procedure with a Dispatcher on the other end of it. This is a ' +
             'study model of two published figures.',
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RULE_IV_4_C, RULE_GROUNDING, REFUSALS,
    clearanceZone, clearanceLimits, reachesSourceAvoidingZone, energized,
    tagAction, pcbsToCheckOpen, emitSequence, checkRuleIV4C,
  };
}
