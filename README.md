# PSRET AFS/PAK 0.1 (`PSRET_AFS_PAK.js`)

A browser-based archive explorer, rebuilder, and **QRS texture decoder** for *Dragon Ball Z: Budokai Tenkaichi 3* (PS2/Wii), built as an unsandboxed **TurboWarp** extension.

Designed to run natively in modern web browsers with **zero installation**—compatible with Windows, macOS, Linux, iPadOS, and mobile devices (landscape mode recommended on smaller screens).

## Features

* **AFS, AFL & Spike PAK Support:** Browse, search, and extract files from `.afs` and `.pak` archives, including **nested archives** inside entries.
* **Memory-Efficient Streaming:** Uses `blob.slice()` chunked reading so multi-gigabyte archives can be inspected even on low-RAM devices.
* **Archive Rebuilding:**
  * Replace individual AFS entries with automatic `2048-byte` alignment.
  * Build a brand-new `.afs` archive directly from a `.zip` file.
  * Export entire archives or file tables to `.zip`, `.txt`, and `.csv`.
* **Built-in QRS Texture Decoder (4-bit & 8-bit):**
  * Reconstructed from static analysis of the original loader (`0x404780` mapper, PS2 GS swizzling tables, and CT32 CSM1 CLUT unscrambling).
  * Instant canvas preview inside the explorer UI and one-click **PNG export**.

## Installation & Quick Start

Need step-by-step instructions on how to load `PSRET_AFS_PAK.js` into TurboWarp? Check out the **[Installation Guide](install-guide.md)**.

## Known Issues & Work in Progress

* **Deswizzling / Page Stride:** Some texture geometries still exhibit vertical row overlapping or tiling artifacts (`PSMT4` / `PSMCT32` page wrapping).
* **Palette Pairing & Creation:** Shared CLUTs in multi-texture PAK entries occasionally link to the wrong palette descriptor.
* **PNG Re-import:** Texture encoding/replacement (`encodeQrs4Texture` / `encodeQrs8Texture`) is still incomplete and experimental.

## Contributing

Pull requests, bug reports, and test results on different BT3 `.pak` files are welcome! If you have insights into PS2 GS `PSMT4` page strides or Spike's QRS CLUT pairing, feel free to open an Issue.

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.


