# BT3 Modder 0.1 (`BT3_Web_Modder.js` & `BT3_Desktop_Modder`)

A browser-based and desktop archive explorer, rebuilder, and **QRS texture decoder** for *Dragon Ball Z: Budokai Tenkaichi 3* (PS2/Wii), available as a TurboWarp extension and a standalone desktop app.

## Available Editions

* **🌐 BT3 Web Modder (`BT3_Web_Modder.js`):** Unsandboxed extension for TurboWarp / CodeTorch.
* **🖥️ BT3 Desktop Modder (`v0.1`):** Standalone utility with a **GUI Mode** (quick import for `.AFS`, `.PAK`, `.AFL` and `.ZIP` building) and a **Scriptable CLI Mode** supporting `.PSRTCM` scripts.

## Core Features

* **Archive Support:** Browse, search, and extract `.afs`, `.pak`, and `.afl` files (including nested archives) with memory-efficient streaming via `blob.slice()`.
* **Rebuilding & Export:** Replace AFS entries with `2048-byte` alignment, build `.afs` archives from `.zip` files, and export data to `.zip`, `.txt`, and `.csv`.
* **QRS Texture Decoder (4-bit & 8-bit):** Features static analysis from the original loader (`0x404780` mapper, PS2 GS swizzling, CT32 CSM1 CLUT unscrambling), live canvas preview, and one-click PNG export.

## Screenshots & Layout

* **Web Edition:** Includes AFS Explorer, QRS Texture Decoder, and custom TurboWarp/Scratch blocks.
* **Desktop Edition:** Features a Graphical User Interface (GUI) and a Scriptable Terminal (`.PSRTCM`).

## Quick Start & Roadmap

* **Installation:** Use the **[Installation Guide](Install-guide.md)** for TurboWarp setup or grab the latest build from the **[Releases](../../releases)** page.
* **Known Issues:** Ongoing work includes fixing `PSMT4`/`PSMCT32` page wrapping/deswizzling artifacts, multi-texture PAK palette pairing, and experimental PNG re-import (`encodeQrs4Texture` / `encodeQrs8Texture`).

## Credits & License

* **Credits:**
  * Special thanks to **KkTeam (`KkTeamQrsExplorer`)** for reverse-engineering Spike's QRS texture formats and PS2 GS swizzling.
  * Special thanks to **[z3xox](https://github.com/z3xox)** and the **[BT3-Decompiled](https://github.com/z3xox/BT3-Decompiled)** / **[Tenkaichi3Decomp](https://github.com/z3xox/Tenkaichi3Decomp)** projects for their open-source decompilation work on *Dragon Ball Z: Budokai Tenkaichi 3*, which provided invaluable insight into the game's internal functions and asset loaders.
* **License:** Licensed under the **GPL 3.0 License** (see [LICENSE](LICENSE)).
