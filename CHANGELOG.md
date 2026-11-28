# Changelog

## 0.4.0 — texture workbench and decomp-derived metadata

### Added
- C TexFile/TexEntry parser based on the on-disk fields and relocation behavior in BT3-Decompiled.
- TEX0 metadata extraction: PSM and storage dimensions; per-entry pixel/CLUT offsets and range validity.
- Bounded single-stream VIF TEX0 scan/rebase following MdlTex_RebaseChain.
- QRS 4-bit and 8-bit inverse encoders with built-in decode round-trip verification.
- Indexed PNG encoder/decoder (color type 3), including PLTE/tRNS and row-filter handling.
- QRS indexed PNG export; export preserves decoded indices and logical palette/alpha rather than using canvas RGBA output.
- QRS reimport rewrites only the texture payload. The original palette record/CLUT bytes and descriptor remain unchanged.
- Browser workbench for QRS analysis, TexFile metadata and single VIF stream rebasing.
- Synthetic Node tests for QRS round-trip, CSM1 palette mapping, and indexed PNG round-trip.

### Preserved from 0.3.0
- AFS/AFL/Spike PAK C parser, WebAssembly integration, and native tools.
- Browser generic archive support, nested opening, AFL names and selected-entry extraction.
- Desktop LibArchive command-line prototype.
- Existing TurboWarp extension and archive features, now with indexed QRS PNG export/reimport.

### Explicit limitations
- TexFile metadata is parsed, but GS DMA packet payloads are not yet decoded to PNG or rebuilt as PS2 GS VRAM.
- VIF processing supports one bounded stream, not the complete ObjMdlMesh linked-list/model container.
- Synthetic tests are not a substitute for regression tests against real game files; every supported QRS geometry must pass real-fixture testing.
- This remains a development build, not a stable release.

## 0.3.0 — shared-core prototype

This milestone introduced the shared C core and the first browser/desktop integrations while retaining the existing TurboWarp JavaScript implementation as the reference for features not yet ported.

### Added
- Shared C core for AFS, AFL, and Spike PAK validation and entry metadata.
- Native CMake build, parser tests, and a small archive-inspection utility.
- LibArchive-backed desktop CLI for listing generic archives and safely extracting one regular file.
- Vite browser interface with the C core compiled to WebAssembly.
- Browser-side generic archive support through archive-wasm 2.1.0, including 7z, RAR-family, and ISO reader paths.
- Nested archive opening in the browser interface.
- GitHub Actions jobs for native Linux tests, Windows builds/tests, and the WebAssembly/browser bundle.
- Experimental TurboWarp Stage iframe bridge.

### Known limitations
- RAR/RAR5 behavior still needs verification with representative real-world fixtures.
- Browser archive handling reads the selected file into memory.
- The TurboWarp Stage bridge requires Unsandboxed DOM access.
- The desktop CLI is a prototype and does not replace the existing desktop GUI.
- The WebAssembly production build and deployment must pass CI before this milestone is considered verified.
