# Technical Specs and Architecture — BT3 Web Modder

This document describes the implementation in the repository's current main branch, specifically BT3-Web-Modder.js. It documents observed parser behavior and code-level structures. It does not claim that every format field has a known game-engine meaning: fields the parser ignores are marked as unknown rather than assigned invented semantics.

## 1. Scope and implementation map

The extension combines four major pieces:

1. **TurboWarp wrapper:** BT3WebModder, its block definitions, state, file picker, HTML explorer, and downloads.
2. **Archive layer:** AFS, PAK, and AFL readers; nested-archive navigation; extraction; ZIP export; AFS/PAK rebuilding.
3. **QRS parser/decoder module:** an embedded helper IIFE that exports BT3_WEB_MODDER_QRS_STAGE2_4_8BIT_IDPAIRS in a browser (and module.exports in CommonJS environments).
4. **Texture UI and import scaffold:** QRS inspection, canvas preview, PNG export, indexed-PNG parsing, and a currently incomplete QRS re-encoding path.

The extension is explicitly Unsandboxed. It uses the browser DOM, local file input, Blob, ArrayBuffer, typed arrays, DataView, canvas, object URLs, and dynamically loaded JSZip.

## 2. Binary conventions

Unless a section says otherwise:
- Integer fields in AFS, AFL, and PAK headers are read with DataView.getUint32(offset, true): unsigned 32-bit little-endian.
- QRS integer fields use a manual little-endian readU32LE() helper.
- Offsets are byte offsets from the start of the file/buffer being parsed.
- AFS/PAK entry offsets refer to the outer archive file.
- QRS record offsets refer to the PAK buffer passed to the QRS parser. In the explorer, those include the synthetic PAK's 16-byte prefix; the UI subtracts that prefix to report offsets relative to the selected entry.
- Rebuilders reject offsets/sizes beyond the 32-bit format range and an end beyond 4 GiB.

## 3. AFS archive format

### 3.1 Header and table

The AFS reader requires the first four bytes to be ASCII AFS followed by a zero byte:

| File offset | Size | Type | Meaning used by code |
|---:|---:|---|---|
| 0x00 | 4 | bytes | Magic: 41 46 53 00 (AFS\0) |
| 0x04 | 4 | uint32 LE | Entry count N |
| 0x08 | N × 8 | repeated pair | Entry offset and entry size |

Each entry table row is:

| Row-relative offset | Size | Type | Meaning |
|---:|---:|---|---|
| +0x00 | 4 | uint32 LE | Absolute file offset of entry data |
| +0x04 | 4 | uint32 LE | Entry size in bytes |

The table ends at:

~~~text
tableEnd = 8 + N * 8
~~~

The reader verifies that the table fits in the file. For each entry, it marks the entry valid only when:

~~~js
offset <= fileSize && size <= fileSize - offset
~~~

This subtraction-based check avoids relying on a potentially overflowing offset + size comparison.

### 3.2 Alignment

The AFS reader does **not** reject entries whose offsets are not 2048-byte aligned. The 2048-byte alignment rule is applied by the AFS creation/rebuild code:

~~~text
align2048(x) = ceil(x / 2048) * 2048
~~~

The first rebuilt data entry begins at align2048(tableEnd). Each subsequent entry begins at the next 2048-byte boundary after the previous entry's end. The builder inserts zero-filled gaps between the header/table and entry data, and between entries when required. It does not add a final alignment block after the last entry.

### 3.3 Rebuilding paths

There are two distinct AFS replacement paths:

- **Generic replace() block, replacement fits:** retains the original entry offsets/layout, writes the replacement bytes at the selected entry location, and zero-fills the unused remainder of the old entry size. The resulting file keeps the original layout.
- **Generic replace() block, replacement is larger:** reconstructs the AFS table and entries, assigning new 2048-byte-aligned offsets.
- **QRS texture rebuild path:** rebuildCurrentArchiveWithEntry() always reconstructs the current AFS with a new table and 2048-byte-aligned entry starts.

The AFS header does not contain filenames in this implementation. The AFS-from-ZIP builder explicitly reports that names remain in the source ZIP; AFL names are loaded separately.

## 4. AFL companion name index

AFL is handled as a name table associated with a currently loaded AFS. The code does not treat AFL as an archive containing payload entries.

| File offset | Size | Type | Meaning used by code |
|---:|---:|---|---|
| 0x00 | 4 | bytes | Magic: 41 46 4C 00 (AFL\0) |
| 0x04 | 8 | ignored | Not interpreted by this parser |
| 0x0C | 4 | uint32 LE | Name record count N |
| 0x10 | N × 32 | fixed records | 32-byte filename slots |

Each 32-byte name slot is decoded with TextDecoder. The string ends at the first zero byte (or at byte 32 if no zero is present), then trim() is applied. An empty result falls back to file_XXXX.bin.

The loader checks:

~~~text
16 + N * 32 <= AFL file size
~~~

Names are mapped to AFS entries by index:

~~~js
displayName[i] = aflNames[i] || generatedFallbackName(i)
~~~

The AFL loader does not verify that the AFL count equals the AFS entry count. Extra AFL names are unused; AFS entries without a corresponding name retain generated names. The AFL is not rewritten when an AFS entry is replaced.

## 5. PAK archive format

### 5.1 Header and offset table

The explorer's PAK parser reads:

| File offset | Size | Type | Meaning |
|---:|---:|---|---|
| 0x00 | 4 | uint32 LE | Entry count N |
| 0x04 | (N + 1) × 4 | uint32 LE array | Entry start offsets plus terminal offset |

The table ends at:

~~~text
tableEnd = 4 + (N + 1) * 4
~~~

For entry i:

~~~text
entryOffset[i] = offsets[i]
entrySize[i]   = offsets[i + 1] - offsets[i]
~~~

The first offset must be at or after tableEnd and divisible by 16. Offsets must be monotonic and no offset may exceed the file size. The explorer parser rejects zero counts and counts greater than 1,000,000.

**Important parser distinction:** parsePAKBlob() does not require the terminal offset to equal the file size. The QRS-specific parseQrsPak() parser is stricter: it limits the count to 65,535 and requires offsets[N] === bytes.length.

### 5.2 Rebuilding

The PAK rebuild path used by QRS entry replacement:
1. Computes tableEnd = 4 + (N + 1) * 4.
2. Aligns the first data start to 16 bytes.
3. Aligns each subsequent entry start to 16 bytes.
4. Writes N followed by N+1 little-endian offsets.
5. Writes the terminal offset as the end of the final entry.
6. Inserts zero-filled gaps where alignment requires them.

~~~text
align16(x) = ceil(x / 16) * 16
~~~

The generic replace() Scratch block does not support PAK. PAK rebuilding is reached only through the QRS replacement workflow, which currently has a missing encoder dependency and therefore cannot complete.

## 6. QRS records inside PAK entries

The QRS parser treats the PAK as a container of entries, then scans each entry for QRS records. There is no single QRS file-level magic at byte zero in this implementation.

### 6.1 PAK wrapper used by the QRS parser

The QRS parser expects a PAK-style buffer:

| Offset | Size | Type | Meaning |
|---:|---:|---|---|
| 0x00 | 4 | uint32 LE | Entry count |
| 0x04 | (N+1) × 4 | uint32 LE | Entry offsets |
| tableEnd onward | variable | bytes | Entry data |

It validates that the first offset is at or after the table, the first offset is 16-byte aligned, offsets are monotonic and within the buffer, and the final offset equals the exact buffer length.

For explorer inspection, the selected archive entry is wrapped as a synthetic one-entry PAK:

| Synthetic PAK offset | Value |
|---:|---|
| 0x00 | N = 1 |
| 0x04 | offsets[0] = 16 |
| 0x08 | offsets[1] = 16 + selectedEntryLength |
| 0x10 | Selected entry bytes |

This is why QRS record offsets are adjusted by 16 when the UI displays offsets relative to the selected entry.

### 6.2 QRS marker and record layout

The parser scans an entry in 4-byte steps until it finds a record marker. A candidate marker requires:
- byte recordOffset + 0x28 equals 0x51 (Q);
- byte recordOffset + 0x38 equals 0x52 (R);
- byte recordOffset + 0x48 equals 0x53 (S).

The parser then reads:

| Record-relative offset | Size | Type | Meaning |
|---:|---:|---|---|
| 0x00–0x0B | 12 | bytes | Header area; not interpreted by this parser |
| 0x0C | 4 | uint32 LE | Record ID |
| 0x10–0x27 | 24 | bytes | Header area; not interpreted by this parser |
| 0x28 | 1 | byte | Q marker |
| 0x29–0x37 | 15 | bytes | Header area; not interpreted by this parser |
| 0x38 | 1 | byte | R marker |
| 0x39–0x47 | 15 | bytes | Header area; not interpreted by this parser |
| 0x48 | 1 | byte | S marker |
| 0x49–0x5F | 23 | bytes | Header area; not interpreted by this parser |
| 0x30 | 4 | uint32 LE | Base width (explicit field) |
| 0x34 | 4 | uint32 LE | Base height (explicit field) |
| 0x60 | — | — | Start of payload |
| 0x60 + payloadBytes | 0x20 | bytes | Trailing record bytes preserved during replacement |

The explicit dimensions at +0x30 and +0x34 lie within the header-area ranges shown above; those bytes are called out separately because the parser reads them as fields. The record ID is at +0x0C. Marker bytes are signatures, not a fully decoded textual header.

The parser computes:

~~~text
payloadBytes = baseWidth * baseHeight * 4
recordSize   = 0x80 + payloadBytes
payloadStart = recordOffset + 0x60
~~~

Thus the record consists of a 0x60-byte pre-payload region, the payload, and a 0x20-byte trailing region. The total is 0x80 + payloadBytes. The code validates that the complete record fits within the current PAK entry. Base dimensions must be non-zero and no greater than the configured maximum (default 4096).

The parser advances by recordSize after a valid record. If a candidate position does not contain a valid marker/dimension/record, it advances by 4 bytes and continues scanning.

### 6.3 Palette descriptor records

The paired parser recognizes these exact palette descriptors:

| Mode | Record ID | Base dimensions | Payload bytes | Palette entries |
|---|---:|---:|---:|---:|
| T4 | 0x5000000B | 8 × 2 | 64 | 16 |
| T8 | 0x50000047 | 16 × 16 | 1024 | 256 |

The lower-level initial scanner also has a looser heuristic for palette-like records based on IDs or dimensions. The paired decoder uses the exact ID + dimensions + payload-size descriptor above.

The code does not read a direct texture-to-palette pointer. Instead, it pairs records by sequence within each PAK entry:
1. A palette descriptor immediately after a texture is linked to that preceding texture.
2. A palette can be shared with later textures when the record-ID family hint matches a neighboring texture record.
3. Palette linking does not cross PAK entry boundaries.

The shared-palette rule is narrower than “use the most recent palette for everything.”

## 7. QRS texture geometry and payload encoding

### 7.1 Derived dimensions

For a texture record with base dimensions baseWidth × baseHeight:

| Palette mode | Decoded width | Decoded height | Source pixel bytes |
|---|---:|---:|---:|
| 4-bit / 16 colors | 2 × baseWidth | 4 × baseHeight | ceil(width × height / 2) |
| 8-bit / 256 colors | 2 × baseWidth | 2 × baseHeight | width × height |

The record's stored payload size is baseWidth × baseHeight × 4. The decoder checks that the derived source byte count matches that payload size.

### 7.2 4-bit index stream

Each pixel index is 0–15. Two indices are packed into each source byte:

~~~text
byte = (pixelEven & 0x0F) | ((pixelOdd & 0x0F) << 4)
~~~

The lower-level unpackPaletteIndices4() helper reads the low nibble first and then the high nibble. The decoder does not treat the packed stream as a simple row-major final image: it scatters DWORDs into a scratch representation and gathers packed nibbles through PS2 GS address mapping.

The current decodeQrs4Texture() path calls decodeQrs4TextureLegacy(), which uses:
- scatterDwords404600() to place source DWORDs in the GS scratch layout;
- scratchNibbleAddress4() and its lookup tables to resolve nibble addresses;
- gatherPacked4_405D20() to gather packed indices back in image order;
- unpackPaletteIndices4() to produce one index byte per pixel.

The source requires even width and even height. The derived QRS geometry makes the height a multiple of four for valid 4-bit descriptors.

Other 4-bit routines are present (decodeQrs4BlockMapper(), decodeQrs4TextureMapper(), decodeQrs4TextureExtended(), decode4SinglePassExplorer(), and a multipass planner). They document or experiment with alternate mapper and tiling paths. They are not selected by the current top-level decodeQrs4Texture() call, which currently selects the legacy 0x404600 → 0x405D20 path.

### 7.3 8-bit index stream

Each pixel index is one byte (0–255). The current decoder:
1. Splits the texture into vertical chunks of up to 64 rows.
2. Requires each chunk height to be even.
3. Calls decodeQrs8Block() for each chunk.
4. Scatters source DWORDs with scatterDwords404600().
5. Gathers byte indices with gather8(), using scratchByteOffset8() and the GS swizzle lookup tables.

The width and height passed to the block decoder must be even. The 8-bit block source length is exactly width × blockHeight.

### 7.4 GS swizzle and endianness

The QRS decoder includes explicit PS2 GS-oriented address mapping. It is not a plain linear pixel copy.

- 8-bit texel placement uses scratchByteOffset8() and lookup tables T4119A0, T4117A0, and T4116A0.
- 4-bit nibble placement uses scratchNibbleAddress4() and lookup tables T411020, T411620, and T411220.
- DWORD scatter uses scratchDwordIndex404780() and lookup tables T412120 and T4120E0.
- scatterDwords404600() reads source words with DataView.getUint32(..., true) and writes them with setUint32(..., true), so the word transfer is explicitly little-endian.
- The 8-bit path uses CT32 CSM1 palette storage remapping, described below.

These tables and helper functions are embedded in the source and exported by the QRS module. The source contains both active decode paths and alternate/reference routines; porting work should follow the actual top-level call chain rather than assuming every helper is active.

## 8. CLUT / palette decoding and RGBA conversion

### 8.1 Palette payload

A palette record's payload begins at recordOffset + 0x60. Each palette entry occupies four bytes:

| Entry-relative byte | Size | Interpretation used by code |
|---:|---:|---|
| +0 | 1 | Red |
| +1 | 1 | Green |
| +2 | 1 | Blue |
| +3 | 1 | GS alpha (0–128) |

The decoder reads palette entries from the QRS record payload. For a 16-color palette, storage is treated as linear. For a 256-color palette, automatic mode selects CT32 CSM1.

### 8.2 CT32 CSM1 index permutation

For a 256-entry CLUT, the code swaps index bits 3 and 4:

~~~js
function csm1PaletteIndex(index) {
  return (index & 0xE7) |
         ((index & 0x08) << 1) |
         ((index & 0x10) >>> 1);
}
~~~

This is an involutive permutation. The palette reader uses the remapped physical source index to produce logical palette order. The code only permits CSM1 for 256-color CLUTs; 16-color palettes remain linear.

### 8.3 Alpha conversion

The QRS/GS alpha byte is constrained to 0–128. The decoder converts it to RGBA8 as:

~~~text
rgbaAlpha = min(255, gsAlpha * 2)
~~~

Examples:

| Stored GS alpha | RGBA alpha |
|---:|---:|
| 0x00 | 0 |
| 0x7F | 254 |
| 0x80 | 255 |

The decoder maps every decoded pixel index to the corresponding four-byte RGBA palette entry. Any index greater than or equal to the palette size causes a range error.

## 9. Archive and texture replacement code paths

### 9.1 QRS record replacement layout

makeQrsRecordWithPayload() preserves:
- the original first 0x60 bytes of the record;
- the newly supplied payload;
- the original trailing 0x20 bytes after the old payload.

The output record length is 0x80 + newPayload.length. Selected fields can be updated in little-endian form: record ID at +0x0C, base width at +0x30, and base height at +0x34.

### 9.2 Shared palettes

When a palette is used by multiple textures, buildQrsEntryReplacement() inserts a duplicate palette record after the target texture instead of overwriting the shared palette for all consumers. When the palette is not shared, the existing palette record is replaced in place in the rebuilt entry stream.

### 9.3 Outer archive rebuild

rebuildCurrentArchiveWithEntry() validates that entries are valid, in bounds, and non-overlapping before rebuilding.

- AFS: rebuilds the count/offset/size table and aligns entry starts to 2048 bytes.
- PAK: rebuilds the count/N+1 offset table and aligns entry starts to 16 bytes.

It returns a Blob. The caller reparses the rebuilt archive and checks that the replaced entry exists, is valid, and has the expected size.

### 9.4 Current encoder gap

The replacement routine currently checks for decoder.encodeQrs4Texture and decoder.encodeQrs8Texture. Neither method is defined or exported in the current QRS module. The module exports packPaletteIndices4() and copyPaletteIndices8(), but those helpers only perform linear index packing/copying; they do not reverse the GS swizzle into the QRS source layout.

Therefore, the current **Sostituisci con PNG** operation stops before encoding with the status error **“Encoder QRS non inizializzato.”** The downstream record/entry/archive rebuild and verification code is present, but the full texture replacement feature is not operational until matching encoder functions are implemented and tested.

## 10. PNG import parser requirements

The import parser accepts only indexed PNG (color type 3):

| Property | Requirement |
|---|---|
| PNG signature | Standard 8-byte PNG signature |
| Color type | 3 (indexed color) |
| Bit depth | 1, 2, 4, or 8 |
| Interlace | 0 (non-interlaced) |
| Width / height | Exactly the selected texture dimensions |
| Maximum width or height | 16,384 |
| Maximum pixel count | 16,777,216 |
| PLTE | 1–256 entries, and no more than the bit depth permits |
| tRNS | Optional; cannot exceed PLTE entry count |
| IDAT | Required; inflated size must match expected scanline length |
| Filters | PNG filters 0–4 are reversed by the parser |

The parser checks chunk lengths and IHDR/IEND presence, concatenates IDAT data, decompresses with DecompressionStream('deflate'), reverses PNG scanline filters (None, Sub, Up, Average, Paeth), and extracts packed pixel indices. The parser comments explicitly state that CRC bytes are ignored; chunk boundaries and structure are still checked.

The exported preview is made with canvas and is not guaranteed to satisfy the indexed color type requirement.

## 11. Runtime state and browser memory model

The extension class maintains these principal fields:

| Field | Role |
|---|---|
| afs | Current archive as a File or Blob; used for range reads with slice() |
| afl | Loaded AFL companion file, or null |
| entries | Array of { index, offset, size, valid } records |
| names | Display names aligned by entry index |
| archiveType | Current container type, AFS or PAK |
| archiveName | Display name of current archive level |
| archiveStack | Prior archive states for nested navigation |
| selectedIndex | Current selected entry index |
| searchResultIndex | Index from the latest search, or -1 |
| qrsCache | Per-entry QRS inspection cache; can contain pending Promises or results |
| qrsPreview | Most recent preview reference |
| panel | Explorer HTML overlay element |
| status | Latest status/error string |
| zipPromise | Cached promise for loading JSZip |

### 11.1 Range-based archive reads

The extension keeps the current archive as a File/Blob rather than immediately copying the entire archive into a new JavaScript array. It reads:

~~~js
await blob.slice(start, end).arrayBuffer()
~~~

for headers, tables, or selected entries. This reduces unnecessary copies for archive browsing, but selected-entry QRS decoding still materializes that entry into a Uint8Array. ZIP export also reads each valid entry into JSZip.

### 11.2 Typed arrays and DataView

- ArrayBuffer is the binary backing store returned by Blob.arrayBuffer().
- Uint8Array provides byte access for signatures, payload slices, and swizzle buffers.
- DataView reads/writes little-endian uint32 fields in archive and record headers.
- Uint8ClampedArray is used for canvas RGBA image data in the preview UI.
- Blob combines headers, padding, and entry data during rebuilds.
- URL.createObjectURL() plus an anchor element triggers browser downloads; object URLs are revoked after 60 seconds.

When porting to Node.js, Buffer/typed-array views can represent the byte buffers, while readUInt32LE() and writeUInt32LE() correspond to the source's little-endian DataView operations. In Python, use struct.unpack_from('<I', data, offset) and struct.pack_into('<I', data, offset, value), while preserving unsigned 32-bit bounds and byte offsets.

## 12. Reusing or porting the parser module

The QRS helper module is isolated in an IIFE and exposes a frozen API. In a browser it assigns:

~~~js
globalThis.BT3_WEB_MODDER_QRS_STAGE2_4_8BIT_IDPAIRS
~~~

In CommonJS it assigns module.exports. This allows some decoding and address-mapping helpers to be reused without instantiating the TurboWarp extension class.

Useful exported groups include:
- **PAK/QRS parsing:** parseQrsPak, parseQrsPakPairs, pairQrsRecordsInEntry.
- **Decoding:** decodeQrsTexture, decodeAllQrsTextures, decodeQrsTexturePaired, decodeAllQrsTexturesPaired, decodeQrs4Texture, decodeQrs8Texture.
- **Palette handling:** getQrsPaletteDescriptor, csm1PaletteIndex, resolveQrsPaletteStorageMode, paletteBytesToRgba, gsAlphaToRgbaByte.
- **GS address mapping:** scratchByteOffset8, scratchNibbleAddress4, scratchDwordIndex404780, scatterDwords404600, scatter8, gather8, scatter4, gather4, finalStage404780.
- **Index helpers:** packPaletteIndices4, unpackPaletteIndices4, copyPaletteIndices8.
- **Diagnostic/reference helpers and lookup tables:** plan4MultiPassExplorer, decode4SinglePassExplorer, planQrsImageProbe, QRS_IMAGE_HINTS, QRS_POST_FALLBACK, QT_IAT, and tables.

A port should preserve the lookup tables and exact active call chain. Do not replace GS address mapping with a simple linear loop: that changes texel placement and palette ordering.

## 13. Developer extension guide

When adding a parser or TurboWarp block:

1. **Keep format parsing separate from UI.** Prefer pure functions that accept Uint8Array (and explicit options) and return structured metadata.
2. **Validate before reading.** Check minimum buffer length, count limits, table bounds, monotonic offsets, payload sizes, and arithmetic safety before creating views or slicing.
3. **Name units explicitly.** The QRS code has separate strides measured in DWORDs, bytes/texels, and 4-bit pixels. Avoid reusing a stride whose unit differs.
4. **Preserve unknown bytes.** When rebuilding records, copy untouched header/tail ranges rather than inventing values for unknown fields.
5. **Round-trip test.** Parse rebuilt output again and compare entry boundaries, dimensions, palette indices, RGBA pixels, and neighboring records.
6. **Keep shared data safe.** If multiple textures use one palette descriptor, duplicate it before changing one consumer.
7. **Report incomplete support honestly.** A parser that can decode a format does not automatically imply a valid encoder or rebuild path.
8. **Expose operations through getInfo().** Add a block definition with an opcode, Scratch block type, exact text, argument types/defaults, and a class method with the same opcode name.
9. **Keep browser-specific work in the wrapper.** File pickers, DOM overlays, canvas rendering, and downloads belong in the extension layer, not in pure binary parsers.

## 14. License, provenance, and community development

The repository declares **GNU GPL-3.0**. Developers redistributing or adapting the project should review the repository's LICENSE and comply with its terms.

The README credits KkTeam's KkTeamQrsExplorer for QRS format and PS2 GS swizzle reverse-engineering, and the BT3-Decompiled / Tenkaichi3Decomp projects by z3xox for decompilation research. Preserve those credits and keep provenance clear when reusing or extending the relevant work.

The project's open-source ethos is strongest when parsers are documented against real code, unknown fields remain labelled as unknown, and new format support comes with reproducible test files and round-trip validation.
