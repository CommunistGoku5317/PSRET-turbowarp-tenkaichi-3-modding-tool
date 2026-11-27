# BT3 Modder 0.3.0 — shared-core prototype

Version **0.3.0** introduces the shared C core and the first browser/desktop integrations while keeping the existing TurboWarp JavaScript extension separate. This is a development prototype, not a stable release.

## 0.3.0 scope

| Component | 0.3.0 implementation | Current status |
|---|---|---|
| Shared game-format core | C parser for AFS, AFL, and Spike PAK | Implemented; native tests included |
| Browser edition | Vite UI + C core compiled to WebAssembly | Implemented in source; CI build must pass before deployment is considered verified |
| Generic browser archives | `archive-wasm` 2.1.0 / LibArchive WASM | 7z, RAR-family, and ISO readers integrated; verify real RAR/RAR5 fixtures |
| Desktop archive CLI | LibArchive-backed listing and safe single-file extraction | Implemented; 7z and ISO smoke tests included |
| TurboWarp Stage bridge | GitHub Pages iframe overlay with open/list/extract messaging | Prototype integration; currently requires Unsandboxed DOM access |
| QRS textures | Existing JavaScript 4-bit/8-bit decoder remains the reference | Not ported to C; no QRS behavior is replaced |

The browser prototype reads the selected archive/image into memory, so very large ISO files are not its target. The desktop CLI is a format-handling prototype, not a replacement for the existing packaged desktop GUI.

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

The CLI lists supported LibArchive containers and extracts one regular file. It requires a new output directory, refuses absolute paths and `..` traversal, and does not create archive symlinks or hardlinks.

## Browser edition

See [`web/README.md`](web/README.md). It requires Node.js/npm and Emscripten. From `web/`:

```sh
npm install
npm run build
npm run dev
```

The build compiles `core/bt3_core.c` to WebAssembly and bundles the browser UI. GitHub Actions is configured to build the native tests, desktop tools, and browser artifact on branch pushes.

## TurboWarp edition

The existing root `BT3-Web-Modder.js` remains unchanged so its AFS/PAK/AFL, nested-archive, ZIP export, and QRS paths are not silently replaced. See [`integrations/turbowarp/README.md`](integrations/turbowarp/README.md). The current extension does not itself include 7z, RAR, or ISO readers.

The Stage bridge embeds the hosted browser UI in an iframe and currently requires the Unsandboxed extension mode because it accesses the page DOM. It is a prototype, not a sandbox-compatible bridge.

## 7z, RAR, and ISO compatibility

The browser edition uses [`archive-wasm`](https://github.com/HeavenVolkoff/archive-wasm) 2.1.0, which compiles LibArchive for WebAssembly. The native desktop CLI uses the system LibArchive library. LibArchive's RAR/RAR5 coverage has limitations, and ISO support is based on ISO9660-family readers rather than a guarantee for UDF or every custom disc layout. Verify the actual archives used by the project before describing every variant as supported. See the [archive-wasm format list](https://github.com/HeavenVolkoff/archive-wasm#supported-archives-types) and [LibArchive format notes](https://github.com/libarchive/libarchive/wiki/LibarchiveFormats).

The generic container layer is separate from the BT3-specific AFS/PAK/AFL layer: a 7z/RAR/ISO container can expose a PAK, which is then parsed by the shared BT3 core.

## Known limitations

- No verified RAR/RAR5 fixture is included yet.
- A successful GitHub Actions WASM build is required before treating the browser bundle as deployable.
- The TurboWarp bridge is currently Unsandboxed and is not yet a sandbox-compatible extension.
- The QRS decoder, palette pairing, PNG replacement encoder, and archive rebuilding have not been ported to C.
- The desktop CLI is not a replacement for the Windows/Linux desktop GUI packages.
- Large browser archives are read into memory.

Keep this branch separate from `main` until CI and real-file regression tests pass.

## Credits and license

- QRS and PS2 GS reverse-engineering references: KkTeam's `KkTeamQrsExplorer`.
- Game decompilation references: [BT3-Decompiled](https://github.com/z3xox/BT3-Decompiled) and [Tenkaichi3Decomp](https://github.com/z3xox/Tenkaichi3Decomp).
- Project license: GPL-3.0; `archive-wasm` is GPL-3.0-or-later. Preserve its notices when distributing a combined build.
