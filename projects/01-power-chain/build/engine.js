/*
 * Power chain engine. Single component removal analysis over a one line diagram.
 *
 * Educational. Not for field use. This reproduces published worked examples so they can be
 * explored. It is not an engineered study and it does not classify anyone's site.
 *
 * WHAT THIS COMPUTES, AND WHAT IT DELIBERATELY DOES NOT
 *
 * Computes: given a one line drawn as a directed graph, which single components, if removed,
 * drop a load or force it onto unprotected power. That is a question a one line actually answers.
 *
 * Does NOT compute: a tier. A tier is awarded by the Uptime Institute against their Tier Standard:
 * Topology, which is a gated document, and it covers things a one line does not show at all
 * (compartmentalization, continuous cooling, the rest). Note also that Uptime's own public pages
 * never use the words N, N+1, or 2N. That vocabulary is industry convention mapped onto their
 * tiers, not their definition. So this file will not print a tier and calling it a tier classifier
 * would be a lie. See ../sources/SOURCES.md.
 *
 * THE DEFINITION USED FOR "CONCURRENTLY MAINTAINABLE"
 *
 * Taken from the paper this project verifies against, Schneider WP75 Rev 4 p.3, which defines
 * concurrent maintenance as the ability to shut down any component for maintenance "without
 * requiring that the load be transferred to the utility source."
 *
 * Note the second half. It is not enough for the load to stay lit. If the only way to keep it lit
 * is to close a maintenance bypass, the load is now sitting on raw utility, and WP75 counts that
 * as a failure of concurrent maintenance, not a pass. So this engine tracks two different things:
 * whether a load is FED, and whether it is fed on PROTECTED power (a path through a UPS).
 *
 * EVERYTHING HERE IS A PLANNED MAINTENANCE ANALYSIS. THAT IS DELIBERATE.
 *
 * A maintenance bypass and a bus tie are drawn dashed, meaning normally open. This engine treats
 * them as closeable, because an operator closes them as part of a planned procedure. So every
 * answer below is of the form "can this component be taken out on purpose", never "what happens
 * when this component fails at 3am".
 *
 * There WAS an unplanned fault analysis here. It was cut, and the reason is worth writing down:
 *   1. Nothing in WP75 states a claim about single unplanned failures that this model could be
 *      checked against. Unverifiable code does not ship in this repo, however plausible it looks.
 *   2. It would have been wrong anyway. A real UPS has an INTERNAL STATIC BYPASS that transfers
 *      the load automatically, in milliseconds, with no operator (WP75 p.5). These figures do not
 *      draw it, so the model does not have it, so any fault verdict it produced would have been
 *      pessimistic in a way that looks authoritative. A confident wrong answer is the failure mode
 *      this whole repo exists to avoid.
 * It came out because a mutation test caught it: breaking the normally-open logic on purpose
 * changed no test result, which is how you find out that a feature is decorative.
 *
 * LIMITS, STATED PLAINLY
 *
 * - Topology only. Capacity is not modeled. The engine asks whether a path exists, not whether the
 *   surviving equipment is big enough to carry the load through that path. A design can pass this
 *   and still be undersized. Fixing that means a flow model, which is a real piece of work and is
 *   honestly not done yet.
 * - Single removals only. No N-2, no common cause, no "failure during maintenance".
 * - Planned maintenance only. See above.
 * - No protection coordination, no fault current, no arc flash. Never will be. See the repo README.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PowerChain = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SOURCE_TYPES = { utility: true, generator: true };

  function nodeMap(topo) {
    var m = {};
    topo.nodes.forEach(function (n) { m[n.id] = n; });
    return m;
  }

  function adjacency(topo) {
    var adj = {};
    topo.nodes.forEach(function (n) { adj[n.id] = []; });
    topo.edges.forEach(function (e) {
      if (!adj[e.from]) throw new Error('edge from unknown node: ' + e.from);
      if (!adj[e.to]) throw new Error('edge to unknown node: ' + e.to);
      adj[e.from].push(e.to);
      // A bus tie carries power either way. Model it as bidirectional so the analysis
      // does not depend on which side of the tie the author happened to draw first.
      if (e.bidirectional) adj[e.to].push(e.from);
    });
    return adj;
  }

  /*
   * Nodes energized from any live source, given a set of removals.
   *
   * opts.removed          ids treated as absent, ie out of service for planned maintenance
   * opts.requireProtected   if true, bypass paths are cut, so what comes back is only
   *                         what is reachable on conditioned power through a UPS
   *
   * Normally open devices are traversable here. See the header: this is a planned maintenance
   * model, and closing the bypass or the tie is part of the procedure.
   */
  function energized(topo, opts) {
    opts = opts || {};
    var nodes = nodeMap(topo);
    var adj = adjacency(topo);
    var removed = {};
    (opts.removed || []).forEach(function (id) { removed[id] = true; });

    function usable(id) {
      var n = nodes[id];
      if (!n) return false;
      if (removed[id]) return false;
      if (opts.requireProtected && n.type === 'bypass') return false;
      return true;
    }

    var seen = {};
    var queue = [];
    topo.nodes.forEach(function (n) {
      if (SOURCE_TYPES[n.type] && usable(n.id)) { seen[n.id] = true; queue.push(n.id); }
    });

    while (queue.length) {
      var cur = queue.shift();
      adj[cur].forEach(function (next) {
        if (!seen[next] && usable(next)) { seen[next] = true; queue.push(next); }
      });
    }
    return seen;
  }

  function loadsOf(topo) {
    return topo.nodes.filter(function (n) { return n.type === 'load'; });
  }

  /* Everything that could be taken out of service. Loads are not components you maintain. */
  function componentsUnderTest(topo) {
    return topo.nodes.filter(function (n) { return n.type !== 'load'; });
  }

  /*
   * Remove one component and report what it costs.
   *   ok          every load still fed, all on protected power
   *   unprotected every load still fed, but at least one only via a bypass, ie on raw utility
   *   drop        at least one load unfed
   */
  function removeOne(topo, id) {
    var fed = energized(topo, { removed: [id] });
    var prot = energized(topo, { removed: [id], requireProtected: true });

    var dropped = [], unprotected = [];
    loadsOf(topo).forEach(function (l) {
      if (!fed[l.id]) dropped.push(l.id);
      else if (!prot[l.id]) unprotected.push(l.id);
    });

    return {
      component: id,
      verdict: dropped.length ? 'drop' : (unprotected.length ? 'unprotected' : 'ok'),
      droppedLoads: dropped,
      unprotectedLoads: unprotected
    };
  }

  /*
   * The sweep: take out each component in turn and see what it costs.
   * Concurrently maintainable, per WP75 p.3, means every single component can come out with
   * every load still up AND still on protected power.
   */
  function maintenanceAnalysis(topo) {
    var results = componentsUnderTest(topo).map(function (n) {
      return removeOne(topo, n.id);
    });
    return {
      results: results,
      dropSpofs: results.filter(function (r) { return r.verdict === 'drop'; })
        .map(function (r) { return r.component; }),
      forcesBypass: results.filter(function (r) { return r.verdict === 'unprotected'; })
        .map(function (r) { return r.component; }),
      concurrentlyMaintainable: results.every(function (r) { return r.verdict === 'ok'; })
    };
  }

  /* Which components are a single point of failure for one specific load. */
  function spofsForLoad(topo, loadId) {
    return componentsUnderTest(topo).filter(function (n) {
      var fed = energized(topo, { removed: [n.id] });
      return !fed[loadId];
    }).map(function (n) { return n.id; });
  }

  function analyze(topo) {
    validate(topo);
    var perLoad = {};
    loadsOf(topo).forEach(function (l) {
      perLoad[l.id] = { maintenanceSpofs: spofsForLoad(topo, l.id) };
    });
    return { topology: topo.id, maintenance: maintenanceAnalysis(topo), perLoad: perLoad };
  }

  /* Fail loudly on a malformed topology rather than quietly analyzing the wrong thing. */
  function validate(topo) {
    if (!topo || !topo.nodes || !topo.edges) throw new Error('topology needs nodes and edges');
    var seen = {};
    topo.nodes.forEach(function (n) {
      if (!n.id) throw new Error('node without an id');
      if (seen[n.id]) throw new Error('duplicate node id: ' + n.id);
      seen[n.id] = true;
    });
    topo.edges.forEach(function (e) {
      if (!seen[e.from]) throw new Error('edge from unknown node: ' + e.from);
      if (!seen[e.to]) throw new Error('edge to unknown node: ' + e.to);
    });
    if (!topo.nodes.some(function (n) { return SOURCE_TYPES[n.type]; }))
      throw new Error('topology has no source');
    if (!loadsOf(topo).length) throw new Error('topology has no load');
    return true;
  }

  /* How many separate cords a load is landed on. The single corded against dual corded question
   * is the one that decides most of these designs, so it is worth naming directly. */
  function cordCount(topo, loadId) {
    return topo.edges.filter(function (e) { return e.to === loadId; }).length;
  }

  return {
    analyze: analyze,
    energized: energized,
    removeOne: removeOne,
    maintenanceAnalysis: maintenanceAnalysis,
    spofsForLoad: spofsForLoad,
    cordCount: cordCount,
    loadsOf: loadsOf,
    componentsUnderTest: componentsUnderTest,
    validate: validate
  };
}));
