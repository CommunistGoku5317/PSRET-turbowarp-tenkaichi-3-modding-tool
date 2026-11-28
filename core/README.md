# BT3 shared C core — 0.4.0

The shared C library contains the 0.3 archive parsers and the new decomp-derived texture metadata / model-stream helpers. It is UI-independent and is built natively and as WebAssembly.

## Archive APIs retained from 0.3

- **Spike PAK:** validates the count and offset table and returns entry ranges. The first payload offset must follow the table and be 16-byte aligned; offsets must be monotonic and inside the file.
- **AFS:** validates the `AFS\0` header and (offset, size) table. Each entry range is reported valid/invalid individually.
- **AFL:** validates the `AFL\0` header, count at byte 12 and 32-byte names.
- **Container identification:** recognizes structurally valid AFS, PAK or AFL input.

## New texture metadata APIs

Header: `bt3_texture.h`; implementation: `bt3_texture.c`.

### TexFile / TexEntry

`bt3_texfile_validate` checks the 16-byte file header and entry table. `entOfs` is measured in 32-bit words. `bt3_texfile_entry_info` exposes the disk fields of one 0x40-byte TexEntry:

- pixel and CLUT offsets/sizes, with per-range validity flags;
- TBP/CBP steps and offsets;
- pixel/CLUT BITBLTBUF fields;
- TEX0 low/high words, PSM, and storage dimensions derived from TW/TH.

The pointer fields at the end of the decomp's runtime TexEntry are not treated as on-disk pointers. Pixel/CLUT offsets are relocated from the resource base, matching `Res_RelocateOffsets`.

**Important:** these offsets refer to GS upload packet data handled by `Tex_UploadPixels` / `Tex_UploadClut`. The core does not yet decode their payload into PNG, emulate GS swizzling, or rebuild VRAM. It is a metadata parser, not a GS texture decoder.

### Single-stream model TEX0 references

`bt3_model_vif_scan` and `bt3_model_vif_rebase` implement the known single-stream behavior from `MdlTex_RebaseChain`:

- find `0x6C058000` records until `0x70000000`;
- locate the first TEX0 at words 5/6 and second at words 9/10;
- scan minimum TBP0 / CBP from TEX0A;
- rebase the four pointer fields using the supplied bases.

These APIs accept one bounded, word-aligned VIF stream. They do not parse the full ObjMdlMesh linked list or whole model format. A complete model editor needs real mesh-container fixtures and validated record bounds.

## Native build and tests

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
ctest --test-dir build --output-on-failure
```

The C tests cover PAK/AFS/AFL structure, TexFile entry metadata and a single VIF material stream scan/rebase.

## WebAssembly

The web build compiles both `bt3_core.c` and `bt3_texture.c`. The exported functions include the 0.3 archive API plus TexFile and VIF helpers. From `web/`:

```sh
npm install
npm run build:wasm
npm test
npm run dev
```

## Format rules

- The QRS PAK record parser remains separate from TexFile.
- Do not interpret TexFile DMA packet payloads as plain bitmap data without a verified GS transfer/PSM decoder.
- Do not infer the full mesh list layout from the single-stream VIF function.
- Add independent fixtures and tests before broadening supported TexFile or model layouts.
