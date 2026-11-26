# TurboWarp integration

The experimental **BT3 Pages Bridge** is designed to run as a sandboxed TurboWarp extension. It communicates with the browser engine hosted on GitHub Pages using a child iframe and `postMessage`.

## Load in TurboWarp

1. Open TurboWarp and choose **Add Extension → Custom Extension → URL**.
2. Paste this raw URL:
`https://raw.githubusercontent.com/CommunistGoku5317/PSRET-turbowarp-tenkaichi-3-modding-tool/wasm-core-prototype/integrations/turbowarp/bt3-pages-bridge.js`
3. Leave **Run without sandbox** disabled (normal sandboxed mode).
4. Run **connetti al motore BT3 Pages** and wait for the status reporter to say the engine is connected.
5. Run **apri archivio con BT3 Modder** and choose a local file. If the browser blocks the file picker from a scripted block, open the Pages app directly and use its own file picker as a temporary workaround.
6. Read **voci archivio (JSON)** for the entry list. Use **estrai voce numero (1-based)** to download a selected file.

## Current limitations

- Requires an internet connection and a successful GitHub Pages deployment.
- Uses a child iframe and `postMessage`; the TurboWarp project does not upload files to a server. File bytes are processed in the browser.
- The sandbox-compatible update is experimental: nested iframe creation, file-picker activation, and downloads must still be verified in the target TurboWarp browser.
- The extension currently exposes open/list/extract only. It does not yet expose QRS texture preview/replacement or archive editing/repacking.
- The C/WASM core currently validates AFS/PAK/AFL tables; 7z/RAR/ISO reading is handled by the browser-side `archive-wasm` package.
- Nested archives can be opened in the web UI, but the extension bridge currently exposes only the top-level entry list and extraction.
- Test with copies of files first. Large archives may use substantial browser memory.

This is a prototype; do not replace the existing stable `BT3-Web-Modder.js` extension with it yet.