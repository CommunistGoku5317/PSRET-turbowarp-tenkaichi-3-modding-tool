# BT3 Modder 0.4.0 — archive and texture workbench

Version **0.4.0** brings the 0.3 shared-core archive tooling together with the first texture/model-analysis functions. It is still a development build: the texture workbench is not yet a full PS2 GS renderer or a general model editor.

## 0.4.0 scope

| Area | Included in 0.4.0 | Notes |
|---|---|---|
| AFS / AFL / Spike PAK | Shared C parser, WebAssembly and desktop integration | Retains the 0.3 parsing behavior and archive browser |
| Generic containers | 7z, RAR-family, ISO reader paths | Browser uses archive-wasm; desktop uses LibArchive |
| Nested archives / AFL names / ZIP extraction | Retained | Browser supports nested entry opening and file export |
| TexFile / TexEntry | Header, entry metadata, offsets, sizes, TEX0 PSM and storage dimensions | Reads the structure described by BT3-Decompiled; does not yet turn GS DMA packets into images |
| QRS 4-bit / 8-bit | Decoder plus inverse encoders | Encoders verify the result by decoding it again and comparing every index |
| Indexed PNG | PNG color type 3 export and import | Exports exact index values and logical palette; alpha is carried through PLTE/tRNS |
| QRS reimport | Rebuilds the selected AFS/PAK entry | Rewrites only the texture payload; original CLUT bytes and descriptors are kept intact |
| Model texture references | Scan/rebase a single bounded VIF material stream | Uses the TEX0 fields from MdlTex_RebaseChain; not a whole ObjMdlMesh list editor |
| TurboWarp extension | Existing root JS extension retained and updated | QRS PNG export/reimport also uses indexed PNG and fixed original CLUT |

## Texture workflow

1. Open an AFS or PAK and select the entry that contains QRS records.
2. Choose **Analizza QRS**. The app lists each decodable texture and its associated palette.
3. **Esporta PNG indicizzato** creates a palette-indexed PNG, not an RGBA screenshot. Pixel indices are kept as indices; they are not quantized from a rendered canvas.
4. To reimport, select an indexed PNG with the same width, height, palette and palette alpha as the exported original. The tool refuses a different palette, encodes the new pixel indices in the original 4-bit or 8-bit mode, runs a decode round-trip check, confirms that neighboring textures still decode unchanged, and rebuilds the AFS/PAK.
5. The original palette descriptor and its CLUT payload are not rewritten during QRS reimport.

The PNG importer accepts non-interlaced indexed PNGs (color type 3, 1/2/4/8-bit indices) and validates their chunk CRCs, dimensions, palette and index range. The exporter writes 4-bit indexed PNG for palettes of up to 16 colors and 8-bit indexed PNG for 256-color palettes.

## Decomp-derived metadata

The C texture parser follows the on-disk fields in `BT3-Decompiled/include/sys/tex_file.h` and the relocation behavior in `src/sys/tex_file.c`. It reads `TexFile.count`, `entOfs` (word-based), the 0x40-byte `TexEntry` records, pixel/CLUT offsets and sizes, transfer steps, GS BLT fields and TEX0. It reports the TEX0 PSM and storage dimensions from TW/TH.

These offsets point to data used by the game's texture upload code. The decomp passes them to GS DMA upload routines; they are not documented as plain linear RGBA or indexed pixels. Therefore 0.4 exposes safe metadata and range checks but does **not** pretend to export every TexFile payload as PNG or rebuild PS2 GS memory from it.

The model helper follows `MdlTex_RebaseChain` for one bounded VIF stream: marker `0x6C058000`, TEX0A/TEX0B words, and terminator `0x70000000`. It scans the minimum TBP0/CBP and rebases those fields. It intentionally does not parse a complete mesh linked-list because that requires the surrounding `ObjMdlMesh` container/stride and real model fixtures.

## Build and tests

Native shared core:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
ctest --test-dir build --output-on-failure
```

Browser edition (Node.js 20+, npm and Emscripten):

```sh
cd web
npm install
npm test
npm run build
npm run dev
```

The C tests include AFS/AFL/PAK, TexFile metadata and single-stream VIF rebasing. The web tests include QRS 4-bit/8-bit index round-trips, the CSM1 palette permutation, indexed PNG index/alpha round-trips and PNG dimension rejection. These synthetic tests do not replace validation against a set of real game archives and textures.

## Preserved 0.3 features

The new texture modules are additive. The 0.3 archive functionality remains in the same branch: AFS/AFL/PAK parsing, browser WebAssembly integration, generic archive reads, nested entry opening, AFL naming, TXT/CSV/ZIP index export and the desktop LibArchive CLI. The TurboWarp Stage iframe bridge remains experimental and requires Unsandboxed DOM access.

## Known limitations

- TexFile GS DMA payloads are **not yet converted to PNG**. Only their binary metadata and data ranges are inspected.
- Whole-model mesh lists, model geometry and full GS VRAM reconstruction are not implemented.
- QRS encoding is guarded by round-trip equality tests; real-file regression fixtures are still needed before treating every texture geometry as supported.
- The web importer currently accepts indexed PNG only and requires the original palette to match byte-for-byte in the logical RGBA representation.
- Very large browser archives are loaded into memory; use the desktop tools for large disc images.
- RAR/RAR5 behavior varies by archive and LibArchive build; verify representative files.
- The desktop CLI is a format-handling prototype, not a replacement for the existing desktop GUI.
- The TurboWarp Stage bridge is not sandbox-compatible.

Keep this development branch separate from `main` until CI and tests against real project files pass.

## References and licenses

- Original game resource structures and texture upload logic: [BT3-Decompiled](https://github.com/z3xox/BT3-Decompiled).
- Model texture reference rebasing: [BT3-Decompiled model_tex.c](https://github.com/z3xox/BT3-Decompiled/blob/main/src/battle/model_tex.c).
- Separate PC-port GS texture replacement system (reference only; not treated as original game code): [Tenkaichi3Decomp](https://github.com/z3xox/Tenkaichi3Decomp).
- Project license: GPL-3.0. Preserve dependency notices when distributing combined builds.
