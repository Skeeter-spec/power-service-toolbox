/*
 * engine.js. A Modbus frame codec that reproduces the specification's published worked examples,
 * and refuses to go one inch past what the specification actually says.
 *
 * THE THESIS, WHICH IS A QUOTE AND NOT AN OPINION: Modbus TCP is a serial protocol wearing a TCP
 * header. The PDU is capped at 253 bytes because "the size constraint inherited from the first
 * MODBUS implementation on Serial Line network (max. RS485 ADU = 256 bytes)" (APP 4.1, p5), and the
 * MBAP header spends one of its four fields on a Unit Identifier defined as "Identification of a
 * remote slave connected on a serial line or on other buses" (TCP 3.1.3, p5). Encode the same PDU
 * both ways and the fossils are visible on the wire.
 *
 * WHAT THIS ENGINE REFUSES TO DO, AND WHY THAT IS THE POINT:
 *   - It will not decode a 32 bit value across two registers. The specification defines no data type
 *     wider than one register, so there is no published word order to follow. See decodeWide().
 *   - It will not translate 4xxxx style register numbers. That convention is not in the spec.
 *   - It claims no conformance to TIA-485-A or TIA-232-F. Both are paywalled and unread.
 *
 * See ./spec.js for every constant and its page, and ../sources/SOURCES.md for the audit.
 */
'use strict';

const S = (typeof require !== 'undefined' && typeof module !== 'undefined')
  ? require('./spec.js')
  : window.MODBUS_SPEC;

/* ================================================================== *
 * CRC. SERIAL 6.2.2, p39/44.
 * ================================================================== */

/*
 * The generation procedure, implemented step for step from the published text:
 *   1. Load a 16-bit register with FFFF hex.
 *   2. Exclusive OR the first 8-bit byte with the low-order byte of the CRC register.
 *   3. Shift right toward the LSB, zero filling the MSB. Extract and examine the LSB.
 *   4. If the LSB was 1, exclusive OR with the polynomial value 0xA001.
 *   5-6. Repeat for 8 shifts per byte, and for every byte.
 *   7. The final content of the CRC register is the CRC value.
 */
function crc16(bytes) {
  let crc = S.CRC.PRELOAD;
  for (const b of bytes) {
    crc ^= (b & 0xFF);
    for (let i = 0; i < 8; i++) {
      if (crc & 1) crc = (crc >>> 1) ^ S.CRC.POLYNOMIAL;
      else crc >>>= 1;
    }
  }
  return crc & 0xFFFF;
}

/*
 * THE ONE FIELD THAT BREAKS THE PROTOCOL'S OWN BIG ENDIAN RULE.
 *
 * SERIAL 6.2.2 p39, verbatim: "When the 16-bit CRC (two 8-bit bytes) is transmitted in the message,
 * the low-order byte will be transmitted first, followed by the high-order byte."
 *
 * Figure 30, same page: CRC value 1241 hex is placed as CRC Lo = 0x41 then CRC Hi = 0x12.
 *
 * Compare APP 4.2 p5, where data 0x1234 goes out as 12 then 34. Same protocol, opposite order, and
 * the two documents happen to use almost the same example value. This function is where that lives.
 */
function crcToBytes(crc) {
  return [crc & 0xFF, (crc >>> 8) & 0xFF];   // low order byte FIRST. Not a typo.
}

/* ================================================================== *
 * BIG ENDIAN HELPERS. APP 4.2, p5.
 * "the most significant byte is sent first"
 * ================================================================== */
function u16ToBytes(v) {
  if (!Number.isInteger(v) || v < 0 || v > 0xFFFF) throw new RangeError(`not a 16 bit value: ${v}`);
  return [(v >>> 8) & 0xFF, v & 0xFF];
}
function bytesToU16(hi, lo) { return ((hi & 0xFF) << 8) | (lo & 0xFF); }

/* ================================================================== *
 * PDU ENCODE. The bytes below the address and below the transport.
 * ================================================================== */
function encodeRequest(fn, p) {
  switch (fn) {
    case S.FN.READ_COILS:
    case S.FN.READ_DISCRETE:
    case S.FN.READ_HOLDING:
      return [fn, ...u16ToBytes(p.startAddress), ...u16ToBytes(p.quantity)];

    case S.FN.WRITE_SINGLE_COIL:
      // APP 6.5 p17: Output Value is "0x0000 or 0xFF00". Nothing else is a legal value.
      if (p.value !== S.COIL_ON && p.value !== S.COIL_OFF) {
        throw new RangeError(`Write Single Coil value must be 0xFF00 or 0x0000 (APP 6.5 p17), got 0x${p.value.toString(16)}`);
      }
      return [fn, ...u16ToBytes(p.outputAddress), ...u16ToBytes(p.value)];

    case S.FN.WRITE_MULTI_REGS: {
      const regs = p.registers;
      const body = regs.flatMap(u16ToBytes);
      // APP 6.12 p30: Byte Count = 2 x N, where N = Quantity of Registers.
      return [fn, ...u16ToBytes(p.startAddress), ...u16ToBytes(regs.length), body.length, ...body];
    }
    default:
      throw new RangeError(`function code 0x${fn.toString(16)} is not implemented here`);
  }
}

function encodeResponse(fn, p) {
  switch (fn) {
    case S.FN.READ_COILS:
    case S.FN.READ_DISCRETE:
      return [fn, p.statusBytes.length, ...p.statusBytes];

    case S.FN.READ_HOLDING: {
      const body = p.registers.flatMap(u16ToBytes);
      return [fn, body.length, ...body];        // APP 6.3 p15: Byte count = 2 x N
    }
    case S.FN.WRITE_SINGLE_COIL:
      return [fn, ...u16ToBytes(p.outputAddress), ...u16ToBytes(p.value)];   // an echo

    case S.FN.WRITE_MULTI_REGS:
      // APP 6.12 p30: "The normal response returns the function code, starting address, and quantity
      // of registers written." It does NOT echo the data. The trailing comment is load bearing: it
      // is what makes this line distinguishable from the identical one in encodeRequest, so a mutant
      // can target the response without also breaking the request.
      return [fn, ...u16ToBytes(p.startAddress), ...u16ToBytes(p.quantity)];   // no data echoed

    default:
      throw new RangeError(`function code 0x${fn.toString(16)} is not implemented here`);
  }
}

/*
 * APP section 7, p47: "the server sets the MSB of the function code to 1. This makes the function
 * code value in an exception response exactly 80 hexadecimal higher".
 */
function encodeException(fn, exceptionCode) {
  return [fn + S.EXCEPTION_OFFSET, exceptionCode];
}

function isException(pdu) { return (pdu[0] & S.EXCEPTION_OFFSET) !== 0; }

/* ================================================================== *
 * PDU DECODE.
 * ================================================================== */
function decodeRequest(pdu) {
  const fn = pdu[0];
  switch (fn) {
    case S.FN.READ_COILS:
    case S.FN.READ_DISCRETE:
    case S.FN.READ_HOLDING:
      return { fn, startAddress: bytesToU16(pdu[1], pdu[2]), quantity: bytesToU16(pdu[3], pdu[4]) };
    case S.FN.WRITE_SINGLE_COIL:
      return { fn, outputAddress: bytesToU16(pdu[1], pdu[2]), value: bytesToU16(pdu[3], pdu[4]) };
    case S.FN.WRITE_MULTI_REGS: {
      const byteCount = pdu[5];
      const registers = [];
      for (let i = 0; i < byteCount; i += 2) registers.push(bytesToU16(pdu[6 + i], pdu[7 + i]));
      return {
        fn, startAddress: bytesToU16(pdu[1], pdu[2]), quantity: bytesToU16(pdu[3], pdu[4]),
        byteCount, registers,
      };
    }
    default:
      throw new RangeError(`function code 0x${fn.toString(16)} is not implemented here`);
  }
}

function decodeResponse(pdu) {
  if (isException(pdu)) {
    return { fn: pdu[0] - S.EXCEPTION_OFFSET, exception: true, exceptionCode: pdu[1] };
  }
  const fn = pdu[0];
  switch (fn) {
    case S.FN.READ_COILS:
    case S.FN.READ_DISCRETE:
      return { fn, exception: false, byteCount: pdu[1], statusBytes: pdu.slice(2) };
    case S.FN.READ_HOLDING: {
      const byteCount = pdu[1];
      const registers = [];
      for (let i = 0; i < byteCount; i += 2) registers.push(bytesToU16(pdu[2 + i], pdu[3 + i]));
      return { fn, exception: false, byteCount, registers };
    }
    case S.FN.WRITE_SINGLE_COIL:
      return { fn, exception: false, outputAddress: bytesToU16(pdu[1], pdu[2]), value: bytesToU16(pdu[3], pdu[4]) };
    case S.FN.WRITE_MULTI_REGS:
      return { fn, exception: false, startAddress: bytesToU16(pdu[1], pdu[2]), quantity: bytesToU16(pdu[3], pdu[4]) };
    default:
      throw new RangeError(`function code 0x${fn.toString(16)} is not implemented here`);
  }
}

/* ================================================================== *
 * VALIDATION, IN THE PUBLISHED ORDER.
 *
 * APP Figure 11 (p12) and Figure 22 (p31) both branch: function code -> quantity (03) ->
 * address (02) -> processing (04). QUANTITY IS CHECKED BEFORE ADDRESS. A server that checks the
 * address first answers 02 where the specification's own diagram answers 03.
 *
 * `device` describes what the server actually has: { coils: n, registers: n }. There is no published
 * device to model, so this is a parameter, not a constant.
 * ================================================================== */
function validateRequest(pdu, device) {
  const fn = pdu[0];

  // 1. Function code supported? -> ExceptionCode 01
  if (!Object.values(S.FN).includes(fn)) return S.EXCEPTION.ILLEGAL_FUNCTION;

  const req = decodeRequest(pdu);

  // 2. Quantity in range, and byte count consistent? -> ExceptionCode 03
  const lim = S.QTY_LIMITS[fn];
  if (lim) {
    if (req.quantity < lim.min || req.quantity > lim.max) return S.EXCEPTION.ILLEGAL_DATA_VALUE;
  }
  if (fn === S.FN.WRITE_MULTI_REGS) {
    // APP Figure 22 p31: "Byte Count == Quantity of Registers x 2", checked in the SAME branch as
    // the quantity range, so it yields 03 and not 02.
    if (req.byteCount !== req.quantity * 2) return S.EXCEPTION.ILLEGAL_DATA_VALUE;
  }
  if (fn === S.FN.WRITE_SINGLE_COIL) {
    if (req.value !== S.COIL_ON && req.value !== S.COIL_OFF) return S.EXCEPTION.ILLEGAL_DATA_VALUE;
  }

  // 3. Starting address OK, AND starting address + quantity OK? -> ExceptionCode 02
  const space = (fn === S.FN.READ_HOLDING || fn === S.FN.WRITE_MULTI_REGS) ? device.registers : device.coils;
  const start = (fn === S.FN.WRITE_SINGLE_COIL) ? req.outputAddress : req.startAddress;
  const span  = (fn === S.FN.WRITE_SINGLE_COIL) ? 1 : req.quantity;
  if (start >= space || start + span > space) return S.EXCEPTION.ILLEGAL_DATA_ADDRESS;

  return null;   // no exception
}

/* ================================================================== *
 * TRANSPORT A: RTU over serial. SERIAL 2.5.1 and 6.2.2.
 * ADU = address (1) + PDU + CRC (2). APP 4.1 p5: 256 bytes maximum.
 * ================================================================== */
function wrapRTU(address, pdu) {
  if (pdu.length > S.LIMITS.PDU_MAX) {
    throw new RangeError(`PDU is ${pdu.length} bytes, over the published maximum of ${S.LIMITS.PDU_MAX} (APP 4.1 p5)`);
  }
  const body = [address & 0xFF, ...pdu];
  const adu = [...body, ...crcToBytes(crc16(body))];
  if (adu.length > S.LIMITS.SERIAL_ADU_MAX) {
    throw new RangeError(`serial ADU is ${adu.length} bytes, over the published maximum of ${S.LIMITS.SERIAL_ADU_MAX}`);
  }
  return adu;
}

function parseRTU(adu) {
  const body = adu.slice(0, -2);
  const [lo, hi] = adu.slice(-2);
  const received = bytesToU16(hi, lo);          // low byte came FIRST on the wire
  return {
    address: adu[0],
    pdu: adu.slice(1, -2),
    crcReceived: received,
    crcComputed: crc16(body),
    crcOk: received === crc16(body),
  };
}

/* ================================================================== *
 * TRANSPORT B: MBAP over TCP. TCP 3.1.3, p5/46.
 *
 * THE LENGTH FIELD, verbatim: "The length field is a byte count of the following fields, including
 * the Unit Identifier and data fields." So length = 1 + pdu.length. Not the ADU, not the PDU.
 * ================================================================== */
function wrapTCP({ transactionId, unitId, pdu }) {
  if (pdu.length > S.LIMITS.PDU_MAX) {
    throw new RangeError(`PDU is ${pdu.length} bytes, over the published maximum of ${S.LIMITS.PDU_MAX} (APP 4.1 p5)`);
  }
  const length = 1 + pdu.length;
  const adu = [
    ...u16ToBytes(transactionId),
    ...u16ToBytes(S.MBAP.PROTOCOL_ID),   // TCP 3.1.3 p5: "0 = MODBUS protocol"
    ...u16ToBytes(length),
    unitId & 0xFF,
    ...pdu,
  ];
  if (adu.length > S.LIMITS.TCP_ADU_MAX) {
    throw new RangeError(`TCP ADU is ${adu.length} bytes, over the published maximum of ${S.LIMITS.TCP_ADU_MAX} (APP 4.1 p5)`);
  }
  return adu;
}

function parseTCP(adu) {
  const length = bytesToU16(adu[4], adu[5]);
  return {
    transactionId: bytesToU16(adu[0], adu[1]),
    protocolId: bytesToU16(adu[2], adu[3]),
    length,
    unitId: adu[6],
    pdu: adu.slice(7),
    // The length field counts the unit id plus the PDU, so this is the check that catches a stream
    // desynchronising. TCP 3.1.3 p5.
    lengthOk: length === 1 + (adu.length - S.LIMITS.MBAP_LEN),
  };
}

/* ================================================================== *
 * DECODE REGISTER DATA.
 * ================================================================== */

/*
 * 16 bit registers. This one is specified, so this one is implemented.
 * APP 4.2 p5: big endian, most significant byte first, worked at exactly this width.
 * APP 6.3 p15: "For each register, the first byte contains the high order bits and the second
 * contains the low order bits."
 */
function decodeRegisters16(bytes) {
  if (bytes.length % 2 !== 0) throw new RangeError('register data must be a whole number of registers');
  const out = [];
  for (let i = 0; i < bytes.length; i += 2) out.push(bytesToU16(bytes[i], bytes[i + 1]));
  return out;
}

/*
 * 🔴 THE REFUSAL. THIS FUNCTION EXISTS TO THROW, AND THAT IS NOT A BUG.
 *
 * A 32 bit float or long spread across two registers needs a word order. The specification does not
 * define one, because it does not define ANY data type wider than one register. Measured across all
 * three documents, 265,402 characters, controls firing 176 to 538 times: float 0, floating 0,
 * ieee 754 0, 32-bit 0, word order 0, byte order 0.
 *
 * Note the precise claim, because the sloppy version of it is FALSE. Modbus DOES define byte order:
 * APP 4.2 says big endian in as many words. What it never does is define anything for a word order to
 * apply to. So word order is a vendor convention living entirely outside these documents, and the
 * only honest source for one is a named vendor's manual read at its publisher.
 *
 * No meter manual has been sourced for this project, so VENDOR_PROFILES is empty and every call here
 * throws. When a manual is sourced, add the profile there and cite it in SOURCES.md. Do not add a
 * default. Do not add a "most common" order. A default here would fabricate the very agreement this
 * project exists to disprove, and it would do it silently, in a decoder someone trusts.
 */
function decodeWide(bytes, profileName) {
  const profile = S.VENDOR_PROFILES[profileName];
  if (!profile) {
    throw new Error(
      `Cannot decode a 32 bit value: no word order is specified.\n` +
      `The Modbus specification defines byte order WITHIN a register (big endian, APP 4.2 p5) and ` +
      `defines no data type wider than one register, so it publishes no word order to follow.\n` +
      `Word order is a vendor convention. Name a sourced vendor profile to decode this.\n` +
      `Profiles available: ${Object.keys(S.VENDOR_PROFILES).length === 0 ? '(none sourced yet)' : Object.keys(S.VENDOR_PROFILES).join(', ')}`
    );
  }
  return profile.decode(bytes);
}

/* ================================================================== *
 * FIELD LABELS.
 *
 * 🔴 THIS LIVES HERE, IN THE TESTABLE ENGINE, BECAUSE OF THE BUG IT ONCE HAD.
 *
 * It started life inside index.html, guessing the field names from the PDU's LENGTH. That works
 * until it does not: the Read Coils REQUEST and the Read Coils RESPONSE are BOTH five bytes
 * (01 00 13 00 13 and 01 03 CD 6B 05, APP 6.1 p12). So the published response rendered with the
 * request's labels, and the tool told the reader that CD 6B 05 were an address and a quantity when
 * the page calls them coil status bytes. Every byte on screen was correct. Nothing overflowed,
 * nothing threw, the node suite was green and the browser structural check was green, because both
 * were looking at bytes and neither was looking at WORDS. Only an eye caught it, on a tool whose
 * entire purpose is teaching someone which byte is which.
 *
 * Same shape as 03's emergency lane reading "failed" at t=0: nothing broken, one name meaning two
 * things, and the wrong meaning was the one on screen. So the label set is now a function of the
 * PDU *and its direction*, direction is a required argument rather than a guess, and verify.js
 * asserts that a request and a response of identical length get different labels.
 * ================================================================== */
function fieldLabels(pdu, kind) {
  if (kind !== 'request' && kind !== 'response') {
    throw new RangeError(`fieldLabels needs a direction ('request' or 'response'), got ${kind}. ` +
      `It cannot be inferred: Read Coils requests and responses are both 5 bytes.`);
  }
  if (isException(pdu)) return ['Fn+0x80', 'Exc code'];

  const fn = pdu[0];
  const data = (n) => Array.from({ length: n }, () => 'Data');

  if (kind === 'request') {
    switch (fn) {
      case S.FN.READ_COILS: case S.FN.READ_DISCRETE: case S.FN.READ_HOLDING:
        return ['Function', 'Addr Hi', 'Addr Lo', 'Qty Hi', 'Qty Lo'];
      case S.FN.WRITE_SINGLE_COIL:
        return ['Function', 'Addr Hi', 'Addr Lo', 'Val Hi', 'Val Lo'];
      case S.FN.WRITE_MULTI_REGS:
        return ['Function', 'Addr Hi', 'Addr Lo', 'Qty Hi', 'Qty Lo', 'Byte count', ...data(pdu.length - 6)];
      default: return ['Function', ...data(pdu.length - 1)];
    }
  }
  switch (fn) {
    // APP 6.1 p12 names these "Byte Count" and "Outputs status 27-20" and so on. They are NOT an
    // address and a quantity, which is exactly what this function used to claim.
    case S.FN.READ_COILS: case S.FN.READ_DISCRETE:
      return ['Function', 'Byte count', ...Array.from({ length: pdu.length - 2 }, () => 'Coil status')];
    case S.FN.READ_HOLDING:
      return ['Function', 'Byte count', ...Array.from({ length: pdu.length - 2 }, (_, i) =>
        (i % 2 === 0) ? 'Reg Hi' : 'Reg Lo')];
    case S.FN.WRITE_SINGLE_COIL:
      return ['Function', 'Addr Hi', 'Addr Lo', 'Val Hi', 'Val Lo'];   // APP 6.5 p18: an echo
    case S.FN.WRITE_MULTI_REGS:
      return ['Function', 'Addr Hi', 'Addr Lo', 'Qty Hi', 'Qty Lo'];   // APP 6.12 p30: no data echoed
    default: return ['Function', ...data(pdu.length - 1)];
  }
}

/* ================================================================== *
 * THE THESIS, MADE INSPECTABLE.
 *
 * Encode one PDU for both transports and report which parts of each frame are fossils of a serial
 * bus. Every entry's `why` is a quote from a free, publisher hosted document.
 * ================================================================== */
function compareTransports({ address = 0x11, transactionId = 0x0001, pdu }) {
  const rtu = wrapRTU(address, pdu);
  const tcp = wrapTCP({ transactionId, unitId: address, pdu });
  return {
    pdu,
    rtu: { bytes: rtu, overhead: rtu.length - pdu.length },
    tcp: { bytes: tcp, overhead: tcp.length - pdu.length },
    fossils: [
      {
        what: `PDU capped at ${S.LIMITS.PDU_MAX} bytes on BOTH transports`,
        why: 'APP 4.1 p5: "The size of the MODBUS PDU is limited by the size constraint inherited ' +
             'from the first MODBUS implementation on Serial Line network (max. RS485 ADU = 256 bytes)."',
      },
      {
        what: 'MBAP spends 1 of its 4 fields on a Unit Identifier',
        why: 'TCP 3.1.3 p5: the Unit Identifier is "Identification of a remote slave connected on a ' +
             'serial line or on other buses", used "via devices such as bridges, routers and gateways ' +
             'that use a single IP address to support multiple independent MODBUS end units."',
      },
      {
        what: 'RTU spends its last 2 bytes on a CRC that TCP does not carry',
        why: 'TCP 3.1.3 p5: on Ethernet, "use of a CRC-32 error check code (on Ethernet) results in ' +
             'an infinitesimal chance of undetected corruption". The serial bus had no such layer.',
      },
    ],
  };
}

const API = {
  crc16, crcToBytes, u16ToBytes, bytesToU16,
  encodeRequest, encodeResponse, encodeException, isException, fieldLabels,
  decodeRequest, decodeResponse, validateRequest,
  wrapRTU, parseRTU, wrapTCP, parseTCP,
  decodeRegisters16, decodeWide, compareTransports,
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
else window.MODBUS_ENGINE = API;
