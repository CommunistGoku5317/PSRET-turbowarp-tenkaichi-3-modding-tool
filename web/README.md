# BT3 Modder 0.4.0 — Web Edition

The browser app retains the 0.3 archive browser and adds a texture/model workbench.

## Requirements

- Node.js 20 or newer and npm.
- Emscripten SDK (`emcc`) for compiling the C core to WebAssembly.

## Run locally

```sh
npm install
npm test
npm run build
npm run dev
```

`npm run build:wasm` compiles `core/bt3_core.c` and `core/bt3_texture.c` and writes the generated `public/bt3_core.js/.wasm`. `npm run build` then creates the Vite production bundle.

## Existing 0.3 archive browser

AFS / AFL / Spike PAK parsing is provided by the shared C/WASM core. Generic 7z/RAR/ISO reading uses `archive-wasm` 2.1.0 (LibArchive compiled to WebAssembly). The UI retains nested archive opening, AFL name loading and selected-entry extraction. The selected file is held in browser memory, so very large disc images can exceed browser memory limits.

## QRS indexed PNG workflow

1. Load an AFS or PAK and select an entry.
2. Click **Analizza QRS** to inspect decodable QRS texture/palette pairs.
3. **Esporta PNG indicizzato** produces color type 3 PNG with the exact logical pixel indices and palette alpha. The export path does not use Canvas RGBA conversion.
4. **Reimporta PNG (palette fissa)** accepts only an indexed PNG of the same dimensions and exact logical RGBA palette. It encodes the new index array in the original 4-bit/8-bit mode, keeps the QRS palette record and CLUT bytes untouched, and rejects the import if the round-trip differs.
5. Before downloading, the browser checks that other decodable textures in the same entry remain pixel-identical and validates the rebuilt AFS/PAK table.

Supported indexed PNG input: non-interlaced color type 3 with bit depth 1, 2, 4 or 8. The importer validates chunk CRCs, dimensions, PLTE/tRNS, decompressed row filters and all pixel indices. The exporter uses 4-bit indexed PNG for palettes up to 16 colors and 8-bit for 256-color palettes.

## TexFile metadata

Select an entry that contains a TexFile and choose **Analizza TexFile**. The UI shows the entry count, entry table offset, pixel/CLUT ranges, transfer steps, PSM and storage dimensions derived from TEX0.

The decomp's TexFile loader submits pixel and CLUT packet data to the PS2 GS through DMA. The exposed offsets do not establish that the payload is a linear bitmap. Thus the current UI reports safe metadata but does not yet export TexFile packet contents as PNG or rewrite them.

## Model texture references

The model workbench accepts one raw VIF stream ending with `0x70000000`. It scans TEX0 records and reports the lowest TBP0/CBP, then can rebase and export that stream. It follows the single-chain path from `MdlTex_RebaseChain`; it does not parse the enclosing mesh linked-list or entire model.

## Tests

`npm test` covers QRS 4-bit and 8-bit encoder/decoder round trips, CSM1 palette-index remapping and indexed PNG round trips including palette alpha and dimension validation. The root CMake test target checks the shared archive parser, TexFile metadata and VIF rebase. These use synthetic fixtures; real game archives should still be regression-tested.

## Limitations

- No TexFile DMA packet to PNG conversion or GS VRAM reconstruction.
- No whole-model mesh-list parser or model mesh editor.
- QRS support must be validated against representative real game entries and texture geometries.
- Indexed PNG reimport requires the original palette unchanged; users should alter indices, not palette colors.
- RAR/RAR5 coverage depends on LibArchive and the archive variant.
- Browser archives are read into memory.
- The TurboWarp Stage bridge remains an experimental Unsandboxed iframe integration.
