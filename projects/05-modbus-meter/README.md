# 05. Modbus frame codec

The same Modbus PDU sent over serial and over TCP, side by side, reproducing the specification's own
published worked examples byte for byte. It shows which parts of a Modbus TCP frame are fossils of an
RS-485 bus, and it refuses to decode a 32 bit value the specification never defines.

**[Live demo](https://skeeter-spec.github.io/power-service-toolbox/projects/05-modbus-meter/build/index.html)**

> **Educational. Not for field use.** This tool reproduces published worked examples so they can be
> explored interactively. It is not a substitute for an engineered study, the manufacturer's
> instructions, or a qualified person on site.

## Status

See `PROGRESS.log`. It is the source of truth for this project.

## The finding: Modbus TCP is a serial protocol wearing a TCP header

Not an opinion. Two quotes, from two free documents served by the publisher.

The PDU is capped at 253 bytes on every transport, including Ethernet, because of

> "the size constraint inherited from the first MODBUS implementation on Serial Line network
> (max. RS485 ADU = 256 bytes)"
>
> Application Protocol V1.1b3, 4.1, p5

and the MBAP header spends one of its four fields on a Unit Identifier, defined as

> "Identification of a remote slave connected on a serial line or on other buses"
>
> Messaging on TCP/IP V1.0b, 3.1.3, p5

So a Modbus TCP frame is capped at 260 bytes by a bus it will never touch, and carries that bus's
slave address in its header. Load the demo and both frames render side by side with the fossils
marked.

### Why this route, and not an RS-485 or HSMS project

Because those cannot be verified, which was measured rather than assumed. RS-232, RS-485 and HSMS
were each checked for a project of their own. All six relevant standards are paywalled with no free
normative access: TIA-232-F is 165.00 USD, TIA-485-A is 99.00, SEMI E37 (HSMS) is 380.00, and the set
runs to 1,324.00. SEMI's free abstracts state no normative content at all. This repo never claims
conformance to a standard it has not read, so none of them can anchor a verified tool.

RS-485's fingerprint is reachable anyway, for free, because Modbus documents it on itself.

Worth knowing before anyone spends the 99.00: **TIA-485-A would not answer a biasing question even if
bought.** Its own published scope says it "does not specify other characteristics, such as signal
quality, timing, protocol, pin assignments".

## Verify against

**MODBUS Application Protocol Specification V1.1b3** (Modbus Organization, April 26 2012), plus the
Serial Line V1.02 and Messaging on TCP/IP V1.0b guides. All three free, no login, read at the
publisher.

This is the strongest primary in the repo, because it publishes its answer in **literal hex bytes**:

| Published example | Section | Page | Request | Response |
|---|---|---|---|---|
| Read Coils | 6.1 | 12/50 | `01 00 13 00 13` | `01 03 CD 6B 05` |
| Read Holding Registers | 6.3 | 15/50 | `03 00 6B 00 03` | `03 06 02 2B 00 00 00 64` |
| Write Single Coil | 6.5 | 18/50 | `05 00 AC FF 00` | `05 00 AC FF 00` |
| Write Multiple Registers | 6.12 | 30-31/50 | `10 00 01 00 02 04 00 0A 01 02` | `10 00 01 00 02` |
| Exception | 7 | 47/50 | `01 04 A1 00 01` | `81 02` |

Every one of them was rendered at 3x and read as an image by **two independent readers** who never
saw each other's transcription. They agreed on every byte. That is the evidence, and it is not
optional: an answer key cannot check itself, so the only instrument that validates one is a second
reader at the publisher.

79 checks, 31 mutants, all dead.

## What this tool refuses to do, and why that is the product

**It will not decode a 32 bit float across two registers.** `decodeWide()` throws without a named
vendor profile, and no vendor profile ships.

The precise claim matters here, because the common version of it is false:

- ❌ **Widely repeated and wrong:** "Modbus does not define byte order."
- ✅ **True:** Modbus defines byte order **within a register** (4.2, p5, big endian, worked at exactly
  one width: 16 bits, the width of one register) and defines **no data type wider than a register at
  all**. There is nothing for a word order to apply to.

Measured across all three specifications, 265,402 characters, with controls firing 176 to 538 times:
`float` 0, `floating` 0, `ieee 754` 0, `32-bit` 0, `word order` 0, `byte order` 0, `40001` 0, `4x` 0.

So word order is a vendor convention living entirely outside these documents. Every Modbus tutorial
supplies one anyway. Filling one in from a tutorial would be a silent overclaim inside a decoder
someone points at real gear, so section F of the verify suite asserts the refusal and greps the build
for it, and four of the mutants break no calculation at all: they only make the tool claim more than
its source. All four die.

Same law as 03's "there is no *the* ATS", reached from a third direction. There is no *the* word order.

## Two things the specification gets to be strange about, and both are published

**The CRC breaks the protocol's own rule.** Section 4.2 says big endian and works it: data `0x1234`
goes out `12 34`. The Serial guide's Figure 30 works the CRC: value `0x1241` goes out `41 12`, low
byte first. Two documents, nearly the same example value, opposite byte order. Get it backwards and
every frame fails its check.

**The MBAP Length field is an off by one waiting to happen.** It is "a byte count of the following
fields, including the Unit Identifier and data fields", so it is 1 + the PDU. Not the ADU, not the
PDU. The two intuitive wrong answers each have a mutant.

**And the validation order is not the one most people write.** Both published state diagrams branch
function code, then *quantity* (exception 03), then *address* (exception 02). Quantity is checked
before address.

## Layout

    sources/   authoritative references, cited, never redistributed
    verify/    the published worked examples this must reproduce, and the mutants
    build/     the app: spec.js (constants + answer key), engine.js (the codec), index.html

## Scope, stated because the directory name oversells it

**No meter register map is sourced, so none ships.** The specification defines no meter register map,
because there is no such thing to define: a meter's map is its vendor's. This project ships the frame
layer only. The register map phase does not open until a specific meter's manual is sourced and read
at its publisher. Naming the directory `05-modbus-meter` does not entitle it to invent a meter.

## Known gap

The CRC implementation rests on the published *procedure* (preload `FFFF`, polynomial `0xA001`) and
the published *byte order* (Figure 30), both of which are asserted and mutated. It is **not** verified
against a published message to CRC pair, because none was found and rendered. That gap is deliberately
not closed with a value from a tutorial or from memory: a suite that invents a fixture to stay green
has started inventing facts. The fix, for whoever has the budget: the Serial guide's pages 40 to 42
publish a reference C implementation with two 256 entry lookup tables. Transcribe them at the
publisher and check the bitwise procedure reproduces all 512 values. That is 02's shape exactly.
