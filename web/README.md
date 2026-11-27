# BT3 Modder 0.3.0 — Web Edition prototype

The browser edition uses two separate format layers:

- `bt3_core.c` compiled to WebAssembly for the game-specific AFS, AFL, and Spike PAK tables.
- `archive-wasm` (GPL-3.0-or-later) for generic container browsing, including 7z, RAR, and ISO images through its LibArchive WASM build.

The QRS decoder from `BT3-Web-Modder.js` is intentionally not replaced in 0.3.0. Its 4-bit/8-bit preview and replacement paths need fixture-by-fixture parity tests before a port is enabled.

## Requirements

- Node.js 20 or newer (the dependency declares Node.js >=18.4).
- npm.
- Emscripten SDK (`emcc`) available in `PATH`.

## Run locally

```sh
npm install
npm run build:wasm
npm run dev
```

Open the local Vite URL printed by the command. To create the production bundle:

```sh
npm run build
npm run preview
```

The `build:wasm` script writes `public/bt3_core.js` and `public/bt3_core.wasm`. These are generated build outputs and should not be edited manually.

## Formats and current limitations

- **AFS / PAK / AFL:** parsed by the shared C core. The parser preserves the checked-in JavaScript behavior for PAK tables, including allowing bytes after the last indexed entry. AFS entry ranges are marked individually valid/invalid rather than rejecting the whole archive.
- **7z / RAR / ISO:** listed and extracted through `archive-wasm` / LibArchive. RAR has format-specific limitations; encrypted formats other than ZIP are not supported by this dependency. ISO support is based on LibArchive's ISO9660 reader (including Joliet/Rock Ridge where available), not a promise of UDF support.
- **Nested archives:** open a selected extracted entry and the app attempts to parse it as another BT3 or LibArchive container.
- **Large images:** the browser path reads the selected image into memory. Very large disc images are better handled by the native desktop command-line integration until a random-access/streaming reader is added.
- **QRS:** 0.3.0 does not yet call the current QRS decoder from WASM. The existing TurboWarp decoder remains the reference implementation.
- **TurboWarp embedding:** the Stage bridge loads this browser app in a hosted iframe. The bridge currently requires Unsandboxed DOM access and should be treated as experimental.

## License note

The repository is GPL-3.0. `archive-wasm` is GPL-3.0-or-later, which is compatible with this project. Preserve its license notices when distributing a build.
