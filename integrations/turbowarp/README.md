# TurboWarp integration status

`BT3-Web-Modder.js` remains the stable TurboWarp extension and its existing AFS/PAK/AFL/QRS JavaScript paths are not overwritten by the experimental WASM core.

The new shared C core is already structured for WebAssembly and the browser edition uses it for AFS/PAK/AFL table parsing. The generic 7z/RAR/ISO reader currently lives in the Web Edition through `archive-wasm`; it is **not yet wired into the existing TurboWarp extension UI**. Do not advertise those formats as available in TurboWarp until the extension has an adapter and regression tests for nested entries, extraction, memory use, and offline behavior.

## Planned connection

The intended TurboWarp mode can load the archive runtime and BT3 core from the hosted Web Edition, while the existing JavaScript code remains the offline fallback for AFS/PAK/QRS. This requires the GitHub Pages build to be deployed first and a hosted-adapter handshake to be added to the extension. Loading a remote WASM module must remain optional: if the site is unavailable, current local AFS/PAK workflows must still run.

The extension's QRS decoder is not replaced by this prototype. It must be parity-tested against known-good texture fixtures before migration.
