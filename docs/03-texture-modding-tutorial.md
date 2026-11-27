# QRS Texture Modding Tutorial

This guide describes the texture workflow present in the current BT3-Web-Modder.js source. It separates working inspection/export features from the PNG re-injection path, which is currently incomplete.

## 1. Prepare a safe working copy

1. Make a copy of the original game archive.
2. Keep the original AFS/PAK and any matching AFL file untouched.
3. Load BT3-Web-Modder.js into TurboWarp as an Unsandboxed custom extension. See [Getting Started](01-getting-started.md).
4. Open the BT3 Web Modder explorer overlay.

The extension currently reads AFS and PAK archives. An AFL is a companion filename index for an already loaded AFS, not an archive container in this implementation.

## 2. Load the archive and locate a candidate entry

1. Load the relevant AFS or PAK.
2. If you have its matching AFL, load the AFL after the AFS so entries receive their names.
3. Select an entry in the explorer. A single click selects it and triggers inspectQRS(index).
4. The extension reads only the selected entry's byte range with Blob.slice(), then wraps those bytes in a temporary one-entry PAK structure for the QRS parser.
5. If QRS records are recognized and decoded, the entry row displays one or more previews.

A nested archive can be opened by double-clicking an entry or using **Apri selezionato**. The explorer tries AFS parsing first and PAK parsing second.

## 3. Understand the two indexed texture modes

The QRS record stores base dimensions. The decoder derives the displayed dimensions from the associated palette descriptor:

| Mode | Palette size | Palette descriptor | Texture width | Texture height | Pixel index storage |
|---|---:|---|---:|---:|---|
| 4-bit / T4 | 16 colors | Record ID 0x5000000B, base size 8 × 2, payload 64 bytes | 2 × baseWidth | 4 × baseHeight | Two 4-bit indices per byte |
| 8-bit / T8 | 256 colors | Record ID 0x50000047, base size 16 × 16, payload 1024 bytes | 2 × baseWidth | 2 × baseHeight | One 8-bit index per byte |

The palette record is identified by its record ID, dimensions, and payload length. In the paired parser, a palette descriptor immediately following a texture is linked to that texture. A preceding palette can also be shared with a later texture when the record-ID family hint matches. Pairing never crosses a PAK entry boundary.

## 4. Inspect the preview metadata

For each decoded texture, the explorer shows:
- Bit depth (4-bit or 8-bit).
- Decoded width and height.
- Palette color count.
- Texture and palette offsets relative to the selected archive entry.
- Base QRS dimensions and source payload byte length.
- Decoder mode and pass/diagnostic information.
- Palette layout: linear 16-color CLUT for 4-bit, or CT32 CSM1 remapping for 256-color 8-bit.

Texture indices are converted to RGBA by looking up each index in the decoded palette. The QRS alpha channel is stored in the GS range 0–128 and converted to 8-bit alpha as min(255, alpha × 2). Thus 0x7F maps to 254 and 0x80 maps to 255.

## 5. Export a reference PNG

1. Select the archive entry.
2. Wait for the QRS preview to appear.
3. Click **Esporta PNG** on the relevant texture preview.
4. Keep this PNG as a visual reference for external editing work.

**Important:** exportQRSPreview() draws RGBA pixels to a browser canvas and calls canvas.toBlob(..., 'image/png'). The resulting PNG is a canvas-generated image, not guaranteed to be an indexed PNG. The import parser requires PNG color type 3 (indexed color), so the exported preview should not be assumed to be directly importable.

## 6. Editing rules for the indexed-PNG import parser

The source's parseIndexedPNG() method defines the requirements for a PNG that the replacement path expects:

- PNG color type must be **3 (indexed color)**.
- Bit depth must be 1, 2, 4, or 8.
- The PNG must not be interlaced.
- Width and height must exactly match the selected QRS texture.
- PNG dimensions must be non-zero, no more than 16,384 per axis, and no more than 16,777,216 pixels total.
- The PLTE palette must contain 1–256 colors and must fit within the declared PNG bit depth.
- A tRNS transparency chunk is optional, but cannot contain more alpha entries than the palette.
- The PNG must contain valid IHDR, IDAT, PLTE, and IEND structures. The parser checks chunk boundaries and decompresses IDAT with DecompressionStream('deflate'); it does not validate PNG CRC values.
- Each pixel index must refer to an existing PLTE entry.

For a 4-bit QRS target, use no more than 16 palette colors. For an 8-bit target, use no more than 256. The import routine automatically promotes a requested 4-bit replacement to 8-bit if the indexed PNG has more than 16 colors. It does not automatically reduce the palette.

The QRS geometry checks also require an even width, a height divisible by 4 for 4-bit, and an even height for 8-bit. The import parser separately requires the PNG dimensions to match the selected texture exactly.

These are requirements of the source code's import parser, not a guarantee that the current import operation completes successfully.

## 7. Re-injection status: currently blocked

The explorer includes a **Sostituisci con PNG** button and the class contains a substantial replaceQrsTexture() implementation. However, that path currently checks for:

~~~js
decoder.encodeQrs4Texture
decoder.encodeQrs8Texture
~~~

The QRS module does not define or export either method. Its exported helpers include packPaletteIndices4() and copyPaletteIndices8(), but those only pack/copy linear palette indices; they do not perform the full reverse GS swizzle/encoding expected by the replacement routine.

Consequently, the current replacement path stops with:

~~~text
Encoder QRS non inizializzato.
~~~

This is an implementation gap in the current source. Do not treat the following stages as a working end-to-end workflow until the encoder functions are implemented and tested.

## 8. What the replacement code is designed to do once the encoder exists

The code after the missing encoder check indicates the intended workflow:

1. Parse an indexed PNG with exact dimensions.
2. Read its palette and per-pixel indices.
3. Pack 4-bit indices low-nibble first / high-nibble second, or copy 8-bit indices.
4. Convert RGBA palette alpha back to the GS 0–128 range.
5. Apply CSM1 physical palette ordering for 256-color palettes.
6. Rebuild the target QRS texture record and its palette record while preserving the record header and trailing 0x20-byte record tail.
7. If a palette is shared, insert a duplicate palette for the target texture rather than changing other consumers.
8. Parse the rebuilt QRS data again and verify target dimensions, bit depth, indices, RGBA values, and neighboring textures.
9. Rebuild the containing AFS or PAK and parse the resulting archive again before downloading it.

The verification step is designed to abort if another texture sharing the same record family changes unexpectedly. It also checks that the replaced archive entry remains valid and has the expected size.

## 9. Archive rebuilding and extraction alternatives available now

Although QRS re-injection is blocked, the archive tools can still be used independently:

- Extract an entry with **estrai file con indice [INDEX]** or **Estrai selezionato**.
- Export the current archive to ZIP with **Esporta ZIP**.
- Export the entry table to TXT or CSV.
- Replace a whole entry in an AFS with **sostituisci file all’indice [I] con file locale**. This is generic AFS entry replacement, not a QRS-aware texture operation.
- Build a new AFS from a ZIP with **crea nuovo AFS da archivio ZIP**.

The generic replace block does not support PAK replacement and does not update the AFL sidecar. The ZIP-to-AFS builder also does not store filenames in the AFS offset table.

## 10. Practical validation checklist

Before considering a modified texture workflow production-ready, test at least:
- A 4-bit texture with a known 16-entry palette.
- An 8-bit texture with a known 256-entry palette.
- A 256-color palette requiring CT32 CSM1 ordering.
- A palette shared by more than one texture record.
- Texture records at different positions within the same PAK entry.
- A texture whose containing archive entry is inside an AFS.
- A texture whose containing archive entry is inside a PAK.
- Re-decoding of rebuilt data and comparison against intended index and RGBA arrays.
- Re-parsing of the rebuilt outer archive and verification of every entry boundary.

Keep the original game data available for comparison. Community-owned modding tools are most useful when their binary transformations are reproducible and independently testable.
