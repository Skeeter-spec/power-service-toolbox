# 05. Sources

Every claim this project makes traces to a document named here. Quoted passages keep the source's own
punctuation, so hyphens inside quotation marks are the document's, not this repo's.

## Source audit

Levels, strongest first: **TRACED** (read, and figures or data traced out) · **READ IN FULL** ·
**FETCHED, NOT READ** · **LOCATED ONLY** (URL resolves, content unverified) · **CITED, UNREAD**
(named by number, never opened) · **GATED, UNREAD** (paywalled, no content used).

| Source | Level | URL | Read at |
|---|---|---|---|
| MODBUS Application Protocol Specification V1.1b3 (April 26, 2012), Modbus Organization. THE PRIMARY. Free, no login, no registration. Every answer key frame and every quoted passage was rendered at 3x and read as an image, by two independent readers, and they agreed on every byte | TRACED | https://www.modbus.org/file/secure/modbusprotocolspecification.pdf | PUBLISHER |
| MODBUS over Serial Line Specification and Implementation Guide V1.02 (Dec 20, 2006), Modbus Organization. Source of the CRC generation procedure, the CRC polynomial, and the CRC byte order exception. Section 6.2.2 rendered and read | TRACED | https://www.modbus.org/file/secure/modbusoverserial.pdf | PUBLISHER |
| MODBUS Messaging on TCP/IP Implementation Guide V1.0b (October 24, 2006), Modbus Organization. Source of the MBAP header, the Length field rule, the Unit Identifier definition, and port 502. Section 3.1.3 rendered and read | TRACED | https://www.modbus.org/file/secure/messagingimplementationguide.pdf | PUBLISHER |
| MODBUS over Serial Line V1.0 (12/02/02), the OBSOLETE legacy serial specification. Recorded to warn the next session off it: the publisher labels it "FOR LEGACY APPLICATIONS ONLY", and its filename and cover are one character from V1.02 | LOCATED ONLY | https://www.modbus.org/file/secure/modbusoverseriallegacy.pdf | PUBLISHER |
| ANSI/TIA-232-F, Interface Between Data Terminal Equipment and Data Circuit-Terminating Equipment Employing Serial Binary Data Interchange. Sold by Accuris for 165.00 USD, price read off the seller's live page. No content used, and no copy was read anywhere. NOTE the designation: Accuris lists TIA-232-F as active and ANSI/TIA/EIA-232-F as HISTORICAL | GATED, UNREAD | none | NONE |
| ANSI/TIA-485-A, Electrical Characteristics of Generators and Receivers for Use in Balanced Digital Multipoint Systems. Sold by Accuris for 99.00 USD. No content used, and no copy was read anywhere. Its SCOPE is quoted below from the seller's public catalog abstract, which is not the standard | GATED, UNREAD | none | NONE |
| SEMI E37-0222, High-Speed SECS Message Services (HSMS). Sold by SEMI for 380.00 USD (286.00 member). No content used, and no copy was read anywhere. Its free abstract was searched for port, 5000, TCP and header: the only hits were CSS variable names, so the abstract states no normative content | GATED, UNREAD | none | NONE |

## Why the primary is unusually strong for this repo

Three things line up here that have not lined up before:

1. **Publisher hosted, free, and no login.** A plain curl GET with no cookies, no session and no
   credentials returns the whole PDF. Compare 01's WP75 and 02's GE 850: both free but copyrighted,
   and 02's came from a distributor's document store. Only 07's BPA bulletin matches this.
2. **It publishes worked examples in literal hex bytes.** Not a prose verdict like 01, not an
   equation like 02. The answer key is the wire itself.
3. **Two independent readers agreed on every byte.** Both fetched the publisher's own file
   (sha256 `f80d0d71...`, 932,519 bytes, `application/pdf`, no cross host redirect), both rendered
   the pages at 3x, and both read the tables as images. Zero disagreements across five examples.
   That is pattern 12 doing its job.

## The instrument note that matters, because it inverts a normal check

**`curl -sIL` returns HTTP 404 on every real modbus.org PDF URL.** The server 404s on HEAD and serves
HTTP 200 `application/pdf` on GET for the same URL. Both readers hit this independently. Anyone
validating these links with a HEAD request concludes the entire modbus.org specification library is
dead. **Use GET.** This is the same failure class as [[industrial-index-repo]]'s link checker grading
a hanging host as a 404: a RED is a claim too, and a checker that reports everything broken is the
suspect.

The site also has a WAF that intermittently returns a 69 byte block page **at HTTP 200**. A scraper
here needs a positive control asserting a known string is present, not a status code check.

## Licence: an honest unknown, and why no PDF is committed

**There is no copyright notice in any of these documents.** This is a controlled null, not a failed
search: a full text search finds "MODBUS" 278 times in the Application Protocol spec, 329 times in
the Serial guide and 538 times in the TCP guide, while `copyright` and the `©` character return zero
in all three. The control fires; the zero is real.

The only intellectual property sentence in fifty pages is a trademark line on p50:

> "MODBUS  is a registered trademark of Schneider Automation Inc."

The Modbus Organization publishes the specification under a trademark licence from Schneider
Electric. **Free to download is established. Free to redistribute is NOT.** The documents are silent,
and silence is not a grant. The website's Legal page was not read.

⇒ **No PDF is committed here**, same as every other project in this repo. Cite, never redistribute.

### The answer key is a deliberate decision, and it is narrower than 02's

02 committed a 210 cell table on the reasoning that the cells are mechanically derivable from an
equation and constants the sources already quote, so they are facts rather than a committee's
judgment. **That reasoning does not transfer automatically, and the memory says so: the next table is
its own decision.** So, this one:

What is committed is **five short frames, five to ten bytes each**, which are the minimum needed for
the verify gate to exist at all. `01 00 13 00 13` is not the specification's creative expression; it
is what a Read Coils request for outputs 20 to 38 physically **is**. No table, no prose passage and no
figure is reproduced. The document carries no copyright notice to weigh against this.

**Flagged for Keaton rather than decided silently**, because guardrail 2 is his call and the last
answer key was too. If he wants the frames generated at load time from the field descriptions instead
of committed as literals, that is a small change and the verify phase survives it.

## What the specifications publish, and what they do not

### They DO define byte order. The common tutorial claim is false.

Application Protocol V1.1b3, section 4.2 Data Encoding, p5/50, verbatim:

> "MODBUS uses a 'big-Endian' representation for addresses and data items. This means that when a
> numerical quantity larger than a single byte is transmitted, the most significant byte is sent
> first."

Its worked example, same page, is a table whose column is headed **Register size** with exactly one
row: **16 bits**, value `0x1234`, "the first byte sent is 0x12 then 0x34".

### They do NOT define anything wider than one register.

Controlled null across all three documents, 265,402 characters, with controls firing 176 to 538 times:

| term | App Protocol | Serial | TCP |
|---|---|---|---|
| CONTROL `modbus` | 278 | 329 | 538 |
| CONTROL `register` | 237 | 21 | 11 |
| `float` | 0 | 0 | 0 |
| `floating` | 0 | 0 | 0 |
| `ieee 754` | 0 | 0 | 0 |
| `32-bit` | 0 | 0 | 0 |
| `word order` | 0 | 0 | 0 |
| `byte order` | 0 | 0 | 0 |
| `40001` | 0 | 0 | 0 |
| `4x` | 0 | 0 | 0 |

The three `endian` and `swap` hits were each read in context and none of them defines a multi register
value. So the precise claim, and the sloppy one it replaces:

- ❌ **FALSE, and widely repeated:** "Modbus does not define byte order."
- ✅ **TRUE:** Modbus defines byte order **within a register** (section 4.2, big endian), and defines
  **no data type wider than a register at all**. There is therefore nothing in the specification to
  define word order *for*. A 32 bit float across two registers is a vendor convention living entirely
  outside these documents.

Getting this wrong in the flattering direction would have been an overclaimed gap, which is the same
error shape as the plan's old "zero hours" scorecard. The gap is real but it is narrower than the
tutorials say, and the narrow version is the useful one.

### The 4xxxx convention is not in the specification either.

Zero hits for `40001`, `4x` and `30001`, controls firing. Section 6.3, p15/50, states the actual rule:

> "In the PDU Registers are addressed starting at zero. Therefore registers numbered 1-16 are
> addressed as 0-15."

The 4xxxx numbering is a Modicon era convention that the current specification does not carry.

## The finding this project is built on

**Modbus TCP is a serial protocol wearing a TCP header**, and both documents say so in their own words.

1. **The PDU size limit is RS-485's**, Application Protocol p5/50, verbatim:

   > "The size of the MODBUS PDU is limited by the size constraint inherited from the first MODBUS
   > implementation on Serial Line network (max. RS485 ADU = 256 bytes)."

   Therefore PDU = 253 bytes, RS232 / RS485 ADU = 256 bytes, and **TCP ADU = 253 + MBAP (7) = 260
   bytes**. An Ethernet frame carries a limit inherited from a bus it will never touch.

2. **The Unit Identifier is the serial slave address**, TCP guide p5/46, verbatim:

   > "The MODBUS 'slave address' field usually used on MODBUS Serial Line is replaced by a single byte
   > 'Unit Identifier' within the MBAP Header. The 'Unit Identifier' is used to communicate via
   > devices such as bridges, routers and gateways that use a single IP address to support multiple
   > independent MODBUS end units."

   Its own field description in the MBAP table reads: "Identification of a remote slave connected on a
   serial line or on other buses."

This is worth stating because **it is reachable without buying anything.** TIA-485-A costs 99.00 USD
and, by its own published scope, "does not specify other characteristics, such as signal quality,
timing, protocol, pin assignments", so it would not answer this question even if we bought it. The
answer is in Modbus's own free specification, describing RS-485's fingerprint on itself.

## What is verified against

| Claim | Document | Section | Page |
|---|---|---|---|
| Read Coils example: `01 00 13 00 13` → `01 03 CD 6B 05` | App Protocol V1.1b3 | 6.1 | 12/50 |
| Read Holding Registers: `03 00 6B 00 03` → `03 06 02 2B 00 00 00 64` | App Protocol V1.1b3 | 6.3 | 15/50 |
| Write Single Coil: `05 00 AC FF 00` → `05 00 AC FF 00` | App Protocol V1.1b3 | 6.5 | 18/50 |
| Write Multiple Registers: `10 00 01 00 02 04 00 0A 01 02` → `10 00 01 00 02` | App Protocol V1.1b3 | 6.12 | 30-31/50 |
| Exception: `01 04 A1 00 01` → `81 02` | App Protocol V1.1b3 | 7 | 47/50 |
| Exception function code = request function code + 0x80 | App Protocol V1.1b3 | 7 | 47/50 |
| Big endian, 16 bit: `0x1234` → `12` then `34` | App Protocol V1.1b3 | 4.2 | 5/50 |
| PDU 253, serial ADU 256, TCP ADU 260 | App Protocol V1.1b3 | 4.1 | 5/50 |
| Quantity limits 2000 / 1968 / 125 / 123 | App Protocol V1.1b3 | 6.1, 6.11, 6.3, 6.12 | 12, 29, 15, 30 |
| Validation order: function code, then quantity (03), then address (02) | App Protocol V1.1b3 | Figures 11, 22 | 12, 31 |
| CRC preload FFFF, polynomial 0xA001, LSB first | Serial V1.02 | 6.2.2 | 39/44 |
| CRC transmitted low byte first: `0x1241` → `41 12` | Serial V1.02 | 6.2.2, Figure 30 | 39/44 |
| MBAP is 7 bytes: transaction 2, protocol 2, length 2, unit 1 | TCP V1.0b | 3.1.3 | 5/46 |
| Protocol Identifier = 0 | TCP V1.0b | 3.1.3 | 5/46 |
| Length counts the Unit Identifier plus the data fields | TCP V1.0b | 3.1.3 | 5/46 |

## Gaps, stated rather than papered over

- **No meter register map is sourced.** The specification defines no meter register map, because there
  is no such thing to define: a meter's map is the vendor's. This project therefore ships the frame
  layer only, and the register map phase does not open until a specific meter's manual is sourced and
  read at its publisher. **Naming this project "modbus-meter" does not entitle it to invent a meter.**
- **Redistribution terms are unresolved** (the Legal page was not read). No PDF is committed, so
  nothing turns on it today.
- The App Protocol PDF's `creationDate` is 2013-12-17 and `modDate` is 2020-06-24, both after the
  stated revision date of 2012-04-26. This is a publisher re-render, not a third party one, but the
  bytes are not the 2012 original artifact and there is no original to diff against. Compare pattern
  18: a mirror can be byte clean and still be the wrong revision. Here the publisher's copy is the
  only copy, so the risk is errata rather than staleness.
- 13 of the 18 worked examples in the App Protocol spec were not individually rendered. The five in
  the answer key were, twice.
- The exception code table continues onto p49/50, which was not rendered. Nothing here asserts its
  contents.
