# BT3 shared C core — 0.3.0

This is the shared, UI-independent parser used by the native desktop tools and by the browser edition after compiling it to WebAssembly.

## Implemented in 0.3.0

- **Spike PAK:** validates the count/offset table and reports entry ranges. It follows the checked-in JavaScript parser's current rules: a non-zero entry count, first payload offset after the table and 16-byte aligned, monotonically increasing offsets inside the file. Extra bytes after the final indexed entry are tolerated to preserve existing behavior.
- **AFS:** validates the `AFS\0` header and `(offset, size)` table. It reports each entry range as valid or invalid instead of rejecting a whole archive because one entry range is bad, matching the existing web parser's behavior.
- **AFL:** validates the `AFL\0` header and 32-byte names table, with the count stored at byte 12, and exposes a trimmed entry name.
- **Container identification:** detects structurally valid AFS, PAK, or AFL input.

The core does **not** decode QRS textures, pair palettes, encode replacement PNGs, or rebuild AFS/PAK files. Those operations remain in the current JavaScript implementation until their output can be compared against independent fixtures.

## Native build and tests

From the repository root:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
ctest --test-dir build --output-on-failure
```

The tests cover valid and malformed PAK/AFS/AFL tables, invalid entry ranges, entry names, and container identification.

## WebAssembly build

Install the Emscripten SDK and make sure `emcc` is on `PATH`. From `web/`:

```sh
npm install
npm run build:wasm
npm run dev
```

The build writes `web/public/bt3_core.js` and `web/public/bt3_core.wasm`. The Vite app loads the generated module asynchronously. For the production bundle, use `npm run build`.

## Desktop archive reader

When CMake finds LibArchive, it also builds `bt3_archive_cli`. It lists entries in supported generic containers and can extract one regular file by index:

```sh
./build/bt3_archive_cli game.7z
./build/bt3_archive_cli --extract 12 game.7z ./out
```

The CLI requires a new output directory, rejects absolute archive paths and `..` traversal, creates subdirectories under that fresh root, and only writes regular files. It does not extract symlinks or hardlinks.

## Format compatibility requirements

- Preserve **7z** and **RAR/RAR5** open/list/extract paths. LibArchive's RAR coverage has limitations and should be verified against real files used by the project.
- Preserve **ISO** browsing/extraction. LibArchive provides an ISO9660 reader with Joliet/Rock Ridge support depending on build; this is not a guarantee for UDF or every proprietary disc layout.
- Keep **AFS, AFL, and Spike PAK** handlers separate from generic container handling. A 7z/RAR/ISO container may contain an AFS or PAK that is then passed to this core.
- Keep current **QRS 4-bit/8-bit preview and replacement** behavior untouched until independent image fixtures verify a port.

The browser prototype uses `archive-wasm` 2.1.0 (LibArchive compiled to WebAssembly) for generic containers. The native CLI uses the system LibArchive. Both use the same format-family implementation, but platform/build differences and RAR variants still need fixture testing. See the top-level README and `web/README.md`.

## Rules for future changes

- No browser DOM, TurboWarp, filesystem, or UI dependencies in this directory.
- Compile the same C sources natively and with Emscripten.
- Do not change format rules based on guesswork. Add real fixtures and tests first.
- Do not replace working archive/QRS code until the new path passes parity tests.
