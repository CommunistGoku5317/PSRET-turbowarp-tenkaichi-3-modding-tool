# TurboWarp integration

The experimental **BT3 Pages Bridge** is an unsandboxed TurboWarp extension that communicates with the browser engine hosted on GitHub Pages using a hidden iframe and `postMessage`.

## Load in TurboWarp

1. Open TurboWarp and choose **Add Extension → Custom Extension → URL**.
2. Paste this raw URL:
`https://raw.githubusercontent.com/CommunistGoku5317/PSRET-turbowarp-tenkaichi-3-modding-tool/wasm-core-prototype/integrations/turbowarp/bt3-pages-bridge.js`
3. Enable **Run without sandbox** when prompted. This is required for the file picker and iframe.
4. Run **connetti al motore BT3 Pages** and wait for the status reporter to say the engine is connected.
5. Run **apri archivio con BT3 Modder** and choose a local file.
6. Read **voci archivio (JSON)** for the entry list. Use **estrai voce numero (1-based)** to download a selected file.

## Current limitations

- Requires an internet connection and a successful GitHub Pages deployment.
- Uses a hidden iframe; the TurboWarp project does not upload files to a server. File bytes are processed in the browser.
- The extension currently exposes open/list/extract only. It does not yet expose QRS texture preview/replacement or archive editing/repacking.
- The C/WASM core currently validates AFS/PAK/AFL tables; 7z/RAR/ISO reading is handled by the browser-side `archive-wasm` package.
- Nested archives can be opened in the web UI, but the extension bridge currently exposes only the top-level entry list and extraction.
- Test with copies of files first. Large archives may use substantial browser memory.

This is a prototype; do not replace the existing stable `BT3-Web-Modder.js` extension with it yet.