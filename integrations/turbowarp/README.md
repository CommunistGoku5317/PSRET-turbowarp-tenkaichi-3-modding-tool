# TurboWarp Stage integration

The **BT3 Modder Stage** extension displays the BT3 Modder web interface directly over the TurboWarp Stage. The web app remains hosted on GitHub Pages; the extension creates a visible iframe aligned to the Stage canvas.

## Load in TurboWarp

1. Open the project in TurboWarp.
2. Choose **Add Extension → Custom Extension → Text**.
3. Paste the complete contents of `bt3-pages-bridge.js`.
4. Enable **Run without sandbox / Unsandboxed** when prompted. This version requires unsandboxed access to the page DOM.
5. In the **BT3 Modder Stage** category, run **mostra BT3 Modder nello Stage**.
6. Use **Apri archivio / immagine** inside the Stage to select an AFS, AFL, PAK, 7z, RAR, ISO, ZIP, TAR, or supported binary file.
7. Use **nascondi BT3 Modder** or the **Chiudi** button to close the overlay.

## Blocks

- `mostra BT3 Modder nello Stage`: opens the web interface over the Stage.
- `nascondi BT3 Modder`: removes the overlay.
- `BT3 Modder visibile?`: reports whether the overlay is open.
- `stato BT3 Modder`: reports the latest status message.

## Notes and limitations

- The overlay covers the Stage while it is open; close it to return to the Scratch game.
- The interface is a compact embedded version of the GitHub Pages web app, not a native Scratch sprite interface.
- The app processes selected files locally in the browser; it does not upload archive contents to a server.
- An internet connection is required to load the hosted web app and its WASM assets.
- Large ISO/7z/RAR files can use substantial browser memory.
- This prototype currently focuses on archive browsing and extraction. It does not yet expose QRS texture preview/replacement or archive repacking through this Stage overlay.
- Test with copies of files first. The existing stable `BT3-Web-Modder.js` remains separate and is not replaced.
