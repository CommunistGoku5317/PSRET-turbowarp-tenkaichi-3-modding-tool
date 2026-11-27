# Getting Started — BT3 Web Modder

BT3 Web Modder is a browser-based archive explorer and QRS texture inspection tool for *Dragon Ball Z: Budokai Tenkaichi 3* (PS2/Wii). It runs as a custom TurboWarp extension and uses local browser file APIs; archive contents are not uploaded to a project server.

> **Filename note:** the actual root file on the current main branch is **BT3-Web-Modder.js** (hyphens). The existing README and installation guide also refer to the historical spelling **BT3_Web_Modder.js** (underscores). Download the actual file named BT3-Web-Modder.js.

## 1. Requirements

- A modern browser supported by TurboWarp.
- The TurboWarp editor: <https://turbowarp.org/>.
- A local copy of BT3-Web-Modder.js from this repository.
- An AFS or PAK archive. An AFL file is an optional companion name index for an AFS archive.

The extension loads JSZip 3.10.1 from cdnjs when ZIP import/export is first requested. Those ZIP features require network access to that CDN. AFS/PAK browsing and QRS decoding are implemented in the extension itself.

## 2. Download the extension

1. Open the repository's main branch.
2. Select the root-level **BT3-Web-Modder.js** file.
3. Open the raw file or use GitHub's download option.
4. Save it locally without changing its contents.

Source: <https://github.com/CommunistGoku5317/PSRET-turbowarp-tenkaichi-3-modding-tool/blob/main/BT3-Web-Modder.js>

## 3. Add it to TurboWarp

1. Open <https://turbowarp.org/>.
2. Open a project in the editor.
3. Select **Add Extension**.
4. Choose **Custom Extension**.
5. Select the **File** tab.
6. Choose the downloaded BT3-Web-Modder.js.
7. Enable **Run extension without sandbox** (also called **Unsandboxed**).
8. Load the extension and accept the unsandboxed-extension warning if TurboWarp displays one.

### Why Unsandboxed mode is required

The script explicitly checks Scratch.extensions.unsandboxed at startup and throws an error if the extension is sandboxed. This is a requirement of the implementation, not just a performance recommendation.

The extension needs direct browser-page access because it:
- Creates file-picker elements with document.createElement('input').
- Reads local File/Blob slices through arrayBuffer().
- Parses binary data with Uint8Array and DataView.
- Creates an HTML explorer overlay attached to document.body.
- Renders texture previews with canvas.
- Downloads generated files with Blob and object URLs.

Unsandboxed extensions have more access to the page than sandboxed extensions. Only load code you trust; use the repository source rather than an unverified copy.

## 4. Open the Archive Explorer

After loading the extension, a **BT3 Web Modder** block category appears in the palette.

1. Find the command block **apri esplora archivio**.
2. Run it.
3. The extension creates an HTML overlay above the current page, with archive controls, a searchable entry list, status text, and texture-preview area.
4. Use **Apri AFS** or **Apri PAK** in the overlay, or run the matching extension command block.

The overlay uses fixed browser-page positioning (position: fixed; inset: 5%). It is not a Scratch sprite or a native Stage costume.

## 5. Load your first archive

### Option A — AFS

1. Run **carica archivio AFS**, or click **Apri AFS** in the explorer.
2. Select an .afs file.
3. The extension checks the AFS\0 signature and reads the little-endian entry count and offset/size table.
4. Entries appear in the explorer. Without an AFL name index, generated names such as file_0000.bin are shown.

### Option B — PAK

1. Run **carica archivio PAK**, or click **Apri PAK**.
2. Select a .pak file.
3. The extension reads the little-endian entry count and N+1 offset table.
4. Entries appear with generated names such as elemento_0000.bin.

### Option C — AFL name index

An AFL is **not treated as a standalone archive** by this extension. It is loaded after an AFS and supplies display names by entry index.

1. Load the corresponding AFS first.
2. Run **carica indice AFL**.
3. Select the matching .afl file.
4. The extension reads the AFL name records and maps each name to the AFS entry at the same index.

The AFL loader expects the name index to correspond to the currently loaded AFS. It does not use an independent filename-to-offset lookup.

## 6. Explore, extract, and open nested archives

- **Single click / tap an entry:** selects it and starts a QRS texture scan for that entry.
- **Double click / double tap:** attempts to interpret the selected entry as a nested AFS, then as a nested PAK.
- **Apri selezionato:** performs the same nested-archive attempt.
- **Indietro:** restores the previous archive level.
- **Estrai selezionato:** extracts the selected entry.
- **Esporta ZIP:** exports all valid entries in the current archive into a ZIP file.
- **Esporta indice TXT / CSV:** exports the current entry list with offsets, sizes, names, and validity.

Nested archive detection is based on parsing the selected entry as AFS first and PAK second. It is not a general-purpose format detector.

## 7. QRS texture preview

When an entry is selected, the extension wraps its bytes in a temporary one-entry PAK structure and scans for QRS records. Supported indexed texture previews use:
- **4-bit indexed textures:** 16-color palette descriptors.
- **8-bit indexed textures:** 256-color palette descriptors, with CT32 CSM1 palette index remapping.

A decoded texture is shown in a canvas preview with dimensions, palette count, record offsets, decoder information, and an **Esporta PNG** button.

The preview PNG is produced from canvas RGBA pixels. It is useful for viewing and reference, but it is not guaranteed to be an indexed PNG suitable for the current import parser.

## 8. Current texture replacement limitation

The interface displays a **Sostituisci con PNG** control. However, the current source has an implementation gap: replaceQrsTexture() requires encodeQrs4Texture() or encodeQrs8Texture(), but neither function is currently defined or exported by the QRS module. The module exports the lower-level packPaletteIndices4() and copyPaletteIndices8() helpers instead.

As a result, the current replacement path stops with **“Encoder QRS non inizializzato.”** Do not rely on PNG re-injection as a working feature in this revision. The archive replacement/rebuild code exists, but the missing QRS encoders prevent the complete texture replacement workflow from reaching it.

## 9. Safety and practical advice

- Work on copies of your game archives.
- Keep the original AFS/PAK and any matching AFL file unchanged.
- Large archives and texture scans can consume significant browser memory, even though archive entry reads use Blob.slice().
- ZIP import/export loads JSZip from cdnjs.
- The extension does not currently provide a general PAK-entry replacement block; the generic replace block is AFS-only.
- The current source is licensed under GPL-3.0. The goal is to keep modding utilities inspectable, shareable, and improvable by the community.

## Related documentation

- [Blocks Reference](02-blocks-reference.md)
- [Texture Modding Tutorial](03-texture-modding-tutorial.md)
- [Technical Specs and Architecture](04-technical-specs-and-architecture.md)
