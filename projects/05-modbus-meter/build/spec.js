/*
 * spec.js. WHAT THE SPECIFICATIONS PUBLISH. Nothing here is invented, inferred, or rounded.
 *
 * Every constant carries the document, the section and the page it was read on. Every page cited
 * here was rendered at 3x and read as an image, because this repo has twice been burned by a PDF
 * text layer: a two column layout stitched a sentence that does not exist, and a flattened fraction
 * bar produced two different wrong equations from the same scan. See pattern 10 and 16.
 *
 * THREE DOCUMENTS, ALL FREE, ALL READ AT THE PUBLISHER (www.modbus.org, no login):
 *   APP    MODBUS Application Protocol Specification V1.1b3, April 26 2012
 *   SERIAL MODBUS over Serial Line Specification and Implementation Guide V1.02, Dec 20 2006
 *   TCP    MODBUS Messaging on TCP/IP Implementation Guide V1.0b, October 24 2006
 *
 * Quoted strings keep the documents' own punctuation. Hyphens inside quotes are theirs.
 */
'use strict';

/* ------------------------------------------------------------------ *
 * 1. SIZE LIMITS, AND WHY THEY ARE THE SIZES THEY ARE
 *
 * APP section 4.1, p5/50, verbatim:
 *
 *   "The size of the MODBUS PDU is limited by the size constraint inherited from the first MODBUS
 *    implementation on Serial Line network (max. RS485 ADU = 256 bytes)."
 *
 * This is the whole finding of this project in one sentence from the publisher. The TCP frame is
 * 260 bytes because an RS-485 bus was 256. Do not "clean this up" to a round number.
 * ------------------------------------------------------------------ */
const LIMITS = {
  PDU_MAX: 253,          // APP 4.1 p5: 256 - server address (1) - CRC (2)
  SERIAL_ADU_MAX: 256,   // APP 4.1 p5: "RS232 / RS485 ADU = 253 bytes + Server address (1 byte) + CRC (2 bytes) = 256 bytes"
  TCP_ADU_MAX: 260,      // APP 4.1 p5: "TCP MODBUS ADU = 253 bytes + MBAP (7 bytes) = 260 bytes"
  MBAP_LEN: 7,           // TCP 3.1.3 p5: "The header is 7 bytes long"
};

/* ------------------------------------------------------------------ *
 * 2. PER FUNCTION QUANTITY LIMITS
 *
 * Four different numbers that are easy to conflate and are each published separately. Read off the
 * request tables and the state diagrams. Note 2000 and 1968 are NOT the same, and 125 and 123 are
 * NOT the same: coils and registers differ, and reading and writing differ.
 * ------------------------------------------------------------------ */
const FN = {
  READ_COILS:        0x01,  // APP 6.1  p12
  READ_DISCRETE:     0x02,  // APP 6.2  p12
  READ_HOLDING:      0x03,  // APP 6.3  p15
  WRITE_SINGLE_COIL: 0x05,  // APP 6.5  p17-18
  WRITE_MULTI_REGS:  0x10,  // APP 6.12 p30-31
};

const QTY_LIMITS = {
  [FN.READ_COILS]:       { min: 0x0001, max: 0x07D0 },  // 2000. APP Figure 11, p12
  [FN.READ_DISCRETE]:    { min: 0x0001, max: 0x07D0 },  // 2000. APP 6.2, p12
  [FN.READ_HOLDING]:     { min: 0x0001, max: 0x007D },  // 125.  APP 6.3 request table, p15
  [FN.WRITE_MULTI_REGS]: { min: 0x0001, max: 0x007B },  // 123.  APP Figure 22, p31
};

/* Write Single Coil takes a value, not a quantity. APP 6.5 p17-18: "0x0000 or 0xFF00". */
const COIL_ON  = 0xFF00;
const COIL_OFF = 0x0000;

/* ------------------------------------------------------------------ *
 * 3. EXCEPTIONS
 *
 * APP section 7, p47/50, verbatim:
 *
 *   "In an exception response, the server sets the MSB of the function code to 1. This makes the
 *    function code value in an exception response exactly 80 hexadecimal higher than the value would
 *    be for a normal response."
 * ------------------------------------------------------------------ */
const EXCEPTION_OFFSET = 0x80;

const EXCEPTION = {
  ILLEGAL_FUNCTION:     0x01,
  ILLEGAL_DATA_ADDRESS: 0x02,
  ILLEGAL_DATA_VALUE:   0x03,
  SERVER_DEVICE_FAILURE:0x04,
};

/*
 * THE VALIDATION ORDER IS PUBLISHED, AND IT IS NOT THE ORDER MOST PEOPLE WRITE.
 *
 * APP Figure 11 (Read Coils state diagram, p12) and Figure 22 (Write Multiple Registers state
 * diagram, p31) both branch in this exact sequence:
 *
 *   function code supported?          NO -> ExceptionCode = 01
 *   quantity in range (and byte count consistent)?  NO -> ExceptionCode = 03
 *   starting address OK, and address + quantity OK? NO -> ExceptionCode = 02
 *   processing OK?                    NO -> ExceptionCode = 04
 *
 * QUANTITY (03) IS CHECKED BEFORE ADDRESS (02). A server that validates the address first returns
 * 02 where the specification's own diagram returns 03. The engine follows the diagram.
 */
const VALIDATION_ORDER = ['function', 'quantity', 'address', 'processing'];

/* ------------------------------------------------------------------ *
 * 4. BYTE ORDER. THE SPECIFICATION DOES DEFINE THIS. READ THE SCOPE CAREFULLY.
 *
 * APP section 4.2 Data Encoding, p5/50, verbatim:
 *
 *   "MODBUS uses a 'big-Endian' representation for addresses and data items. This means that when a
 *    numerical quantity larger than a single byte is transmitted, the most significant byte is sent
 *    first."
 *
 * Its worked example on the same page is a table headed "Register size" with exactly ONE row:
 *
 *   16 - bits    0x1234    "the first byte sent is 0x12 then 0x34"
 *
 * So the rule is published and it is illustrated at exactly one width: the width of one register.
 * The specification defines no data type wider than a register anywhere. Measured across all three
 * documents, 265,402 characters, with controls firing 176 to 538 times: float 0, floating 0,
 * ieee 754 0, 32-bit 0, word order 0, byte order 0.
 *
 * ⇒ "Modbus does not define byte order" is FALSE. "Modbus defines byte order within a register and
 *   defines nothing wider than a register" is TRUE. See engine.js decodeWide() for what follows.
 * ------------------------------------------------------------------ */
const ENDIAN_EXAMPLE = { registerBits: 16, value: 0x1234, bytes: [0x12, 0x34] };  // APP 4.2 p5

/* ------------------------------------------------------------------ *
 * 5. THE CRC, WHICH IS THE ONE FIELD THAT BREAKS THE RULE ABOVE
 *
 * SERIAL section 6.2.2, p39/44. The generation procedure, verbatim in part:
 *
 *   "1. Load a 16-bit register with FFFF hex (all 1's). Call this the CRC register."
 *   "(If the LSB was 1): Exclusive OR the CRC register with the polynomial value 0xA001
 *    (1010 0000 0000 0001)."
 *   "8. When the CRC is placed into the message, its upper and lower bytes must be swapped as
 *    described below."
 *
 * And under "Placing the CRC into the Message", verbatim:
 *
 *   "When the 16-bit CRC (two 8-bit bytes) is transmitted in the message, the low-order byte will be
 *    transmitted first, followed by the high-order byte."
 *
 * Figure 30 worked example: CRC value 1241 hex is transmitted as CRC Lo = 0x41, CRC Hi = 0x12.
 *
 * PUT THE TWO PUBLISHED EXAMPLES SIDE BY SIDE AND THE POINT IS UNMISSABLE:
 *   section 4.2:  data 0x1234 -> 12 34   (most significant byte first)
 *   Figure 30:    CRC  0x1241 -> 41 12   (least significant byte first)
 * Two documents, near identical example values, opposite byte order. The CRC is the exception to the
 * protocol's own stated rule. Get it backwards and every frame fails its check.
 * ------------------------------------------------------------------ */
const CRC = {
  PRELOAD: 0xFFFF,     // SERIAL 6.2.2 p39 step 1
  POLYNOMIAL: 0xA001,  // SERIAL 6.2.2 p39 step 4
  EXAMPLE: { value: 0x1241, bytes: [0x41, 0x12] },  // SERIAL Figure 30 p39
};

/* ------------------------------------------------------------------ *
 * 6. THE MBAP HEADER, AND THE TWO SERIAL FOSSILS INSIDE IT
 *
 * TCP section 3.1.3, p5/46. Field table read as a rendered image:
 *
 *   Transaction Identifier  2 Bytes  "Identification of a MODBUS Request / Response transaction."
 *   Protocol Identifier     2 Bytes  "0 = MODBUS protocol"
 *   Length                  2 Bytes  "Number of following bytes"
 *   Unit Identifier         1 Byte   "Identification of a remote slave connected on a serial line
 *                                     or on other buses."
 *
 * THE LENGTH RULE, verbatim, p5/46:
 *
 *   "Length - The length field is a byte count of the following fields, including the Unit
 *    Identifier and data fields."
 *
 * So length = 1 (unit id) + PDU length. NOT the whole ADU, NOT just the PDU. This is the classic
 * framing off by one, and it is why a decoder that "looks right" desynchronises on a stream.
 * Arithmetic check against APP p5: 7 + 253 = 260 = TCP_ADU_MAX, and length = 1 + 253 = 254. Agrees.
 *
 * THE UNIT IDENTIFIER, verbatim, TCP p5/46:
 *
 *   "The MODBUS 'slave address' field usually used on MODBUS Serial Line is replaced by a single
 *    byte 'Unit Identifier' within the MBAP Header. The 'Unit Identifier' is used to communicate via
 *    devices such as bridges, routers and gateways that use a single IP address to support multiple
 *    independent MODBUS end units."
 *
 * A TCP header carrying a field whose defined job is addressing a slave on a serial line, wrapping a
 * PDU capped at 253 bytes because an RS-485 ADU was 256. That is the project's thesis, and both
 * halves are quotes.
 * ------------------------------------------------------------------ */
const MBAP = {
  PROTOCOL_ID: 0x0000,  // TCP 3.1.3 p5: "0 = MODBUS protocol"
  PORT: 502,            // TCP 4.2 p6: "All MODBUS/TCP ADU are sent via TCP to registered port 502."
  FIELDS: [
    { name: 'Transaction Identifier', bytes: 2, serialFossil: false },
    { name: 'Protocol Identifier',    bytes: 2, serialFossil: false },
    { name: 'Length',                 bytes: 2, serialFossil: false },
    { name: 'Unit Identifier',        bytes: 1, serialFossil: true  },
  ],
};

/* ------------------------------------------------------------------ *
 * 7. THE ANSWER KEY. FIVE PUBLISHED WORKED EXAMPLES, IN THE DOCUMENT'S OWN HEX.
 *
 * The verify gate for this repo: an app is not published until it reproduces a published worked
 * example and the bytes match the book. These are those bytes.
 *
 * PROVENANCE, because this is the load bearing part: every frame below was read off a page rendered
 * at 3x, by TWO independent readers who each fetched the publisher's own PDF (sha256 f80d0d71...,
 * 932,519 bytes) and never saw each other's transcription. They agreed on every byte of all five.
 * Agreement is the evidence. See pattern 12.
 *
 * TRAP, recorded because it is invisible once fixed: the 0x10 example's table SPANS A PAGE BREAK
 * (rows 1 to 3 on p30, rows 4 to 10 on p31). A page scoped extractor silently yields a truncated but
 * perfectly well formed three row table. Both readers rendered both pages.
 *
 * TRAP 2: the 0x10 caption reads "starting at 2" while its table reads Starting Address Lo = 01.
 * The table is right and the caption is loose: APP 6.3 p15 states "In the PDU Registers are
 * addressed starting at zero." REPRODUCE THE TABLE, NEVER THE CAPTION.
 */
const PUBLISHED = [
  {
    id: 'read-coils',
    doc: 'APP V1.1b3', section: '6.1', page: '12/50',
    caption: 'a request to read discrete outputs 20-38',
    request:  [0x01, 0x00, 0x13, 0x00, 0x13],
    response: [0x01, 0x03, 0xCD, 0x6B, 0x05],
    // APP p12 prose: "The status of outputs 27-20 is shown as the byte value CD hex, or binary
    // 1100 1101. Output 27 is the MSB of this byte, and output 20 is the LSB."
    decoded: { startAddress: 0x0013, quantity: 0x0013, statusBytes: [0xCD, 0x6B, 0x05] },
  },
  {
    id: 'read-holding',
    doc: 'APP V1.1b3', section: '6.3', page: '15/50',
    caption: 'a request to read registers 108 - 110',
    request:  [0x03, 0x00, 0x6B, 0x00, 0x03],
    response: [0x03, 0x06, 0x02, 0x2B, 0x00, 0x00, 0x00, 0x64],
    // APP p15 prose: "The contents of register 108 are shown as the two byte values of 02 2B hex,
    // or 555 decimal. The contents of registers 109-110 are 00 00 and 00 64 hex, or 0 and 100
    // decimal, respectively."
    decoded: { startAddress: 0x006B, quantity: 3, registers: [555, 0, 100] },
  },
  {
    id: 'write-single-coil',
    doc: 'APP V1.1b3', section: '6.5', page: '18/50',
    caption: 'a request to write Coil 173 ON',
    request:  [0x05, 0x00, 0xAC, 0xFF, 0x00],
    response: [0x05, 0x00, 0xAC, 0xFF, 0x00],   // the response echoes the request
    decoded: { outputAddress: 0x00AC, value: COIL_ON },
  },
  {
    id: 'write-multi-regs',
    doc: 'APP V1.1b3', section: '6.12', page: '30-31/50',
    caption: 'a request to write two registers starting at 2 to 00 0A and 01 02 hex',
    request:  [0x10, 0x00, 0x01, 0x00, 0x02, 0x04, 0x00, 0x0A, 0x01, 0x02],
    response: [0x10, 0x00, 0x01, 0x00, 0x02],
    decoded: { startAddress: 0x0001, quantity: 2, registers: [0x000A, 0x0102] },
  },
  {
    id: 'exception',
    doc: 'APP V1.1b3', section: '7', page: '47/50',
    caption: 'a client request and server exception response',
    request:  [0x01, 0x04, 0xA1, 0x00, 0x01],
    response: [0x81, 0x02],
    // APP p47 prose: "It requests the status of the output at address 1185 (04A1 hex)." and "If the
    // output address is non-existent in the server device, the server will return the exception
    // response with the exception code shown (02)."
    decoded: { startAddress: 0x04A1, quantity: 1, exceptionCode: EXCEPTION.ILLEGAL_DATA_ADDRESS },
  },
];

/* ------------------------------------------------------------------ *
 * 8. VENDOR PROFILES. DELIBERATELY EMPTY, AND THE EMPTINESS IS THE PRODUCT.
 *
 * A 32 bit value spread across two Modbus registers needs a word order to decode. The specification
 * publishes no such data type, so there is no specified word order to follow, so the only honest
 * source for one is a named vendor's manual. No meter manual has been sourced and read for this
 * project yet. Therefore: no profiles.
 *
 * This is 03's law reached from a third direction. 03 found ASCO and Russelectric agreeing on the
 * structure of an ATS and disagreeing on every number, and concluded there is no "the" ATS, so its
 * engine throws without a named vendor profile. There is likewise no "the" word order.
 *
 * FILLING THIS IN FROM MEMORY OR FROM A TUTORIAL WOULD FABRICATE EXACTLY THE AGREEMENT THIS PROJECT
 * EXISTS TO DISPROVE. Add a profile only with a manual read at its publisher, cited in SOURCES.md.
 * ------------------------------------------------------------------ */
const VENDOR_PROFILES = {};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LIMITS, FN, QTY_LIMITS, COIL_ON, COIL_OFF, EXCEPTION_OFFSET, EXCEPTION,
    VALIDATION_ORDER, ENDIAN_EXAMPLE, CRC, MBAP, PUBLISHED, VENDOR_PROFILES,
  };
}
