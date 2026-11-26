# BT3 Modder — shared-core update (prototype)

This branch starts the shared C/C++-friendly architecture for the TurboWarp, browser, and Windows/Linux desktop editions. It keeps the current TurboWarp extension source separate while the new parsers and archive adapters are tested.

## What is in this branch

| Part | Current implementation | Status |
|---|---|---|
| Shared game-format core | C parser for AFS, AFL, and Spike PAK | Implemented; native tests included |
| Browser edition | Vite interface + C core compiled to WASM | Source and CI build configured; WASM build still needs a successful CI run |
| 7z / RAR / ISO in browser | `archive-wasm` 2.1.0 (LibArchive WASM) | Integrated in browser prototype; real RAR variants still need fixtures |
| Desktop generic archives | LibArchive-backed listing and safe single-file extraction CLI | Implemented; 7z and ISO smoke test included; RAR fixture not yet checked |
| TurboWarp extension | Existing `BT3-Web-Modder.js` kept intact | AFS/PAK/AFL/QRS remain; 7z/RAR/ISO adapter is not yet connected |
| QRS decoder | Existing JS 4-bit/8-bit decoder retained | Not ported to C yet; parity tests required before replacement |

The current browser prototype reads the selected archive/image into memory. It is not yet suitable for very large ISO files. The desktop CLI is a format-handling prototype, not a replacement for the existing packaged desktop GUI.

## Build and test the shared C core

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
ctest --test-dir build --output-on-failure
```

When LibArchive development files are installed, CMake also builds `bt3_archive_cli`:

```sh
./build/bt3_archive_cli game.7z
./build/bt3_archive_cli --extract 12 game.7z ./out
```

The CLI lists supported LibArchive containers and can extract one regular file. It requires a new output directory, refuses absolute paths and `..` traversal, and does not create archive symlinks or hardlinks.

## Browser edition

See [`web/README.md`](web/README.md). It requires Node.js/npm and Emscripten. From the `web/` directory:

```sh
npm install
npm run build
npm run dev
```

The build compiles `core/bt3_core.c` to WebAssembly and bundles the browser UI. The GitHub Actions workflow builds an artifact for each push to this branch. Once changes are merged to `main`, the workflow can publish the browser bundle through GitHub Pages (the repository's Pages setting must allow GitHub Actions deployment).

## TurboWarp edition

The existing root `BT3-Web-Modder.js` remains unchanged in this branch so its AFS/PAK/AFL, nested-archive, ZIP export, and QRS paths are not silently replaced. See [`integrations/turbowarp/README.md`](integrations/turbowarp/README.md) for the planned connection. The current checked-in extension does not itself include 7z, RAR, or ISO readers.

## 7z, RAR, and ISO compatibility

The browser edition uses [`archive-wasm`](https://github.com/HeavenVolkoff/archive-wasm) 2.1.0, which compiles LibArchive for WebAssembly and documents readers for 7z, RAR, and ISO images. The native desktop CLI uses the system LibArchive library. LibArchive's RAR/RAR5 coverage has limitations, and its ISO support is ISO9660-family support rather than a guarantee for UDF or every custom disc layout. Check the actual archives used by the project before describing all variants as supported. [archive-wasm documentation](https://github.com/HeavenVolkoff/archive-wasm#supported-archives-types) and [LibArchive format notes](https://github.com/libarchive/libarchive/wiki/LibarchiveFormats)

The generic container layer is separate from the BT3-specific AFS/PAK/AFL layer: a 7z/RAR/ISO can expose a PAK, which is then parsed by the shared BT3 core.

## What is deliberately not claimed yet

- No verified RAR/RAR5 fixture has been added to this repository yet.
- The browser WASM production build must pass GitHub Actions before the web app is considered deployable.
- The existing TurboWarp extension is not yet wired to the new generic archive layer.
- The QRS decoder and PNG replacement have not been ported to C; the current JavaScript path stays the reference implementation until independent texture fixtures verify parity.
- The desktop CLI prototype is not a replacement for the existing Windows/Linux desktop GUI packages.

Keep this branch separate from `main` until the CI builds pass and the remaining format/UI regressions have been tested with real project files.

## Credits and license

- QRS and PS2 GS reverse-engineering references: KkTeam's `KkTeamQrsExplorer`.
- Game decompilation references: [BT3-Decompiled](https://github.com/z3xox/BT3-Decompiled) and [Tenkaichi3Decomp](https://github.com/z3xox/Tenkaichi3Decomp).
- Project license: GPL-3.0; `archive-wasm` is GPL-3.0-or-later. Preserve its notices when distributing a combined build.
