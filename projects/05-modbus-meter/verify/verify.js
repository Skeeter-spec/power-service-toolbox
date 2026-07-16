#!/usr/bin/env node
/*
 * VERIFY. Run:  node verify/verify.js
 *
 * The gate for this repo: an app is not published until it reproduces a published worked example and
 * the numbers match the book. This is that check for project 05.
 *
 * A FOURTH SHAPE OF VERIFY, AND THE STRONGEST ONE THE REPO HAS HAD
 *
 *   01 checked a structural claim against a paper's prose verdict.
 *   02 checked ARITHMETIC against a 210 cell published table.
 *   03 was a state machine whose source published no filled in timeline, so it asserted the
 *      criterion, the defaults and the ranges instead.
 *   05 has the thing all three wanted: THE SOURCE PUBLISHES THE ANSWER IN LITERAL BYTES. The Modbus
 *      Application Protocol Specification prints request and response frames in hex, per function
 *      code. There is no tolerance to argue about and no convention to infer. The bytes match or
 *      they do not.
 *
 * And unusually for this repo, the primary is free, requires no login, and was read at the
 * PUBLISHER, twice, by two readers who never saw each other's transcription and agreed on every byte
 * of all five examples. See ../sources/SOURCES.md.
 *
 * SECTION F IS THE PRODUCT.
 *
 * This project's central finding is an ABSENCE, and 03 taught the repo that an absence is not self
 * enforcing (pattern 19). The specification defines byte order within a register and defines no data
 * type wider than a register, so a 32 bit float across two registers has no published word order.
 * Every Modbus tutorial on the internet supplies one anyway. Nothing stops a future session from
 * reading one, thinking "this is just how it works", and adding a default to decodeWide() in good
 * faith, in a decoder that someone then trusts against a real meter. No ordinary test would notice,
 * because nothing would be broken. So the refusal is asserted here, and the build is grepped.
 *
 * See ../build/spec.js for every constant and the page it was read on.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const S = require('../build/spec.js');
const E = require('../build/engine.js');

let pass = 0;
const failures = [];

function check(name, fn) {
  try {
    const r = fn();
    if (r === true) { pass++; return; }
    failures.push(`${name}\n    expected true, got ${JSON.stringify(r)}`);
  } catch (e) {
    failures.push(`${name}\n    threw: ${e.message.split('\n')[0]}`);
  }
}
/* For the refusals: the check PASSES only if the call throws. */
function checkThrows(name, fn) {
  try { fn(); failures.push(`${name}\n    expected a throw, got a return value`); }
  catch (e) { pass++; }
}
const hex = (a) => a.map((b) => b.toString(16).padStart(2, '0')).join(' ');
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/* ================================================================== *
 * SECTION A. THE FIVE PUBLISHED WORKED EXAMPLES, BYTE FOR BYTE.
 * APP V1.1b3 pages 12, 15, 18, 30-31 and 47. This is the answer key.
 * ================================================================== */

for (const ex of S.PUBLISHED) {
  if (ex.id === 'exception') continue;   // handled below, it is a different shape

  check(`A. ${ex.id}: request encodes to the published bytes (${ex.doc} ${ex.section} p${ex.page})`, () => {
    const built = ex.id === 'write-single-coil'
      ? E.encodeRequest(ex.request[0], ex.decoded)
      : E.encodeRequest(ex.request[0], ex.decoded);
    return eq(built, ex.request) || `built ${hex(built)}, published ${hex(ex.request)}`;
  });

  check(`A. ${ex.id}: the published request decodes back to the published fields`, () => {
    const d = E.decodeRequest(ex.request);
    if (ex.id === 'write-single-coil') {
      return d.outputAddress === ex.decoded.outputAddress && d.value === ex.decoded.value;
    }
    return d.startAddress === ex.decoded.startAddress;
  });

  check(`A. ${ex.id}: response encodes to the published bytes`, () => {
    const built = E.encodeResponse(ex.response[0], ex.decoded);
    return eq(built, ex.response) || `built ${hex(built)}, published ${hex(ex.response)}`;
  });
}

/* APP 6.1 p12 prose: "The status of outputs 27-20 is shown as the byte value CD hex". */
check('A. read-coils: the published response carries status bytes CD 6B 05 (APP 6.1 p12)', () => {
  const d = E.decodeResponse([0x01, 0x03, 0xCD, 0x6B, 0x05]);
  return eq(d.statusBytes, [0xCD, 0x6B, 0x05]);
});

/* APP 6.3 p15 prose: "The contents of register 108 are shown as the two byte values of 02 2B hex,
 * or 555 decimal. The contents of registers 109-110 are 00 00 and 00 64 hex, or 0 and 100 decimal".
 * The document states the DECIMAL values, so the decode is checked against the document's own words
 * and not merely against its hex. */
check('A. read-holding: 02 2B decodes to 555 decimal, exactly as the page says (APP 6.3 p15)', () => {
  const d = E.decodeResponse([0x03, 0x06, 0x02, 0x2B, 0x00, 0x00, 0x00, 0x64]);
  return eq(d.registers, [555, 0, 100]);
});

/* APP 6.12 p30-31. The example whose table SPANS A PAGE BREAK. A page scoped extractor yields a
 * truncated but well formed 3 row table, so this check is the one that would catch that mistake. */
check('A. write-multi-regs: the full ten byte request survives the page break (APP 6.12 p30-31)', () => {
  const built = E.encodeRequest(0x10, { startAddress: 0x0001, registers: [0x000A, 0x0102] });
  return eq(built, [0x10, 0x00, 0x01, 0x00, 0x02, 0x04, 0x00, 0x0A, 0x01, 0x02]);
});

/* APP 6.12 p30: the caption says "starting at 2", the table says Starting Address Lo = 01. The table
 * is right, per APP 6.3 p15: "In the PDU Registers are addressed starting at zero." This check pins
 * the table over the caption, which is the trap. */
check('A. write-multi-regs: PDU address is zero based, so "register 2" is address 0x0001 (APP 6.3 p15)', () => {
  const d = E.decodeRequest([0x10, 0x00, 0x01, 0x00, 0x02, 0x04, 0x00, 0x0A, 0x01, 0x02]);
  return d.startAddress === 0x0001 && d.quantity === 2;
});

/* APP section 7 p47. Request 01 04 A1 00 01, exception response 81 02. */
check('A. exception: 0x01 request to a bad address answers 81 02 (APP 7 p47)', () => {
  const built = E.encodeException(0x01, S.EXCEPTION.ILLEGAL_DATA_ADDRESS);
  return eq(built, [0x81, 0x02]);
});
check('A. exception: the published 81 02 decodes as function 01 with exception 02 (APP 7 p47)', () => {
  const d = E.decodeResponse([0x81, 0x02]);
  return d.exception === true && d.fn === 0x01 && d.exceptionCode === 0x02;
});
/* APP 7 p47, verbatim: "This makes the function code value in an exception response exactly 80
 * hexadecimal higher than the value would be for a normal response." Asserted for every function
 * code this engine implements, not just the one the document worked. */
check('A. exception: every implemented function code + 0x80 round trips (APP 7 p47)', () => {
  return Object.values(S.FN).every((fn) => {
    const d = E.decodeResponse(E.encodeException(fn, 0x02));
    return d.fn === fn && d.exception === true;
  });
});

/* ================================================================== *
 * SECTION A2. THE FIELD LABELS, PROMOTED FROM A BUG A HUMAN HAD TO EYEBALL (pattern 5).
 *
 * The UI labelled the Read Coils RESPONSE with the Read Coils REQUEST's field names, because it
 * guessed from the PDU's length and both are five bytes. So it displayed CD 6B 05 as an address and
 * a quantity when APP 6.1 p12 calls them a byte count and coil status. Every byte was right, nothing
 * threw, nothing overflowed, and both the node suite and the browser structural check were green:
 * they compare BYTES, and this was a lie told in WORDS, on a tool built to teach which byte is which.
 * Only an eye caught it. These checks mean an eye never has to catch it again.
 * ================================================================== */

check('A2. a Read Coils REQUEST is labelled address and quantity (APP 6.1 p12)', () => {
  return eq(E.fieldLabels([0x01, 0x00, 0x13, 0x00, 0x13], 'request'),
            ['Function', 'Addr Hi', 'Addr Lo', 'Qty Hi', 'Qty Lo']);
});
check('A2. a Read Coils RESPONSE is labelled byte count and coil status, NOT address and quantity (APP 6.1 p12)', () => {
  return eq(E.fieldLabels([0x01, 0x03, 0xCD, 0x6B, 0x05], 'response'),
            ['Function', 'Byte count', 'Coil status', 'Coil status', 'Coil status']);
});
/* 🔴 THE CHECK THAT WOULD HAVE CAUGHT IT. Same function code, same length, opposite direction. Any
 * implementation that infers direction from the PDU fails this and only this. */
check('A2. a request and a response of IDENTICAL length get different labels, which is why direction cannot be guessed', () => {
  const req = E.fieldLabels([0x01, 0x00, 0x13, 0x00, 0x13], 'request');
  const rsp = E.fieldLabels([0x01, 0x03, 0xCD, 0x6B, 0x05], 'response');
  return req.length === 5 && rsp.length === 5 && !eq(req, rsp);
});
checkThrows('A2. fieldLabels REFUSES to guess a direction it was not given', () => {
  return E.fieldLabels([0x01, 0x00, 0x13, 0x00, 0x13], undefined);
});
/* APP 6.3 p15: the 0x03 response packs "two bytes per register, with ... the first byte contains the
 * high order bits and the second contains the low order bits". */
check('A2. a Read Holding response labels register bytes Hi then Lo, alternating (APP 6.3 p15)', () => {
  return eq(E.fieldLabels([0x03, 0x06, 0x02, 0x2B, 0x00, 0x00, 0x00, 0x64], 'response'),
            ['Function', 'Byte count', 'Reg Hi', 'Reg Lo', 'Reg Hi', 'Reg Lo', 'Reg Hi', 'Reg Lo']);
});
check('A2. every label set is exactly as long as the PDU it labels, so no byte renders unlabelled', () => {
  return S.PUBLISHED.every((ex) =>
    E.fieldLabels(ex.request, 'request').length === ex.request.length &&
    E.fieldLabels(ex.response, 'response').length === ex.response.length);
});

/* ================================================================== *
 * SECTION B. BYTE ORDER, AND THE ONE FIELD THAT INVERTS IT.
 * ================================================================== */

/* APP 4.2 p5, the whole published example: 16 bits, 0x1234, "the first byte sent is 0x12 then 0x34". */
check('B. big endian: 0x1234 is sent 12 then 34 (APP 4.2 p5)', () => {
  return eq(E.u16ToBytes(S.ENDIAN_EXAMPLE.value), S.ENDIAN_EXAMPLE.bytes);
});
check('B. big endian: the published example is stated at 16 bits, the width of one register (APP 4.2 p5)', () => {
  return S.ENDIAN_EXAMPLE.registerBits === 16;
});
/* APP 6.3 p15: "For each register, the first byte contains the high order bits and the second
 * contains the low order bits." */
check('B. register decode is big endian: 02 2B is 555, not 11010 (APP 6.3 p15)', () => {
  return eq(E.decodeRegisters16([0x02, 0x2B]), [555]);
});

/* SERIAL 6.2.2 p39, Figure 30: CRC value 1241 hex goes out as CRC Lo = 41 then CRC Hi = 12.
 * THE OPPOSITE of section B's first check, in the same protocol. This is the point. */
check('B. CRC inverts the rule: 0x1241 is placed 41 then 12, low byte first (SERIAL 6.2.2 Fig 30 p39)', () => {
  return eq(E.crcToBytes(S.CRC.EXAMPLE.value), S.CRC.EXAMPLE.bytes);
});
check('B. the CRC and the data example disagree on byte order, and both are published', () => {
  const data = E.u16ToBytes(0x1234);        // APP 4.2 p5   -> [0x12, 0x34]  most significant first
  const crc  = E.crcToBytes(0x1241);        // SERIAL Fig 30 -> [0x41, 0x12]  least significant first
  return data[0] === 0x12 && crc[0] === 0x41;
});
check('B. CRC preload is FFFF and the polynomial is 0xA001 (SERIAL 6.2.2 p39 steps 1 and 4)', () => {
  return S.CRC.PRELOAD === 0xFFFF && S.CRC.POLYNOMIAL === 0xA001;
});
/* The CRC is a function of the message, so a changed message must change it. This asserts the
 * implementation is wired to its input at all. It does NOT assert the algorithm is correct: see the
 * honest gap recorded at the bottom of this file. */
check('B. the CRC actually depends on the message', () => {
  return E.crc16([0x11, 0x03]) !== E.crc16([0x11, 0x04]);
});
check('B. an RTU frame round trips and its CRC checks out', () => {
  const adu = E.wrapRTU(0x11, [0x03, 0x00, 0x6B, 0x00, 0x03]);
  const p = E.parseRTU(adu);
  return p.crcOk === true && p.address === 0x11 && eq(p.pdu, [0x03, 0x00, 0x6B, 0x00, 0x03]);
});
check('B. flipping one bit in an RTU frame is caught by the CRC', () => {
  const adu = E.wrapRTU(0x11, [0x03, 0x00, 0x6B, 0x00, 0x03]);
  adu[3] ^= 0x01;
  return E.parseRTU(adu).crcOk === false;
});
/* If the CRC were placed most significant byte first, like every other field, the receiver would
 * reject a good frame. This check is what the byte order rule is FOR. */
check('B. a CRC placed high byte first fails its own check, which is why the rule exists', () => {
  const adu = E.wrapRTU(0x11, [0x03, 0x00, 0x6B, 0x00, 0x03]);
  const swapped = [...adu.slice(0, -2), adu[adu.length - 1], adu[adu.length - 2]];
  return E.parseRTU(swapped).crcOk === false;
});

/* ================================================================== *
 * SECTION C. THE SIZE LIMITS, WHICH ARE RS-485's FINGERPRINT.
 * APP 4.1 p5.
 * ================================================================== */

check('C. PDU maximum is 253 bytes (APP 4.1 p5)', () => S.LIMITS.PDU_MAX === 253);
check('C. serial ADU maximum is 256 bytes (APP 4.1 p5)', () => S.LIMITS.SERIAL_ADU_MAX === 256);
check('C. TCP ADU maximum is 260 bytes (APP 4.1 p5)', () => S.LIMITS.TCP_ADU_MAX === 260);
check('C. MBAP header is 7 bytes (TCP 3.1.3 p5)', () => S.LIMITS.MBAP_LEN === 7);

/* The published arithmetic, checked rather than assumed. APP 4.1 p5:
 *   "MODBUS PDU for serial line communication = 256 - Server address (1 byte) - CRC (2 bytes) = 253 bytes"
 *   "RS232 / RS485 ADU = 253 bytes + Server address (1 byte) + CRC (2 bytes) = 256 bytes"
 *   "TCP MODBUS ADU  = 253 bytes + MBAP (7 bytes) = 260 bytes"
 * The 253 in the TCP line is inherited from the serial line above it. That is the finding as
 * arithmetic: the TCP frame size is a function of a serial bus constraint. */
check('C. 253 = 256 - 1 - 2, the serial derivation the document prints (APP 4.1 p5)', () => {
  return S.LIMITS.PDU_MAX === S.LIMITS.SERIAL_ADU_MAX - 1 - 2;
});
check('C. 260 = 253 + 7, so the TCP frame inherits the serial cap (APP 4.1 p5)', () => {
  return S.LIMITS.TCP_ADU_MAX === S.LIMITS.PDU_MAX + S.LIMITS.MBAP_LEN;
});
check('C. a PDU one byte over 253 is refused on serial', () => {
  try { E.wrapRTU(0x11, new Array(254).fill(0x00)); return false; } catch (e) { return true; }
});
check('C. the same PDU is refused on TCP, for the serial line\'s reason', () => {
  try { E.wrapTCP({ transactionId: 1, unitId: 0x11, pdu: new Array(254).fill(0x00) }); return false; }
  catch (e) { return true; }
});

/* Per function quantity limits. Four separate published numbers, easy to conflate. */
check('C. read coils maximum is 2000 (0x07D0) (APP Figure 11 p12)', () => S.QTY_LIMITS[S.FN.READ_COILS].max === 2000);
check('C. read holding registers maximum is 125 (0x7D) (APP 6.3 p15)', () => S.QTY_LIMITS[S.FN.READ_HOLDING].max === 125);
check('C. write multiple registers maximum is 123 (0x7B) (APP Figure 22 p31)', () => S.QTY_LIMITS[S.FN.WRITE_MULTI_REGS].max === 123);
check('C. read and write register limits are NOT the same number (125 vs 123)', () => {
  return S.QTY_LIMITS[S.FN.READ_HOLDING].max !== S.QTY_LIMITS[S.FN.WRITE_MULTI_REGS].max;
});

/* ================================================================== *
 * SECTION D. MBAP, AND THE LENGTH FIELD OFF BY ONE.
 * TCP 3.1.3 p5.
 * ================================================================== */

check('D. Protocol Identifier is 0 (TCP 3.1.3 p5: "0 = MODBUS protocol")', () => {
  const a = E.wrapTCP({ transactionId: 0x0001, unitId: 0x11, pdu: [0x03, 0x00, 0x6B, 0x00, 0x03] });
  return E.parseTCP(a).protocolId === 0;
});
check('D. the MBAP header this engine writes is 7 bytes (TCP 3.1.3 p5)', () => {
  const pdu = [0x03, 0x00, 0x6B, 0x00, 0x03];
  return E.wrapTCP({ transactionId: 1, unitId: 0x11, pdu }).length - pdu.length === 7;
});
/* TCP 3.1.3 p5, verbatim: "The length field is a byte count of the following fields, including the
 * Unit Identifier and data fields." So it is 1 + pdu.length. NOT the ADU length, NOT the PDU length. */
check('D. Length counts the unit id plus the PDU, so a 5 byte PDU gives 6 (TCP 3.1.3 p5)', () => {
  const a = E.wrapTCP({ transactionId: 1, unitId: 0x11, pdu: [0x03, 0x00, 0x6B, 0x00, 0x03] });
  return E.parseTCP(a).length === 6;
});
check('D. Length is NOT the ADU length and NOT the PDU length, the two common wrong answers', () => {
  const pdu = [0x03, 0x00, 0x6B, 0x00, 0x03];
  const a = E.wrapTCP({ transactionId: 1, unitId: 0x11, pdu });
  const len = E.parseTCP(a).length;
  return len !== a.length && len !== pdu.length && len === pdu.length + 1;
});
check('D. the length rule agrees with the published maximum: 1 + 253 = 254, and 7 + 253 = 260', () => {
  return (1 + S.LIMITS.PDU_MAX) === 254 && (S.LIMITS.MBAP_LEN + S.LIMITS.PDU_MAX) === S.LIMITS.TCP_ADU_MAX;
});
check('D. a frame whose length field disagrees with its byte count is flagged', () => {
  const a = E.wrapTCP({ transactionId: 1, unitId: 0x11, pdu: [0x03, 0x00, 0x6B, 0x00, 0x03] });
  a[5] = 0x09;                                  // claim 9 following bytes when 6 follow
  return E.parseTCP(a).lengthOk === false;
});
check('D. the transaction identifier round trips (TCP 3.1.3 p5)', () => {
  const a = E.wrapTCP({ transactionId: 0xABCD, unitId: 0x11, pdu: [0x03, 0x00, 0x6B, 0x00, 0x03] });
  return E.parseTCP(a).transactionId === 0xABCD;
});

/* The same PDU, both transports. The published examples are transport neutral, which is itself the
 * specification's design: APP 4.1 p5 defines the PDU once and the ADUs wrap it. */
check('D. the published 0x03 PDU is byte identical inside an RTU frame and a TCP frame', () => {
  const pdu = [0x03, 0x00, 0x6B, 0x00, 0x03];
  const r = E.parseRTU(E.wrapRTU(0x11, pdu)).pdu;
  const t = E.parseTCP(E.wrapTCP({ transactionId: 1, unitId: 0x11, pdu })).pdu;
  return eq(r, pdu) && eq(t, pdu) && eq(r, t);
});
/* The Unit Identifier IS the serial slave address. TCP 3.1.3 p5: the serial "slave address" field
 * "is replaced by a single byte 'Unit Identifier' within the MBAP Header". Same value, two frames. */
check('D. the TCP unit id carries the same value as the RTU slave address (TCP 3.1.3 p5)', () => {
  const pdu = [0x03, 0x00, 0x6B, 0x00, 0x03];
  return E.parseRTU(E.wrapRTU(0x11, pdu)).address === E.parseTCP(E.wrapTCP({ transactionId: 1, unitId: 0x11, pdu })).unitId;
});
check('D. exactly one MBAP field is a serial fossil, and it is the Unit Identifier', () => {
  const fossils = S.MBAP.FIELDS.filter((f) => f.serialFossil);
  return fossils.length === 1 && fossils[0].name === 'Unit Identifier';
});
check('D. registered port is 502 (TCP 4.2 p6)', () => S.MBAP.PORT === 502);

/* ================================================================== *
 * SECTION E. THE VALIDATION ORDER, WHICH IS PUBLISHED AND IS NOT THE INTUITIVE ONE.
 * APP Figure 11 p12 and Figure 22 p31.
 * ================================================================== */

const dev = { coils: 100, registers: 100 };

check('E. an unsupported function code answers 01 (APP Fig 11 p12)', () => {
  return E.validateRequest([0x42, 0x00, 0x00, 0x00, 0x01], dev) === S.EXCEPTION.ILLEGAL_FUNCTION;
});
check('E. a legal request answers no exception', () => {
  return E.validateRequest([0x03, 0x00, 0x00, 0x00, 0x03], dev) === null;
});
check('E. a bad address answers 02 (APP Fig 11 p12)', () => {
  return E.validateRequest([0x03, 0x00, 0x63, 0x00, 0x03], dev) === S.EXCEPTION.ILLEGAL_DATA_ADDRESS;
});
check('E. an over range quantity answers 03 (APP Fig 22 p31)', () => {
  return E.validateRequest([0x03, 0x00, 0x00, 0x00, 0x7E], dev) === S.EXCEPTION.ILLEGAL_DATA_VALUE;
});

/* 🔴 THE ORDER CHECK. Both published state diagrams put the quantity branch ABOVE the address
 * branch. This request is bad in BOTH ways at once: quantity 126 is over the published 125 limit AND
 * address 0x0063 + 126 runs off a 100 register device. The diagram says the quantity branch is
 * reached first, so the published answer is 03, not 02.
 *
 * An implementation that validates the address first returns 02 here and passes every other check in
 * this file. This is the only check that can tell the two apart. */
check('E. quantity is checked BEFORE address: a request bad in both ways answers 03, not 02 (APP Fig 11 p12, Fig 22 p31)', () => {
  const r = E.validateRequest([0x03, 0x00, 0x63, 0x00, 0x7E], dev);
  return r === S.EXCEPTION.ILLEGAL_DATA_VALUE;
});
check('E. the published branch order is recorded in the spec module', () => {
  return eq(S.VALIDATION_ORDER, ['function', 'quantity', 'address', 'processing']);
});
/* APP Figure 22 p31 puts "Byte Count == Quantity of Registers x 2" in the SAME branch as the
 * quantity range, so an inconsistent byte count is a 03 and not a 02 or a parse error. */
check('E. a byte count inconsistent with the quantity answers 03 (APP Fig 22 p31)', () => {
  return E.validateRequest([0x10, 0x00, 0x01, 0x00, 0x02, 0x02, 0x00, 0x0A], dev) === S.EXCEPTION.ILLEGAL_DATA_VALUE;
});
/* APP 6.5 p17: Output Value is "0x0000 or 0xFF00". 0x0001 is neither. */
check('E. Write Single Coil rejects a value that is not 0000 or FF00 (APP 6.5 p17)', () => {
  return E.validateRequest([0x05, 0x00, 0xAC, 0x00, 0x01], dev) === S.EXCEPTION.ILLEGAL_DATA_VALUE;
});
check('E. the published exception example reproduces end to end against a device that lacks the address', () => {
  // APP 7 p47: address 1185 (0x04A1), quantity 1, on a device that does not have it -> 02 -> 81 02.
  const code = E.validateRequest([0x01, 0x04, 0xA1, 0x00, 0x01], dev);
  return code === S.EXCEPTION.ILLEGAL_DATA_ADDRESS && eq(E.encodeException(0x01, code), [0x81, 0x02]);
});

/* ================================================================== *
 * 🔴 SECTION F. THE REFUSALS. THIS IS THE PRODUCT.
 *
 * Everything above proves the tool reproduces what the source publishes. This section proves it does
 * not claim what the source does not. Pattern 19: a refusal is not self enforcing.
 * ================================================================== */

checkThrows('F. decodeWide REFUSES to decode a 32 bit value with no vendor profile named', () => {
  return E.decodeWide([0x00, 0x00, 0x41, 0x20], undefined);
});
checkThrows('F. decodeWide REFUSES an invented vendor profile name', () => {
  return E.decodeWide([0x00, 0x00, 0x41, 0x20], 'acme-power-meter-9000');
});
checkThrows('F. decodeWide REFUSES even when asked for the most common convention by name', () => {
  return E.decodeWide([0x00, 0x00, 0x41, 0x20], 'big-endian-word-swap');
});
check('F. no vendor profile ships, because no meter manual has been sourced and read', () => {
  return Object.keys(S.VENDOR_PROFILES).length === 0;
});
check('F. the refusal explains WHY, so the next reader does not think it is a missing feature', () => {
  try { E.decodeWide([0, 0, 0, 0], undefined); return false; }
  catch (e) {
    return e.message.includes('no word order is specified') && e.message.includes('vendor convention');
  }
});
/* The precise claim matters. The engine must not say the spec is silent on byte order, because it is
 * not: APP 4.2 defines big endian in as many words. Overclaiming the gap would be the same error as
 * the plan's old "zero hours" scorecard, pointed at a protocol. */
check('F. the refusal does NOT claim the spec is silent on byte order, because it is not (APP 4.2 p5)', () => {
  try { E.decodeWide([0, 0, 0, 0], undefined); return false; }
  catch (e) { return e.message.includes('WITHIN a register') && e.message.includes('big endian'); }
});

/* Grep the shipped build. 03 established this: assert the absence in the artifact, not just in the
 * behaviour, because the danger is a future edit and not a current bug. */
const buildSrc = ['spec.js', 'engine.js', 'index.html']
  .map((f) => {
    const p = path.join(__dirname, '..', 'build', f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  }).join('\n');

check('F. CONTROL: the build source was actually read, so the greps below can fail', () => {
  return buildSrc.length > 5000 && buildSrc.includes('decodeWide');
});
check('F. the build contains no float decoding of any kind', () => {
  return !/getFloat32|readFloatBE|readFloatLE|Float32Array|Float64Array|fromCharCode\(.*float/i.test(buildSrc);
});
check('F. the build contains no 4xxxx or 3xxxx register convention, which is not in the spec', () => {
  return !/\b40001\b|\b30001\b|\b40[0-9]{3}\b/.test(buildSrc);
});
/*
 * ⚠ THIS CHECK FIRED A FALSE POSITIVE ON ITS FIRST RUN, AND THE REASON IS WORTH KEEPING.
 *
 * It originally grepped for the bare string `IEEE 754`, and went red against spec.js, whose comment
 * records the MEASUREMENT that the specification never mentions IEEE 754 (0 hits in 265,402
 * characters). The grep could not tell a CLAIM of conformance from a sentence documenting the
 * ABSENCE of one. A red is a claim too, and this red was wrong.
 *
 * So the pattern now matches claim GRAMMAR ("conforms to", "compliant with", "implements IEEE 754")
 * rather than a standard's name. The concern is unchanged: this build must never claim conformance
 * to a document this repo has not read. Bare mentions of a standard's name are how the repo
 * DOCUMENTS what it has not read, and must stay legal, or the guard would push this project toward
 * saying less about its own gaps to keep itself green.
 */
check('F. the build claims no conformance to TIA-485, TIA-232 or any standard this repo has not read', () => {
  return !/conforms? to|compliant with|in accordance with|implements IEEE|IEEE 754 (compliant|conformant)|per (ANSI\/)?TIA-(485|232)/i.test(buildSrc);
});
/* CONTROL for the check above: it must still go red on a real conformance claim. Without this, the
 * loosened pattern could match nothing at all and no one would know. */
check('F. CONTROL: the conformance grep still fires on an actual conformance claim', () => {
  const fixture = 'This decoder conforms to ANSI/TIA-485-A and is IEEE 754 compliant.';
  return /conforms? to|compliant with|in accordance with|implements IEEE|IEEE 754 (compliant|conformant)|per (ANSI\/)?TIA-(485|232)/i.test(fixture);
});
check('F. the build names no word order convention as a default', () => {
  return !/(word.?swap|mid.?little|mid.?big|CDAB|BADC|DCBA)\s*(=|:)\s*(true|default)/i.test(buildSrc);
});

/* ================================================================== *
 * REPORT
 * ================================================================== */
console.log(`\n05 modbus frame codec: verify against MODBUS Application Protocol V1.1b3,`);
console.log(`MODBUS over Serial Line V1.02, and MODBUS Messaging on TCP/IP V1.0b (modbus.org).\n`);

if (failures.length) {
  console.log(`${pass} passed, ${failures.length} FAILED\n`);
  for (const f of failures) console.log(`  FAIL  ${f}\n`);
  process.exit(1);
}
console.log(`  ${pass} checks passed.`);
console.log(`  Five published worked examples reproduced byte for byte.`);
console.log(`  Section F: the tool still refuses to decode a 32 bit value it has no source for.\n`);

/*
 * HONEST GAPS IN THIS SUITE. Recorded here because a suite that hides its holes is worse than one
 * that has none.
 *
 * 1. THE CRC ALGORITHM IS NOT VERIFIED AGAINST A PUBLISHED MESSAGE TO CRC PAIR. The Serial guide
 *    publishes the PROCEDURE (preload FFFF, polynomial 0xA001, LSB first) and the BYTE ORDER
 *    (Figure 30: value 0x1241 is placed 41 12), and both are asserted above. It does not print a
 *    worked "these message bytes produce this CRC" example that was found and rendered. So the
 *    implementation rests on the procedure text, plus the round trip and bit flip checks in section
 *    B, which prove it is self consistent and input sensitive but NOT that it is the same CRC a real
 *    device computes.
 *    Deliberately NOT closed with a value from a tutorial or from memory: pattern 20 says only
 *    mutate and assert boundaries the source publishes, and inventing a fixture to turn the suite
 *    green is how a suite starts inventing facts.
 *    THE FIX, when someone has the budget: the Serial guide pages 40 to 42 publish a reference C
 *    implementation with two 256 entry lookup tables. Transcribe them AT THE PUBLISHER, rendered,
 *    and check the bitwise procedure reproduces all 512 values. That is 02's shape exactly, an
 *    equation agreeing with its own document's table, and it would close this properly.
 *
 * 2. No meter register map is verified, because none is sourced. Section F asserts that absence
 *    rather than papering over it.
 *
 * 3. Function codes 0x02, 0x04, 0x06, 0x0F and the diagnostics subcodes are not implemented. The
 *    spec publishes examples for them; they were not rendered and are not claimed.
 *
 * 4. 🔴 THE ANSWER KEY CANNOT CHECK ITSELF, AND A FALSE GREEN PROVED IT.
 *    Found while trying to prove the published Pages bytes could go red. The first corruption
 *    control edited `0xCD, 0x6B, 0x05` in spec.js and THE SUITE STAYED GREEN. The string is on two
 *    lines: the published `response`, and the `decoded.statusBytes` that encodeResponse builds FROM.
 *    Corrupting both moved the fixture and the expectation together, so they still agreed. A control
 *    that reports silence can be a control that never ran.
 *    Corrupting only the `response` line goes red correctly (78 passed, 1 FAILED, exit 1), so the
 *    suite is live. But the underlying property is real and worth naming: for each example, the
 *    published bytes and the published field values are two representations of the SAME transcribed
 *    fact, and no assertion in this file can tell you the transcription was right. A test cannot
 *    catch a misread page.
 *    THAT is why pattern 12 is not optional here and why the provenance note in spec.js is part of
 *    the evidence rather than decoration: the only instrument that can validate an answer key is a
 *    SECOND READER at the publisher. Two readers rendered every page at 3x, never saw each other's
 *    transcription, and agreed on every byte of all five examples. If a sixth example is ever added,
 *    it gets read twice or it does not go in.
 */
