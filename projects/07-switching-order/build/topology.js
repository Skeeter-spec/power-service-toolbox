// 07 Switching order and LOTO planner. Published topologies.
//
// PROVENANCE. Both topologies are traced from figures in:
//   Bonneville Power Administration, Operating Bulletin No. 2 / Accident Prevention Rule S-6,
//   "Switching and Clearance Procedure", October 1 2025, 86 pp.
//   https://www.bpa.gov/-/media/Aep/customers-and-contractors/safety/switching-and-clearance-procedure.pdf
//   Read at the PUBLISHER (bpa.gov, HTTP 200, no cross host redirect, BPA employee named as author in
//   the file metadata, Microsoft Word as creator => an original, not a third party re render).
//   PUBLIC DOMAIN: federal agency work, 17 USC 105. The licence was checked per paragraph, not per
//   cover: all 86 pages searched for reprint and copyright notices, eleven hits, all of them the word
//   "permission" in its operational sense (permission from the Dispatcher). Zero reprints.
//
// This file encodes CONNECTIVITY AND DEVICE KIND, which are facts about a circuit. It does not copy
// artwork. Same boundary 01 drew around WP75's figures.
//
// 🔴 THE FIGURES WERE READ AS IMAGES, RENDERED AT 14x, NOT INFERRED FROM THE TEXT LAYER.
// That is not ceremony. The repo's own SOURCES.md described the Example 1 figure as "PCB A-10 with a
// disconnect either side", which is a disconnect SHORT, and the missing blade is the entire point of
// the example. The device COUNT in that sentence was right, which is exactly why the wrong description
// survived: the number agreed, so nobody re counted the blades.
//
// ⚠ THE FIGURES DO NOT LABEL A SINGLE DISCONNECT. The Example 1 drawing labels only the line, the two
// PCBs (A-10, A-3) and the two ground switches (7233, 7243). Every disconnect NAME below comes from
// BPA's PROSE, across two examples that share the one figure. The drawing alone cannot support the
// assignment and is not cited as if it could.
//
// ⚠ THE FIGURES DO NOT RELIABLY SHOW STATE EITHER. Every blade in the Example 1 figure is drawn at an
// angle. The `state` fields below come from BPA's own VERBS, not from the drawing: a device BPA says to
// "check open" was already open; a device BPA says to "open" was closed. See engine.js `tagAction`.

'use strict';

// ---------------------------------------------------------------------------------------------
// Device kinds. The distinction between the first two is the whole domain, and it is BPA's own:
// rule IV.4.C orders one against the other.
//
//   pcb        A power circuit breaker. Interrupts current. It is NOT an isolating device, and it is
//              NOT a clearance limit. BPA opens PCBs to de-energize and then still requires isolating
//              devices to be opened and tagged as the limits.
//   isolating  A disconnect. Establishes the isolation boundary. THESE are what get tagged as limits.
//   ground     A ground switch. Connects to the ground grid. Not a limit: ground is not a source.
//              BPA, X.2 Example 1: "The ground switches at both terminals would remain open, unless
//              otherwise agreed to by the Clearance applicant and the Dispatcher."
//   fixed      A permanent connection. Never operated.
// ---------------------------------------------------------------------------------------------

const TOPOLOGIES = {

  // -------------------------------------------------------------------------------------------
  // BPA S-6, section X.2 "Tagging for Clearances", Example 1 and Example 2 illustration.
  // Page label P-45 (PDF page 49). Figure rendered at 14x and traced blade by blade.
  //
  // ONE FIGURE, TWO PUBLISHED QUESTIONS, TWO DIFFERENT PUBLISHED ANSWERS, AND EACH ANSWER IS WRONG
  // FOR THE OTHER QUESTION. That pair is the strongest verify fixture in this project.
  //
  // Traced topology, per terminal (mirrored at Central and East Columbia):
  //
  //                       ground switch (open)
  //                              |
  //   auxiliary bus --[Aux Bus Disc]-- LINE --[Line Side Disc]--[PCB]--[Main Bus Disc]-- main bus
  //
  // THE AUXILIARY BUS DISCONNECT HANGS OFF THE LINE NODE, NOT OFF THE BREAKER. It is a bypass: close
  // it and the line is fed from the auxiliary bus with the PCB out of the picture entirely. A model
  // built with only "a disconnect either side of the breaker" would call this line isolated while it
  // sat energized from the auxiliary bus.
  // -------------------------------------------------------------------------------------------
  'bpa-x2-ex1': {
    id: 'bpa-x2-ex1',
    title: 'Central to East Columbia No. 3, 230 kV line',
    citation: 'BPA S-6, X.2 Examples 1 and 2, illustration at page label P-45 (PDF p.49)',
    blurb: 'Two terminals, two power circuit breakers, six disconnects, two ground switches. ' +
           'BPA asks two different questions of this one circuit and publishes two different answers.',

    nodes: {
      // --- Central terminal ---
      central_aux_bus: {
        label: 'Central auxiliary bus',
        source: true,
        // WHY THIS IS A SOURCE, AND THE REASONING IS NOT CIRCULAR. It would be circular to call the
        // auxiliary bus a source because BPA made its disconnect a limit, and then to "verify" that
        // the disconnect is a limit. The evidence is INDEPENDENT and comes from a different example:
        // BPA X.5 Example 1 (P-53) has "a 230 kV Transformer PCB ... to be bypassed" and describes
        // the relays being out of service "during the entire time that the Auxiliary Bus Disconnect
        // is closed". Closing that disconnect is what carries the load around the breaker. A bus that
        // carries the load when you close onto it is energized.
        cite: 'BPA S-6, X.5 Example 1, P-53',
      },
      central_line_node: {
        label: 'Central-East Columbia No. 3 230 kV line, Central terminal',
        source: false,
      },
      central_a10_line_terminal: { label: 'A-10 line side terminal', source: false },
      central_a10_bus_terminal: { label: 'A-10 main bus side terminal', source: false },
      central_main_bus: { label: 'Central main bus', source: true },

      // --- East Columbia terminal ---
      east_aux_bus: {
        label: 'East Columbia auxiliary bus',
        source: true,
        cite: 'BPA S-6, X.5 Example 1, P-53',
      },
      east_line_node: {
        label: 'Central-East Columbia No. 3 230 kV line, East Columbia terminal',
        source: false,
      },
      east_a3_line_terminal: { label: 'A-3 line side terminal', source: false },
      east_a3_bus_terminal: { label: 'A-3 main bus side terminal', source: false },
      east_main_bus: { label: 'East Columbia main bus', source: true },

      // The ground grid. NOT a source. This is why ground switches are never clearance limits.
      ground: { label: 'Ground grid', source: false },
    },

    devices: [
      // The line itself. The two terminals are one electrical node joined by the conductor.
      {
        id: 'the_line', label: 'Central-East Columbia No. 3 230 kV line', kind: 'fixed',
        between: ['central_line_node', 'east_line_node'], state: 'closed',
      },

      // --- Central terminal, A-10 ---
      {
        id: 'a10_aux_bus_disc', label: 'A-10 Auxiliary Bus Disconnect', kind: 'isolating',
        between: ['central_aux_bus', 'central_line_node'],
        // OPEN, and the evidence is BPA's own verb. X.2 Example 1 (P-45): the Switchman will
        // "check open, and tag A-10 Auxiliary Bus Disconnect". You check open what is already open.
        state: 'open',
        cite: 'BPA S-6, X.2 Example 1, P-45',
      },
      {
        id: 'gs_7233', label: 'Ground switch 7233', kind: 'ground',
        between: ['central_line_node', 'ground'], state: 'open',
        cite: 'BPA S-6, X.2 Example 1, P-45: "The ground switches at both terminals would remain open"',
      },
      {
        id: 'a10_line_side_disc', label: 'A-10 Line Side Disconnect', kind: 'isolating',
        between: ['central_line_node', 'central_a10_line_terminal'],
        // CLOSED. X.2 Example 1 (P-45): "open and tag A-10 Line Side Disconnect". You open what is closed.
        state: 'closed',
        cite: 'BPA S-6, X.2 Example 1, P-45',
      },
      {
        id: 'a10_pcb', label: 'A-10 PCB', kind: 'pcb',
        between: ['central_a10_line_terminal', 'central_a10_bus_terminal'], state: 'closed',
        // X.2 Example 1 (P-45) has SCADA "de-energize the ... line by opening PCBs A-10 and A-3 by
        // supervisory control". BPA drops this line with this breaker, in its own words, so for THIS
        // breaker the capability is published rather than assumed. See engine.js: the engine throws
        // on a PCB whose lineDropCapable is null, because X.5 Example 2 (P-54) documents a PCB that
        // is "inadequate for line-dropping" and a tool does not get to assume every breaker can.
        lineDropCapable: true,
        cite: 'BPA S-6, X.2 Example 1, P-45',
      },
      {
        id: 'a10_main_bus_disc', label: 'A-10 Main Bus Disconnect', kind: 'isolating',
        between: ['central_a10_bus_terminal', 'central_main_bus'],
        // CLOSED. X.2 Example 2 (P-47): "open and tag A-10 Main Bus Disconnect".
        state: 'closed',
        cite: 'BPA S-6, X.2 Example 2, P-47',
      },

      // --- East Columbia terminal, A-3. Mirrored, and BPA tags it the same way. ---
      {
        id: 'a3_aux_bus_disc', label: 'A-3 Auxiliary Bus Disconnect', kind: 'isolating',
        between: ['east_aux_bus', 'east_line_node'], state: 'open',
        cite: 'BPA S-6, X.2 Example 1, P-46: "check open, and tag A-3 Auxiliary Bus Disconnect"',
      },
      {
        id: 'gs_7243', label: 'Ground switch 7243', kind: 'ground',
        between: ['east_line_node', 'ground'], state: 'open',
        cite: 'BPA S-6, X.2 Example 1, P-45',
      },
      {
        id: 'a3_line_side_disc', label: 'A-3 Line Side Disconnect', kind: 'isolating',
        between: ['east_line_node', 'east_a3_line_terminal'], state: 'closed',
        cite: 'BPA S-6, X.2 Example 1, P-46: "open and tag A-3 Line Side Disconnect"',
      },
      {
        id: 'a3_pcb', label: 'A-3 PCB', kind: 'pcb',
        between: ['east_a3_line_terminal', 'east_a3_bus_terminal'], state: 'closed',
        lineDropCapable: true,
        cite: 'BPA S-6, X.2 Example 1, P-45',
      },
      {
        id: 'a3_main_bus_disc', label: 'A-3 Main Bus Disconnect', kind: 'isolating',
        between: ['east_a3_bus_terminal', 'east_main_bus'],
        state: 'closed',
        // ⚠ NOT PUBLISHED, AND SAID SO RATHER THAN HIDDEN. BPA never names an A-3 Main Bus
        // Disconnect: Example 2 is a Test Clearance on A-10 only, so only Central's third blade is
        // named in prose. The FIGURE shows three blades at BOTH terminals, mirrored, so the device
        // is really there. The NAME is this repo's, by symmetry with A-10. Nothing verify asserts
        // depends on it: no published example asks a question about A-3's main bus disconnect.
        nameIsInferred: true,
      },
    ],

    // The two published queries against this one figure.
    publishedQueries: ['x2-ex1-line-work-clearance', 'x2-ex2-a10-test-clearance'],
  },

  // -------------------------------------------------------------------------------------------
  // BPA S-6, section X.3 "Tagging for System Dispatcher or Substation Operator", Example 1.
  // Page label P-52 (PDF page 56). Figure rendered at 14x.
  //
  // A 13.8 kV self-contained PCB ("oil-recloser") at a small substation, with a BYPASS DISCONNECT in
  // parallel across the breaker AND both of its series disconnects:
  //
  //     Feeder --+--[Feeder Disc]--[PCB]--[Bus Disc]--+-- Bus
  //              |                                    |
  //              +--------[Bypass Disconnect]---------+
  //
  // WHY THIS FIGURE IS IN THE REPO. It is 01's one way bus tie bug, published as a drawing. Isolate
  // the PCB and the feeder is still fed, around the outside, through the bypass. Any reachability
  // search that is directed, or that simply omits the bypass edge, gets BPA's published answer wrong
  // here: it drops the Feeder Disconnect from the limits, because without the bypass there is no path
  // from the feeder side of the breaker to any source at all. The mutant is in mutants.txt.
  //
  // ⚠ NAMING: the PROSE names the two series devices ("the open hot-stick operated Bus Disconnect and
  // Feeder Disconnect"). The FIGURE labels the third ("Bypass Disconnect"). Neither alone gives the
  // circuit; both were read.
  // -------------------------------------------------------------------------------------------
  'bpa-x3-ex1': {
    id: 'bpa-x3-ex1',
    title: '13.8 kV feeder breaker with a bypass disconnect',
    citation: 'BPA S-6, X.3 Example 1, illustration at page label P-52 (PDF p.56)',
    blurb: 'A breaker you can isolate without dropping the feeder, because a bypass disconnect goes ' +
           'around it. Open the breaker and the feeder is still live.',

    nodes: {
      feeder_node: {
        label: 'Feeder tap',
        // NOT A SOURCE, AND THIS IS THE TOOL'S OWN MODELLING CHOICE, NOT BPA'S STATEMENT.
        // The figure draws the feeder as an arrow leaving the substation: a radial distribution
        // feeder, fed from the bus, not feeding it. BPA never says so. It is flagged because it is
        // load bearing: it is what makes the bypass the only path from this node to a source, and
        // therefore what makes BPA's published answer depend on the bypass being modelled at all.
        source: false,
        assumption: true,
      },
      pcb_feeder_terminal: { label: 'PCB feeder side terminal', source: false },
      pcb_bus_terminal: { label: 'PCB bus side terminal', source: false },
      bus_node: { label: 'Bus tap', source: false },
      bus: { label: 'Bus', source: true },
    },

    devices: [
      {
        id: 'feeder_disc', label: 'Feeder Disconnect', kind: 'isolating',
        between: ['feeder_node', 'pcb_feeder_terminal'], state: 'open',
        cite: 'BPA S-6, X.3 Example 1, P-52: "the open hot-stick operated Bus Disconnect and Feeder Disconnect"',
      },
      {
        id: 'x3_pcb', label: 'PCB (13.8 kV oil-recloser)', kind: 'pcb',
        between: ['pcb_feeder_terminal', 'pcb_bus_terminal'], state: 'open',
        // ⚠ null, NOT true, AND THE ENGINE THROWS ON IT RATHER THAN GUESSING.
        // BPA never says this breaker can drop this feeder. X.5 Example 2 (P-54) documents a PCB
        // "determined to be inadequate for line-dropping", with the relaying modified so it is never
        // the last to open. So "every PCB can interrupt what flows through it" is an assumption this
        // source explicitly contradicts in at least one bay, and the tool does not get to make it.
        lineDropCapable: null,
        cite: 'BPA S-6, X.3 Example 1, P-52',
      },
      {
        id: 'bus_disc', label: 'Bus Disconnect', kind: 'isolating',
        between: ['pcb_bus_terminal', 'bus_node'], state: 'open',
        cite: 'BPA S-6, X.3 Example 1, P-52',
      },
      {
        id: 'bypass_disc', label: 'Bypass Disconnect', kind: 'isolating',
        between: ['feeder_node', 'bus_node'], state: 'closed',
        // CLOSED. BPA X.3 Example 1 (P-52): the Dispatcher directs a Switching Order "to bypass and
        // isolate the PCB". The bypass carries the feeder while the breaker sits isolated. The device
        // NAME is the figure's own label.
        cite: 'BPA S-6, X.3 Example 1, P-52',
      },
      { id: 'bus_conn', label: 'Bus connection', kind: 'fixed', between: ['bus_node', 'bus'], state: 'closed' },
    ],

    publishedQueries: ['x3-ex1-pcb-dispatcher-tag'],
  },
};

// ---------------------------------------------------------------------------------------------
// THE PUBLISHED ANSWERS. This is the answer key, and it is transcribed from BPA's prose.
//
// 🔴 READ THIS BEFORE ADDING ONE. An answer key cannot check itself. No assertion in verify.js can
// tell you that a page was read correctly, because the limits and the quote are two representations
// of ONE transcribed fact. The instrument is a SECOND READER, not a test. Every entry below was read
// at bpa.gov twice, by two different sessions, and the second read is what found that the first had
// the Example 1 figure a disconnect short. A sixth example gets read twice or it does not go in.
// ---------------------------------------------------------------------------------------------

const PUBLISHED_ANSWERS = {

  'x2-ex1-line-work-clearance': {
    topology: 'bpa-x2-ex1',
    citation: 'BPA S-6, X.2 Example 1, page labels P-45 and P-46 (PDF pp.49-50)',
    question: 'Work Clearance for transmission line maintenance on the Central-East Columbia No. 3 230 kV line',
    workItem: { type: 'node', id: 'central_line_node' },
    quote:
      'Assume a Work Clearance is requested for transmission line maintenance on the Central-East ' +
      'Columbia No. 3 230 kV line in the following illustration. Normal Dispatching/SCADA operating ' +
      'procedures would de-energize the Central-East Columbia No. 3 230 kV line by opening PCBs A-10 ' +
      'and A-3 by supervisory control.',
    tagQuote:
      'In the switchyard, the Switchman will check open, and tag A-10 Auxiliary Bus Disconnect and ' +
      'open and tag A-10 Line Side Disconnect with red Do Not Operate tags',
    // The published limits. Both terminals: BPA works Central in full and then says East Columbia
    // is tagged the same way with A-3's devices.
    limits: [
      'a10_aux_bus_disc', 'a10_line_side_disc',
      'a3_aux_bus_disc', 'a3_line_side_disc',
    ],
    // BPA's own verbs, per device. This is the second half of the answer and it is why the state
    // model has to be right, not just the connectivity.
    actions: {
      a10_aux_bus_disc: 'check open and tag',
      a10_line_side_disc: 'open and tag',
      a3_aux_bus_disc: 'check open and tag',
      a3_line_side_disc: 'open and tag',
    },
    pcbsCheckedOpen: ['a10_pcb', 'a3_pcb'],
    notLimits: {
      a10_main_bus_disc:
        'The Line Side Disconnect already stands between the line and A-10, and therefore between ' +
        'the line and the main bus. This reasoning is THIS TOOL\'S, not BPA\'s: BPA states which ' +
        'devices are the limits and never explains why the others are not.',
      gs_7233: 'A ground switch connects to the ground grid. Ground is not a source.',
    },
  },

  'x2-ex2-a10-test-clearance': {
    topology: 'bpa-x2-ex1',
    citation: 'BPA S-6, X.2 Example 2, page label P-47 (PDF p.51)',
    question: 'Test Clearance on A-10 PCB itself, during the line Work Clearance of Example 1',
    workItem: { type: 'device', id: 'a10_pcb' },
    quote:
      'Assume a Test Clearance is also requested on A-10 PCB for maintenance during the time the ' +
      'Central-East Columbia No. 3 230 kV line is out of service on a Work Clearance. A-10 PCB is ' +
      'already open and on Local control with a "Local" marker attached to the SCS.',
    tagQuote:
      'In the switchyard, the Switchman will check open and tag A-10 Line Side Disconnect and open ' +
      'and tag A-10 Main Bus Disconnect with red Do Not Operate tags',
    limits: ['a10_line_side_disc', 'a10_main_bus_disc'],
    actions: {
      // 🔑 THIS IS THE ONE THAT IS A PREDICTION RATHER THAN A TRANSCRIPTION, AND IT IS THE BEST
      // CHECK IN THE PROJECT. Example 2 happens DURING Example 1's clearance, in BPA's own words.
      // Example 1 OPENED the Line Side Disconnect. So by the time Example 2 is written, that device
      // is already open, and BPA's verb for it changes from "open and tag" to "check open and tag".
      // Nothing here was set to make that come out right: run Example 1 against the initial state,
      // keep the state it leaves behind, ask Example 2's question, and BPA's second verb falls out.
      // The document agrees with itself across two examples, and the model reproduces the agreement.
      a10_line_side_disc: 'check open and tag',
      a10_main_bus_disc: 'open and tag',
    },
    // A-10 is already open, per BPA's own sentence. Nothing to check open in this step.
    pcbsCheckedOpen: [],
    notLimits: {
      a10_aux_bus_disc:
        'The Auxiliary Bus Disconnect hangs off the line node and does not touch A-10. It was a ' +
        'limit for Example 1 and is not one here, on the same circuit, one page later.',
    },
    // The state Example 1 leaves behind. Example 2 is asked against THIS, not against the initial state.
    precededBy: 'x2-ex1-line-work-clearance',
  },

  'x3-ex1-pcb-dispatcher-tag': {
    topology: 'bpa-x3-ex1',
    citation: 'BPA S-6, X.3 Example 1, page label P-52 (PDF p.56)',
    question: 'Dispatcher tagging to bypass and isolate the 13.8 kV PCB',
    workItem: { type: 'device', id: 'x3_pcb' },
    quote:
      'The Dispatcher could direct a Switchman to write a Switching Order to bypass and isolate the ' +
      'PCB and tag the disconnects on both sides of the PCB for the System Dispatcher.',
    tagQuote:
      'The Switchman would tag the open hot-stick operated Bus Disconnect and Feeder Disconnect with ' +
      'red Do Not Operate tags which are attached to red wooden blocks',
    limits: ['feeder_disc', 'bus_disc'],
    actions: {
      // BPA calls both of these "the open ... Bus Disconnect and Feeder Disconnect" in the same
      // breath as tagging them, so both are already open and both are checked open.
      feeder_disc: 'check open and tag',
      bus_disc: 'check open and tag',
    },
    pcbsCheckedOpen: [],
    notLimits: {
      bypass_disc:
        'The Bypass Disconnect is in parallel with the whole string and touches neither terminal of ' +
        'the PCB, so it is not on the boundary of this clearance. It is still the reason the Feeder ' +
        'Disconnect IS a limit: delete the bypass from the model and the feeder side of the breaker ' +
        'reaches no source at all, and BPA\'s published answer stops reproducing.',
    },
  },
};

// ---------------------------------------------------------------------------------------------
// WHAT IS NOT HERE, AND WHY. Recorded so the next session does not re spend the search, and does not
// mistake a deliberate omission for a gap nobody noticed.
//
// BPA S-6, X.2 EXAMPLE 5 (P-51): A Work Clearance on Transformer Bank No. 1 including the Station
// Service bank. Its published answer is FIVE devices: "A-9 Transformer Side and Auxiliary Bus and
// B-2 Transformer Side and Auxiliary Bus Disconnect switches will be tagged as Clearance limits ...
// a Do Not Operate tag shall also be placed on the open low voltage isolating device ACB-1 as a
// Clearance limit." It is the largest published answer in the document and the only one whose limits
// cross a voltage class.
//
// IT IS DELIBERATELY NOT ENCODED, AND THE REASON IS THE POINT.
// The figure was rendered at 20x and traced: A-9 and B-2 mirror the Example 1 arrangement exactly
// (a main bus disconnect, the PCB, a transformer side disconnect, and an auxiliary bus disconnect
// hanging off the transformer node), and the trunk from the bank CROSSES the B main bus without a
// junction dot, which is a crossover and not a connection. That much is solid.
//
// What is NOT solid is the MECHANISM BPA gives for ACB-1. BPA's purpose clause says the tag is there
// to control energization of the clearance "from the alternate station service source". Reading the
// ATS at 22x: the pivot is the common, it feeds the Station Service Loads, and it selects between a
// normal contact (fed through ACB-1 from the station service transformer) and an alternate contact
// (fed from the alternate source). An open transition transfer switch never joins those two contacts.
// So on the drawing as traced, THE ALTERNATE SOURCE HAS NO PATH TO ACB-1, and the published rationale
// cannot be reproduced without assuming a transfer mechanism BPA does not state anywhere.
//
// The answer is published. The path is not. Encoding it would mean picking whichever ATS model makes
// BPA's published answer come out, which is an answer key grading itself. So it stays out, stated,
// until either the mechanism is found in the document or the question is put to someone who runs one.
// This is the same shape as the rule's missing rationale: BPA states the ORDER in IV.4.C and never
// says why, and this repo asserts the order and declines to publish the physics in BPA's voice.
// ---------------------------------------------------------------------------------------------

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TOPOLOGIES, PUBLISHED_ANSWERS };
}
