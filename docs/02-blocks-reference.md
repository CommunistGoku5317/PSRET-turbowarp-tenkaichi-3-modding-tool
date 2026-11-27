# Blocks Reference — BT3 Web Modder

This reference is extracted from the blocks array returned by BT3WebModder.getInfo() in BT3-Web-Modder.js on the repository's main branch.

The extension defines **28 blocks**. Labels are reproduced exactly as they appear in the source (Italian); descriptions explain their actual implementation. The explorer and QRS controls are HTML UI elements, not additional Scratch blocks.

## Archive Explorer

| Block Syntax / Name | Arguments / Inputs | Return Type | What it actually does |
|---|---|---|---|
| carica archivio AFS | None | Command | Opens a local file picker for an AFS file. Checks the AFS\0 magic, reads the entry count and offset/size table, generates fallback names, and makes the archive current. |
| carica archivio PAK | None | Command | Opens a local file picker for a PAK file. Parses the little-endian count and N+1 offset table, then populates the current entry list. |
| apri archivio nella voce selezionata | None | Command | Attempts to parse the selected entry as a nested AFS first, then as a nested PAK. On success, pushes the current archive state onto the navigation stack and opens the nested archive. |
| torna all archivio precedente | None | Command | Pops the previous archive state from archiveStack and restores its archive object, entries, names, type, and selection/search indices. |
| carica indice AFL | None | Command | Opens an AFL file after an AFS is loaded. Reads the AFL name table and maps names to AFS entries by index. It does not load an AFL as an archive. |
| apri esplora archivio | None | Command | Creates the HTML explorer overlay if needed, displays it, and renders the current entry list and controls. The overlay is attached to document.body; it is not a native Scratch Stage object. |

## Rebuilding and Export

| Block Syntax / Name | Arguments / Inputs | Return Type | What it actually does |
|---|---|---|---|
| crea nuovo AFS da archivio ZIP | None | Command | Opens a ZIP file, extracts its non-directory entries with JSZip, builds an AFS header and offset/size table, aligns each entry start to 2048 bytes, and downloads the new AFS. The AFS table does not store the ZIP filenames; the status message notes that names remain in the original ZIP. |
| estrai file con indice [INDEX] | INDEX: Number (default 0) | Command | Extracts the current entry at the supplied index using Blob.slice(offset, offset + size) and downloads it with the current display name. |
| esporta file all’indice [I] | I: Number (default 0) | Command | Legacy alias for single-entry export. Calls the same exportOne() implementation as the newer estrai block. |
| esporta archivio in formato ZIP | None | Command | Loads JSZip from cdnjs if needed, adds each valid current entry to a ZIP using its display name, and downloads the ZIP. Entries are stored without recompression (STORE). |
| esporta indice TXT | None | Command | Downloads a tab-separated text index containing entry index, name, offset, size, and validity. |
| esporta indice CSV | None | Command | Downloads a CSV index with the same fields as the TXT export. Names are quoted and embedded quotes are doubled. |
| sostituisci file all’indice [I] con file locale | I: Number (default 0) | Command | Replaces an entry in the current **AFS only**. If the new file fits, the existing layout is retained and the old remaining space is zero-filled. If it is larger, the AFS is rebuilt with a new table and 2048-byte-aligned entry starts. The AFL is not updated. |

## Search and Entry Metadata

| Block Syntax / Name | Arguments / Inputs | Return Type | What it actually does |
|---|---|---|---|
| cerca file chiamato [NAME] | NAME: String (default resident_effect.pak) | Command | Performs a case-insensitive exact-name search in this.names, stores the first matching index in searchResultIndex, updates the status, and updates the explorer search field if it exists. |
| nome AFL con indice [INDEX] | INDEX: Number (default 0) | String reporter | Returns the display name at the given index, or an empty string if there is no name. Despite the label, names can be generated fallback names when no AFL is loaded. |
| dimensione file con indice [INDEX] | INDEX: Number (default 0) | Number reporter | Returns the entry size at the given index, or 0 if the index does not resolve to an entry. |
| numero file nell archivio | None | Number reporter | Returns the number of entries in the current archive. |
| indice dell ultimo risultato di ricerca | None | Number reporter | Returns searchResultIndex; it is -1 when no result has been found or no search result is stored. |
| elenco completo dei file in JSON | None | String reporter (JSON) | Returns a JSON array with indice, nomeAFL, nomeOriginaleAFS (always null in the current implementation), offset, dimensione, and valido for each entry. |
| nome file all’indice [I] | I: Number (default 0) | String reporter | Legacy reporter that returns the display name for an entry index, or an empty string. |
| dimensione file all’indice [I] | I: Number (default 0) | Number reporter | Legacy reporter that returns the entry size, or 0. |
| offset file all’indice [I] | I: Number (default 0) | Number reporter | Returns the entry's absolute byte offset within the current archive, or 0. |
| cerca nome contenente [Q] | Q: String (default .pak) | Command | Performs a case-insensitive substring search and stores the first matching index in searchResultIndex. It does not enumerate all matches. |
| indice risultato ricerca | None | Number reporter | Legacy reporter for the same searchResultIndex state returned by indice dell ultimo risultato di ricerca. |

## Status

| Block Syntax / Name | Arguments / Inputs | Return Type | What it actually does |
|---|---|---|---|
| stato BT3 Web Modder | None | String reporter | Returns the current status string stored by set(). It reports the latest operation message or error message. |

## Notes on arguments and index handling

- The source uses two argument labels for entry indices: INDEX in the newer block set and I in legacy blocks.
- Index values are converted with Math.floor(Number(value)). Non-finite values become -1.
- Reporter methods generally return safe fallback values for invalid indices: empty string for names and 0 for sizes/offsets.
- Search returns only the first matching index. It is not a multi-result search API.
- getList() returns a JSON string, not a native Scratch list.
- Command blocks do not expose success/failure as a Boolean. Check **stato BT3 Web Modder** for the operation message.

## UI features that are not Scratch blocks

The following functions are available through the explorer overlay rather than the Scratch block palette:

- **Apri AFS / Apri PAK:** file-picker buttons that call the same archive loading methods.
- **Apri selezionato / Indietro:** nested archive navigation.
- **Estrai selezionato / Esporta ZIP / Crea AFS da ZIP:** buttons connected to the corresponding methods.
- **Single-click QRS inspection:** scans the selected entry and displays any decoded textures.
- **Esporta PNG:** exports a canvas-rendered texture preview.
- **Sostituisci con PNG:** invokes the PNG replacement path, which currently stops because the QRS encoder functions it expects are missing from the exported decoder API.

There are no dedicated Scratch blocks for QRS decoding, PNG export, or QRS replacement in the current getInfo() block list.
