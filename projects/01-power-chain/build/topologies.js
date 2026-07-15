/*
 * The five UPS configurations published in Schneider Electric White Paper 75 Rev 4,
 * "Comparing UPS System Design Configurations," McCarthy and Avelar, copyright 2016
 * Schneider Electric. Free from the publisher:
 *   https://download.schneider-electric.com/files?p_Doc_Ref=SPD_SADE-5TPL8X_EN
 *
 * These are MY encodings of the topologies drawn in that paper, traced off Figures 1, 3, 5, 6,
 * and 7 at high magnification. The paper is cited, not copied: no text, table, or artwork from it
 * is reproduced here. What is encoded is the connectivity, which is a fact about a circuit.
 *
 * Tracing notes, because these are the details that decide the answer:
 *  - Solid lines are normal feeds. Dashed lines are alternate feeds and normally open devices.
 *    Getting that backwards inverts the result, so every dashed line was checked individually.
 *  - Breakers are drawn all over these figures. They are folded into the edges rather than made
 *    into nodes. That is a deliberate simplification: the claims WP75 states in words are about
 *    the named equipment and the buses, so those are what the model carries. A breaker level
 *    model would be a different and larger piece of work.
 *  - kW ratings are recorded because the paper gives them, but the engine does not use them.
 *    It is a topology model, not a flow model. See engine.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PowerChainTopologies = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function n(id, label, type, extra) {
    var o = { id: id, label: label, type: type };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }
  function e(from, to, extra) {
    var o = { from: from, to: to };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }

  /* ---------------------------------------------------------------- Figure 1, p.5
   * Capacity, or "N". One UPS module. A maintenance bypass around it, drawn dashed
   * and therefore normally open, running from the UPS input bus to the UPS output bus.
   */
  var fig1 = {
    id: 'wp75-fig1',
    name: 'Capacity ("N")',
    source: 'Schneider WP75 Rev 4, Figure 1, p.5',
    nodes: [
      n('util', 'Utility', 'utility', { x: 90, y: 40 }),
      n('gen', 'Generator', 'generator', { x: 250, y: 40 }),
      n('ats', 'ATS', 'ats', { x: 170, y: 110 }),
      n('bus_in', 'UPS input bus', 'bus', { x: 170, y: 180 }),
      n('ups', 'UPS 300kW', 'ups', { x: 120, y: 250, kw: 300 }),
      n('mbp', 'Maintenance bypass', 'bypass', { x: 250, y: 250, normallyOpen: true }),
      n('bus_out', 'UPS output bus', 'bus', { x: 170, y: 320 }),
      n('pdu', 'PDU', 'pdu', { x: 170, y: 390 }),
      n('load', 'LOAD 300kW', 'load', { x: 170, y: 460, kw: 300 })
    ],
    edges: [
      e('util', 'ats'), e('gen', 'ats', { alternate: true }),
      e('ats', 'bus_in'),
      e('bus_in', 'ups'), e('ups', 'bus_out'),
      e('bus_in', 'mbp', { alternate: true }), e('mbp', 'bus_out', { alternate: true }),
      e('bus_out', 'pdu'), e('pdu', 'load')
    ]
  };

  /* ---------------------------------------------------------------- Figure 3, p.9
   * Parallel redundant, "N+1". Two 300kW modules onto a common paralleling bus, one 300kW load.
   * Maintenance bypass again runs input bus to output bus, around both modules.
   */
  var fig3 = {
    id: 'wp75-fig3',
    name: 'Parallel redundant ("N+1")',
    source: 'Schneider WP75 Rev 4, Figure 3, p.9',
    nodes: [
      n('util', 'Utility', 'utility', { x: 90, y: 40 }),
      n('gen', 'Generator', 'generator', { x: 290, y: 40 }),
      n('ats', 'ATS', 'ats', { x: 190, y: 110 }),
      n('bus_in', 'UPS input bus', 'bus', { x: 190, y: 180 }),
      n('ups_a', 'UPS A 300kW', 'ups', { x: 100, y: 250, kw: 300 }),
      n('ups_b', 'UPS B 300kW', 'ups', { x: 200, y: 250, kw: 300 }),
      n('mbp', 'Maintenance bypass', 'bypass', { x: 310, y: 250, normallyOpen: true }),
      n('bus_out', 'Paralleling bus', 'bus', { x: 190, y: 320 }),
      n('pdu', 'PDU', 'pdu', { x: 190, y: 390 }),
      n('load', 'LOAD 300kW', 'load', { x: 190, y: 460, kw: 300 })
    ],
    edges: [
      e('util', 'ats'), e('gen', 'ats', { alternate: true }),
      e('ats', 'bus_in'),
      e('bus_in', 'ups_a'), e('ups_a', 'bus_out'),
      e('bus_in', 'ups_b'), e('ups_b', 'bus_out'),
      e('bus_in', 'mbp', { alternate: true }), e('mbp', 'bus_out', { alternate: true }),
      e('bus_out', 'pdu'), e('pdu', 'load')
    ]
  };

  /* The source end shared by Figures 5 and 6.
   * Utility A bus and Utility B bus. A middle bus fed normally from Utility B, with a dashed,
   * normally open tie back to Utility A. Three ATS units: ATS 1 off Utility A, ATS 2 off the
   * middle bus, ATS 3 off Utility B. All three take the generator as their alternate source.
   */
  function distributedFrontEnd() {
    return {
      nodes: [
        n('util_a', 'Utility A', 'utility', { x: 50, y: 30 }),
        n('util_b', 'Utility B', 'utility', { x: 440, y: 30 }),
        n('gen', 'Generator', 'generator', { x: 620, y: 45 }),
        n('bus_ua', 'Utility A bus', 'bus', { x: 50, y: 85 }),
        n('bus_ub', 'Utility B bus', 'bus', { x: 440, y: 85 }),
        n('bus_gen', 'Generator bus', 'bus', { x: 620, y: 105 }),
        n('tie_a_mid', 'Utility A tie', 'tie', { x: 160, y: 120, normallyOpen: true }),
        n('bus_mid', 'Middle bus', 'bus', { x: 260, y: 145 }),
        n('ats1', 'ATS 1', 'ats', { x: 50, y: 195 }),
        n('ats2', 'ATS 2', 'ats', { x: 260, y: 215 }),
        n('ats3', 'ATS 3', 'ats', { x: 470, y: 235 }),
        n('bus_1in', 'UPS 1 input bus', 'bus', { x: 50, y: 285 }),
        n('bus_2in', 'UPS 2 input bus', 'bus', { x: 260, y: 285 }),
        n('bus_3in', 'UPS 3 input bus', 'bus', { x: 470, y: 285 }),
        n('ups1', 'UPS 1 150kW', 'ups', { x: 50, y: 340, kw: 150 }),
        n('ups2', 'UPS 2 150kW', 'ups', { x: 260, y: 340, kw: 150 }),
        n('ups3', 'UPS 3 150kW', 'ups', { x: 470, y: 340, kw: 150 }),
        n('bus_1out', 'UPS 1 output bus', 'bus', { x: 50, y: 395 }),
        n('bus_2out', 'UPS 2 output bus', 'bus', { x: 260, y: 395 }),
        n('bus_3out', 'UPS 3 output bus', 'bus', { x: 470, y: 395 })
      ],
      edges: [
        e('util_a', 'bus_ua'), e('util_b', 'bus_ub'), e('gen', 'bus_gen'),
        e('bus_ua', 'tie_a_mid', { alternate: true }),
        e('tie_a_mid', 'bus_mid', { alternate: true }),
        e('bus_ub', 'bus_mid'),
        e('bus_ua', 'ats1'), e('bus_gen', 'ats1', { alternate: true }),
        e('bus_mid', 'ats2'), e('bus_gen', 'ats2', { alternate: true }),
        e('bus_ub', 'ats3'), e('bus_gen', 'ats3', { alternate: true }),
        e('ats1', 'bus_1in'), e('ats2', 'bus_2in'), e('ats3', 'bus_3in'),
        e('bus_1in', 'ups1'), e('ups1', 'bus_1out'),
        e('bus_2in', 'ups2'), e('ups2', 'bus_2out'),
        e('bus_3in', 'ups3'), e('ups3', 'bus_3out')
      ]
    };
  }

  /* ---------------------------------------------------------------- Figure 5, p.12
   * Distributed redundant with STS. Three UPS modules, three STS, three PDUs, six 50kW loads.
   *
   * The STS ring, traced off the figure. Each STS takes a solid primary from one UPS output bus
   * and a dashed secondary from another, and each UPS output bus feeds exactly two STS units,
   * once as primary and once as secondary:
   *    STS 1  primary UPS 1   secondary UPS 2
   *    STS 2  primary UPS 3   secondary UPS 1
   *    STS 3  primary UPS 2   secondary UPS 3
   *
   * LOADS 1, 3, and 5 hang off a single PDU. They are SINGLE CORDED. LOADS 2, 4, and 6 land on
   * two PDUs each. They are DUAL CORDED. That difference is the whole point of the figure, and
   * it is why WP75's own advantage claim for this design is conditional: concurrent maintenance
   * of all components IF all loads are dual corded (p.14). As drawn, they are not.
   *
   * No maintenance bypass is drawn. WP75 p.14 notes many distributed redundant designs have none.
   */
  var fig5 = (function () {
    var fe = distributedFrontEnd();
    return {
      id: 'wp75-fig5',
      name: 'Distributed redundant (with STS)',
      source: 'Schneider WP75 Rev 4, Figure 5, p.12',
      nodes: fe.nodes.concat([
        n('sts1', 'STS 1', 'sts', { x: 50, y: 450 }),
        n('sts2', 'STS 2', 'sts', { x: 260, y: 450 }),
        n('sts3', 'STS 3', 'sts', { x: 470, y: 450 }),
        n('pdu1', 'PDU 1', 'pdu', { x: 50, y: 505 }),
        n('pdu2', 'PDU 2', 'pdu', { x: 260, y: 505 }),
        n('pdu3', 'PDU 3', 'pdu', { x: 470, y: 505 }),
        n('load1', 'LOAD 1 50kW', 'load', { x: 50, y: 575, kw: 50 }),
        n('load2', 'LOAD 2 50kW', 'load', { x: 155, y: 575, kw: 50 }),
        n('load3', 'LOAD 3 50kW', 'load', { x: 260, y: 575, kw: 50 }),
        n('load4', 'LOAD 4 50kW', 'load', { x: 365, y: 575, kw: 50 }),
        n('load5', 'LOAD 5 50kW', 'load', { x: 470, y: 575, kw: 50 }),
        n('load6', 'LOAD 6 50kW', 'load', { x: 260, y: 650, kw: 50 })
      ]),
      edges: fe.edges.concat([
        e('bus_1out', 'sts1'), e('bus_2out', 'sts1', { alternate: true }),
        e('bus_3out', 'sts2'), e('bus_1out', 'sts2', { alternate: true }),
        e('bus_2out', 'sts3'), e('bus_3out', 'sts3', { alternate: true }),
        e('sts1', 'pdu1'), e('sts2', 'pdu2'), e('sts3', 'pdu3'),
        e('pdu1', 'load1'),
        e('pdu1', 'load2'), e('pdu2', 'load2'),
        e('pdu2', 'load3'),
        e('pdu2', 'load4'), e('pdu3', 'load4'),
        e('pdu3', 'load5'),
        e('pdu1', 'load6'), e('pdu3', 'load6')
      ])
    };
  }());

  /* ---------------------------------------------------------------- Figure 6, p.13
   * Tri redundant, no STS. Same front end. Each UPS output bus feeds its own PDU, and every load
   * is dual corded off two PDUs in a ring. Three 100kW loads.
   *
   * This is the "if all loads are dual corded" branch of the Figure 5 claim, drawn out. It is the
   * control case: same family of design, single corded loads removed, and the verdict should flip.
   */
  var fig6 = (function () {
    var fe = distributedFrontEnd();
    return {
      id: 'wp75-fig6',
      name: 'Tri redundant (no STS)',
      source: 'Schneider WP75 Rev 4, Figure 6, p.13',
      nodes: fe.nodes.concat([
        n('pdu1', 'PDU 1', 'pdu', { x: 50, y: 470 }),
        n('pdu2', 'PDU 2', 'pdu', { x: 260, y: 470 }),
        n('pdu3', 'PDU 3', 'pdu', { x: 470, y: 470 }),
        n('load2', 'LOAD 2 100kW', 'load', { x: 155, y: 545, kw: 100 }),
        n('load4', 'LOAD 4 100kW', 'load', { x: 365, y: 545, kw: 100 }),
        n('load6', 'LOAD 6 100kW', 'load', { x: 260, y: 620, kw: 100 })
      ]),
      edges: fe.edges.concat([
        e('bus_1out', 'pdu1'), e('bus_2out', 'pdu2'), e('bus_3out', 'pdu3'),
        e('pdu1', 'load2'), e('pdu2', 'load2'),
        e('pdu2', 'load4'), e('pdu3', 'load4'),
        e('pdu1', 'load6'), e('pdu3', 'load6')
      ])
    };
  }());

  /* ---------------------------------------------------------------- Figure 7, p.16
   * System plus system, "2(N+1)". Two complete sides, each with its own utility, generator, ATS,
   * two 300kW UPS modules on a parallel bus, and a PDU. A tie between the two UPS input
   * panelboards, drawn dashed and therefore normally open. Three 100kW loads.
   *
   * LOAD 1 and LOAD 3 are dual corded straight off both PDUs. LOAD 2 is SINGLE CORDED and is fed
   * through a RACK ATS which takes a solid primary from PDU 2 and a dashed alternate from PDU 1.
   * WP75 p.16 is explicit that this is a compromise: "tier IV power architectures require that
   * all loads are dual-corded."
   */
  var fig7 = {
    id: 'wp75-fig7',
    name: 'System plus system ("2(N+1)")',
    source: 'Schneider WP75 Rev 4, Figure 7, p.16',
    nodes: [
      n('util_a', 'Utility A', 'utility', { x: 70, y: 30 }),
      n('gen_a', 'Generator A', 'generator', { x: 210, y: 40 }),
      n('util_b', 'Utility B', 'utility', { x: 330, y: 30 }),
      n('gen_b', 'Generator B', 'generator', { x: 470, y: 40 }),
      n('ats_a', 'ATS A', 'ats', { x: 140, y: 100 }),
      n('ats_b', 'ATS B', 'ats', { x: 400, y: 100 }),
      n('bus_in_a', 'UPS input panel A', 'bus', { x: 140, y: 165 }),
      n('bus_in_b', 'UPS input panel B', 'bus', { x: 400, y: 165 }),
      n('tie', 'Bus tie', 'tie', { x: 270, y: 165, normallyOpen: true }),
      n('ups_1a', 'UPS 1A 300kW', 'ups', { x: 90, y: 230, kw: 300 }),
      n('ups_1b', 'UPS 1B 300kW', 'ups', { x: 190, y: 230, kw: 300 }),
      n('ups_2a', 'UPS 2A 300kW', 'ups', { x: 350, y: 230, kw: 300 }),
      n('ups_2b', 'UPS 2B 300kW', 'ups', { x: 450, y: 230, kw: 300 }),
      n('bus_out_a', 'UPS output bus A', 'bus', { x: 140, y: 295 }),
      n('bus_out_b', 'UPS output bus B', 'bus', { x: 400, y: 295 }),
      n('pdu1', 'PDU 1', 'pdu', { x: 140, y: 360 }),
      n('pdu2', 'PDU 2', 'pdu', { x: 400, y: 360 }),
      n('rack_ats', 'RACK ATS', 'rack_ats', { x: 270, y: 415 }),
      n('load1', 'LOAD 1 100kW', 'load', { x: 140, y: 480, kw: 100 }),
      n('load2', 'LOAD 2 100kW', 'load', { x: 270, y: 480, kw: 100 }),
      n('load3', 'LOAD 3 100kW', 'load', { x: 400, y: 480, kw: 100 })
    ],
    edges: [
      e('util_a', 'ats_a'), e('gen_a', 'ats_a', { alternate: true }),
      e('util_b', 'ats_b'), e('gen_b', 'ats_b', { alternate: true }),
      e('ats_a', 'bus_in_a'), e('ats_b', 'bus_in_b'),
      // The tie carries power in EITHER direction: that is the entire point of a tie. Both edges
      // must be bidirectional. Wiring only one of them makes the tie a check valve, which silently
      // means one side can never back feed the other. A mutation test caught exactly that here.
      e('bus_in_a', 'tie', { alternate: true, bidirectional: true }),
      e('tie', 'bus_in_b', { alternate: true, bidirectional: true }),
      e('bus_in_a', 'ups_1a'), e('ups_1a', 'bus_out_a'),
      e('bus_in_a', 'ups_1b'), e('ups_1b', 'bus_out_a'),
      e('bus_in_b', 'ups_2a'), e('ups_2a', 'bus_out_b'),
      e('bus_in_b', 'ups_2b'), e('ups_2b', 'bus_out_b'),
      e('bus_out_a', 'pdu1'), e('bus_out_b', 'pdu2'),
      e('pdu1', 'load1'), e('pdu2', 'load1'),
      e('pdu1', 'load3'), e('pdu2', 'load3'),
      e('pdu2', 'rack_ats'), e('pdu1', 'rack_ats', { alternate: true }),
      e('rack_ats', 'load2')
    ]
  };

  var all = [fig1, fig3, fig5, fig6, fig7];
  var byId = {};
  all.forEach(function (t) { byId[t.id] = t; });

  return { all: all, byId: byId, fig1: fig1, fig3: fig3, fig5: fig5, fig6: fig6, fig7: fig7 };
}));
