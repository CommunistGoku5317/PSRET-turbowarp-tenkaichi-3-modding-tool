# Installation & Usage Guide (`BT3_Web_Modder.js`)

Since **BT3 Web Modder 0.1** runs entirely in your web browser via **TurboWarp**, you don't need to install any Windows `.exe` tools. Follow the steps below to get started on PC, Mac, Linux, iPad, or mobile.

## Step 1: Download `BT3_Web_Modder.js`
1. Go to the **[Releases](https://github.com)** page (or click on `BT3_Web_Modder.js` in the [main repository](https://github.com) and tap the **Download raw file** button).
2. Save `BT3_Web_Modder.js` to your device.

## Step 2: Load the Extension into TurboWarp
1. Open **[TurboWarp](https://turbowarp.org)** in any modern browser (Chrome, Safari, Edge, Firefox, Brave).
2. Tap **Add Extension** in the bottom-left corner of the editor.
3. Scroll down to the bottom of the extension library and choose **Custom Extension**.
4. Select the **File** tab and pick the `BT3_Web_Modder.js` file you just downloaded.
5. **Important:** Make sure to check **"Run extension without sandbox"** (required for local file streaming and ZIP/PNG export), then tap **Load**.

## Step 3: Launch the Archive Explorer
1. A new blue block category will appear in the palette.
2. Tap or drag the **`apri esplora archivio`** (*Open Archive Explorer*) block to open the interactive UI overlay.
3. *(Tip for iPad & Mobile users: rotate your device to **landscape mode** for the best layout).*

## Explorer Controls & Shortcuts
* **Apri AFS / Apri PAK:** Load a `.afs` or `.pak` archive from your device.
* **Single-tap / click on an entry:** Scans the file for QRS textures and opens a live preview with **PNG export** options.
* **Double-tap / double-click (or tap *Apri selezionato*):** Opens nested `.afs` or `.pak` archives stored inside that entry.
* **Indietro:** Returns to the previous archive level.
* **Estrai selezionato / Esporta ZIP:** Extracts the highlighted file or exports the entire archive into a `.zip`.
* **Crea AFS da ZIP:** Packs any `.zip` file into a valid 2048-byte aligned `.afs` archive.
