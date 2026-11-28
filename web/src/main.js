import { extract } from 'archive-wasm'
import { QRS } from './qrs.js'
import { encodeIndexedPNG, decodeIndexedPNG } from './indexed-png.js'

const byId = (id) => document.getElementById(id)
const fileInput = byId('archive-file')
const aflInput = byId('afl-file')
const list = byId('entry-list')
const status = byId('status')
const title = byId('archive-title')
const meta = byId('archive-meta')
const back = byId('back-button')
const download = byId('download-button')
const coreState = byId('core-state')
const analyzeQrsButton = byId('analyze-qrs')
const analyzeTexFileButton = byId('analyze-texfile')
const qrsResults = byId('qrs-results')
const texfileResults = byId('texfile-results')
const modelVifInput = byId('model-vif-file')
const modelStatus = byId('model-status')
const rebaseModelButton = byId('rebase-model')
let modelVifBytes = null
let modelVifName = ''

let corePromise
let current = null
let stack = []
let selected = -1
let selectedData = null

const stageEmbed = new URLSearchParams(location.search).has('turbowarpStage');
const closeEmbed = byId('close-embed');
if (stageEmbed && closeEmbed) {
  closeEmbed.hidden = false;
  closeEmbed.addEventListener('click', () => {
    if (window.parent !== window) window.parent.postMessage({ type: 'bt3-close' }, '*');
  });
}

function say(message) {
  status.textContent = message;
  if (stageEmbed && window.parent !== window) {
    window.parent.postMessage({ type: 'bt3-status', message: String(message) }, '*');
  }
}

async function getCore() {
  if (!corePromise) {
    if (typeof window.BT3Core !== 'function') throw new Error('bt3_core.js non generato: esegui npm run build con Emscripten.')
    corePromise = window.BT3Core({ locateFile: (path) => new URL('./' + path, document.baseURI).href })
  }
  return corePromise
}

async function parseBt3(bytes, label) {
  const m = await getCore()
  const data = m._malloc(bytes.length || 1)
  const info = m._malloc(8)
  const entry = m._malloc(12)
  const name = m._malloc(33)
  try {
    m.HEAPU8.set(bytes, data)
    const kind = m._bt3_container_kind(data, bytes.length)
    if (!kind) return null
    const validate = kind === 1 ? m._bt3_afs_validate : kind === 2 ? m._bt3_pak_validate : m._bt3_afl_validate
    const rc = validate(data, bytes.length, info)
    if (rc !== 0) throw new Error('Core BT3: ' + rc)
    const count = m.HEAPU32[info >>> 2]
    const tableEnd = m.HEAPU32[(info >>> 2) + 1]
    const type = kind === 1 ? 'AFS' : kind === 2 ? 'PAK' : 'AFL'
    if (kind === 3) {
      const names = []
      for (let i = 0; i < count; i++) {
        const r = m._bt3_afl_entry_name(data, bytes.length, i, name, 33)
        if (r !== 0) throw new Error('AFL: ' + r)
        const raw = m.HEAPU8.slice(name, name + 33)
        const end = raw.indexOf(0)
        names.push(new TextDecoder().decode(raw.slice(0, end < 0 ? 33 : end)))
      }
      return { type, label, names, tableEnd, entries: names.map((n, i) => ({ name: n || ('file_' + i + '.bin'), valid: false, getData: () => null })) }
    }
    const entries = []
    for (let i = 0; i < count; i++) {
      const r = kind === 1 ? m._bt3_afs_entry_info(data, bytes.length, i, entry) : m._bt3_pak_entry_info(data, bytes.length, i, entry)
      if (r !== 0) throw new Error(type + ' entry ' + i + ': ' + r)
      const off = m.HEAPU32[entry >>> 2]
      const size = m.HEAPU32[(entry >>> 2) + 1]
      const valid = m.HEAPU8[entry + 8] !== 0
      entries.push({ name: type + '_' + i + '.bin', offset: off, size, valid, getData: () => valid ? bytes.slice(off, off + size) : null })
    }
    return { type, label, entries, tableEnd }
  } finally {
    m._free(name); m._free(entry); m._free(info); m._free(data)
  }
}

function parseGeneric(bytes, label) {
  const entries = Array.from(extract(bytes, { recursive: false }), (item) => ({
    name: item.path || '(senza nome)',
    size: item.size == null ? 0 : Number(item.size),
    valid: item.type === 'FILE',
    kind: item.type,
    getData: () => item.type === 'FILE' ? new Uint8Array(item.data) : null
  }))
  if (!entries.length) throw new Error('Archivio senza voci leggibili.')
  return { type: 'LibArchive (7z/RAR/ISO/altro)', label, entries }
}

async function openBytes(bytes, label) {
  try {
    const parsed = await parseBt3(bytes, label)
    if (parsed && parsed.type !== 'AFL') return parsed
    if (parsed && parsed.type === 'AFL') throw new Error('Apri prima l’AFS relativo e poi carica l’AFL.')
  } catch (error) {
    // Generic container parsing is still attempted if the BT3 WASM module is unavailable.
  }
  return parseGeneric(bytes, label)
}

function render() {
  list.replaceChildren()
  back.disabled = stack.length === 0
  download.disabled = selected < 0 || !current || !current.entries[selected] || !current.entries[selected].valid
  if (analyzeQrsButton) analyzeQrsButton.disabled = selected < 0 || !current || !current.entries[selected] || !current.entries[selected].valid
  if (analyzeTexFileButton) analyzeTexFileButton.disabled = selected < 0 || !current || !current.entries[selected] || !current.entries[selected].valid
  if (!current) {
    title.textContent = 'Nessun archivio aperto'
    meta.textContent = 'Apri un file per visualizzarne le voci.'
    const row = document.createElement('tr')
    row.innerHTML = '<td colspan="4" class="empty">Carica un file.</td>'
    list.append(row)
    return
  }
  title.textContent = current.type + ': ' + current.label
  meta.textContent = current.entries.length.toLocaleString() + ' voci' + (current.tableEnd == null ? '' : ' · fine tabella ' + current.tableEnd)
  for (let i = 0; i < current.entries.length; i++) {
    const item = current.entries[i]
    const row = document.createElement('tr')
    if (i === selected) row.className = 'selected'
    for (const text of [item.name, item.size ? item.size.toLocaleString() + ' B' : '—', item.offset == null ? '—' : String(item.offset), item.valid ? (item.kind || 'OK') : 'Intervallo non valido']) {
      const cell = document.createElement('td')
      cell.textContent = text
      row.append(cell)
    }
    row.addEventListener('click', () => {
      selected = i
      selectedData = null
      try { selectedData = item.getData(); say('Selezionato: ' + item.name) }
      catch (error) { say('Lettura non riuscita: ' + error.message) }
      render()
    })
    row.addEventListener('dblclick', () => openNested(i))
    list.append(row)
  }
  if (!current.entries.length) {
    const row = document.createElement('tr')
    row.innerHTML = '<td colspan="4" class="empty">Nessuna voce.</td>'
    list.append(row)
  }
}

async function openNested(index) {
  const item = current && current.entries[index]
  if (!item || !item.valid) return
  try {
    const bytes = item.getData()
    if (!bytes) return
    const child = await openBytes(bytes, item.name)
    stack.push({ current, selected })
    current = child
    selected = -1
    selectedData = null
    render()
    say('Aperto contenuto annidato: ' + item.name)
  } catch (error) { say('La voce non è un archivio leggibile: ' + error.message) }
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files && fileInput.files[0]
  if (!file) return
  try {
    say('Lettura di ' + file.name + ' (' + file.size.toLocaleString() + ' byte)…')
    current = await openBytes(new Uint8Array(await file.arrayBuffer()), file.name)
    stack = []; selected = -1; selectedData = null
    render()
    say(current.type + ' caricato: ' + current.entries.length + ' voci.')
  } catch (error) {
    current = null; stack = []; selected = -1; selectedData = null
    render()
    say('Apertura non riuscita: ' + error.message)
  }
})

aflInput.addEventListener('change', async () => {
  const file = aflInput.files && aflInput.files[0]
  if (!file || !current || current.type !== 'AFS') { say('Apri prima un AFS e poi carica il relativo AFL.'); return }
  try {
    const afl = await parseBt3(new Uint8Array(await file.arrayBuffer()), file.name)
    if (!afl || afl.type !== 'AFL') throw new Error('Il file non è un AFL valido.')
    current.entries = current.entries.map((entry, i) => Object.assign({}, entry, { name: afl.names[i] || entry.name }))
    render()
    say('Nomi AFL applicati.')
  } catch (error) { say('Caricamento AFL non riuscito: ' + error.message) }
})

back.addEventListener('click', () => {
  const previous = stack.pop()
  if (!previous) return
  current = previous.current; selected = previous.selected; selectedData = null
  render()
  say('Tornato a ' + current.label)
})

download.addEventListener('click', () => {
  const item = current && current.entries[selected]
  if (!item || !item.valid) return
  try {
    const bytes = selectedData || item.getData()
    if (!bytes) throw new Error('Nessun contenuto estraibile.')
    const url = URL.createObjectURL(new Blob([bytes]))
    const a = document.createElement('a')
    a.href = url
    a.download = (item.name.split(/[\\/]/).filter(Boolean).pop() || 'estratto.bin').replace(/[<>:"|?*\x00-\x1f]/g, '_')
    a.click()
    URL.revokeObjectURL(url)
    say('Estrazione avviata: ' + item.name)
  } catch (error) { say('Estrazione non riuscita: ' + error.message) }
})


function cleanDownloadName(name) {
  return String(name || 'estratto.bin').replace(/[\\\\/:*?"<>|\\x00-\\x1f]/g, '_');
}

function selectedEntryBytes() {
  const item = current && current.entries[selected];
  if (!item || !item.valid) throw new Error('Seleziona prima una voce valida.');
  const bytes = selectedData || item.getData();
  if (!bytes) throw new Error('Il contenuto della voce non è disponibile.');
  return new Uint8Array(bytes);
}

function makeSyntheticQrsPak(entryBytes) {
  if (entryBytes.length > 0xFFFFFFFF - 16) throw new Error('Voce troppo grande per il parser QRS.');
  const pak = new Uint8Array(16 + entryBytes.length);
  const view = new DataView(pak.buffer);
  view.setUint32(0, 1, true);
  view.setUint32(4, 16, true);
  view.setUint32(8, 16 + entryBytes.length, true);
  pak.set(entryBytes, 16);
  return pak;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanDownloadName(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function renderQrsCards(infos) {
  qrsResults.replaceChildren();
  qrsResults.hidden = false;
  if (!infos.length) {
    const message = document.createElement('p');
    message.textContent = 'Nessuna texture QRS associata a una palette supportata è stata decodificata.';
    qrsResults.append(message);
    return;
  }
  for (const info of infos) {
    const card = document.createElement('article');
    card.className = 'texture-card';
    const canvas = document.createElement('canvas');
    canvas.width = info.width;
    canvas.height = info.height;
    const context = canvas.getContext('2d');
    const image = context.createImageData(info.width, info.height);
    image.data.set(info.rgba);
    context.putImageData(image, 0, 0);
    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'QRS ' + info.bpp + '-bit · ' + info.width + '×' + info.height;
    const metadata = document.createElement('p');
    metadata.textContent = 'Texture +0x' + info.textureOffset.toString(16).toUpperCase()
      + ' · palette +0x' + info.paletteOffset.toString(16).toUpperCase()
      + ' · ' + info.paletteColors + ' colori · ' + info.paletteStorageMode;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Esporta PNG indicizzato';
    exportButton.addEventListener('click', async () => {
      try {
        const png = await encodeIndexedPNG(info.width, info.height, info.indices, info.palette);
        const base = (current && current.label) || 'qrs';
        downloadBlob(png, base.replace(/\\.[^.]+$/, '') + '_QRS_' + info.textureOffset.toString(16).toUpperCase() + '_indexed.png');
        say('PNG indicizzato esportato: indici originali e palette inclusi.');
      } catch (error) { say('Esportazione PNG non riuscita: ' + error.message); }
    });
    const importButton = document.createElement('button');
    importButton.className = 'secondary';
    importButton.textContent = 'Reimporta PNG (palette fissa)';
    importButton.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.png,image/png';
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
          const png = await decodeIndexedPNG(await file.arrayBuffer(), info.width, info.height);
          await replaceQrsTexture(info, png);
        } catch (error) { say('Reimportazione annullata: ' + error.message); }
      }, { once: true });
      input.click();
    });
    actions.append(exportButton, importButton);
    details.append(title, metadata, actions);
    card.append(canvas, details);
    qrsResults.append(card);
  }
}

async function analyzeSelectedQrs() {
  try {
    const entryBytes = selectedEntryBytes();
    say('Analisi dei record QRS della voce selezionata…');
    const parsed = QRS.decodeAllQrsTexturesPaired(makeSyntheticQrsPak(entryBytes));
    const infos = parsed.decoded.map(d => ({
      index: selected,
      textureOffset: d.recordOffset - 16,
      paletteOffset: d.paletteOffset - 16,
      width: d.width,
      height: d.height,
      baseWidth: d.baseWidth,
      baseHeight: d.baseHeight,
      bpp: d.bpp,
      paletteColors: d.paletteCount,
      paletteStorageMode: d.paletteStorageMode,
      indices: new Uint8Array(d.indices),
      rgba: new Uint8ClampedArray(d.rgba),
      palette: new Uint8Array(d.palette)
    }));
    renderQrsCards(infos);
    const skipped = parsed.skipped.length ? ' · ' + parsed.skipped.length + ' record non decodificabili' : '';
    say('QRS: ' + infos.length + ' texture decodificate' + skipped + '.');
  } catch (error) {
    qrsResults.hidden = false;
    qrsResults.replaceChildren();
    const message = document.createElement('p');
    message.textContent = 'Analisi QRS non riuscita: ' + error.message;
    qrsResults.append(message);
    say('Analisi QRS non riuscita: ' + error.message);
  }
}

function sameBytes(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function buildArchiveWithReplacement(index, replacement) {
  if (!current || (current.type !== 'AFS' && current.type !== 'PAK'))
    throw new Error('La reimportazione richiede un archivio AFS o PAK aperto.');
  if (current.entries.some(entry => !entry.valid))
    throw new Error('L’archivio contiene voci non valide: ricostruzione annullata.');
  const files = current.entries.map((entry, i) => {
    const data = i === index ? replacement : entry.getData();
    if (!data) throw new Error('Una voce dell’archivio non è estraibile.');
    return new Uint8Array(data);
  });
  const count = files.length;
  if (!count) throw new Error('Archivio vuoto.');
  if (current.type === 'AFS') {
    const tableEnd = 8 + count * 8;
    let cursor = Math.ceil(tableEnd / 2048) * 2048;
    const header = new Uint8Array(tableEnd);
    header.set([65, 70, 83, 0]);
    const view = new DataView(header.buffer);
    view.setUint32(4, count, true);
    const records = [];
    for (let i = 0; i < count; i++) {
      cursor = Math.ceil(cursor / 2048) * 2048;
      if (cursor > 0xFFFFFFFF || files[i].length > 0xFFFFFFFF || cursor + files[i].length > 0x100000000)
        throw new Error('Limite offset/dimensione AFS superato.');
      view.setUint32(8 + i * 8, cursor, true);
      view.setUint32(12 + i * 8, files[i].length, true);
      records.push({ offset: cursor, data: files[i] });
      cursor += files[i].length;
    }
    const parts = [header];
    let position = tableEnd;
    for (const record of records) {
      if (record.offset > position) parts.push(new Uint8Array(record.offset - position));
      parts.push(record.data);
      position = record.offset + record.data.length;
    }
    return new Blob(parts, { type: 'application/octet-stream' });
  }
  const tableEnd = 4 + (count + 1) * 4;
  let cursor = Math.ceil(tableEnd / 16) * 16;
  const offsets = new Array(count + 1);
  const records = [];
  for (let i = 0; i < count; i++) {
    cursor = Math.ceil(cursor / 16) * 16;
    if (cursor > 0xFFFFFFFF || files[i].length > 0xFFFFFFFF || cursor + files[i].length > 0x100000000)
      throw new Error('Limite offset/dimensione PAK superato.');
    offsets[i] = cursor;
    records.push({ offset: cursor, data: files[i] });
    cursor += files[i].length;
  }
  offsets[count] = cursor;
  const header = new Uint8Array(tableEnd);
  const view = new DataView(header.buffer);
  view.setUint32(0, count, true);
  for (let i = 0; i <= count; i++) view.setUint32(4 + i * 4, offsets[i], true);
  const parts = [header];
  let position = tableEnd;
  for (const record of records) {
    if (record.offset > position) parts.push(new Uint8Array(record.offset - position));
    parts.push(record.data);
    position = record.offset + record.data.length;
  }
  return new Blob(parts, { type: 'application/octet-stream' });
}

async function replaceQrsTexture(info, png) {
  try {
    if (selected !== info.index || !current) throw new Error('La selezione dell’archivio è cambiata.');
    if (png.paletteCount !== info.paletteColors)
      throw new Error('Il PNG deve contenere esattamente ' + info.paletteColors + ' colori nella palette.');
    if (!sameBytes(png.palette, info.palette))
      throw new Error('Palette diversa dall’originale. Questa modalità preserva la CLUT: modifica soltanto gli indici dei pixel.');
    if (!['AFS', 'PAK'].includes(current.type))
      throw new Error('La ricostruzione è disponibile soltanto per AFS e PAK.');
    const entryBytes = selectedEntryBytes();
    const before = QRS.decodeAllQrsTexturesPaired(makeSyntheticQrsPak(entryBytes));
    const parsedEntry = before.pak.entries[0];
    const target = parsedEntry.records.find(record =>
      !record.isPalette && record.offset - 16 === info.textureOffset);
    if (!target || !target.palette) throw new Error('Record texture o palette non riconosciuti.');
    if (target.palette.offset - 16 !== info.paletteOffset)
      throw new Error('Associazione della palette cambiata rispetto all’esportazione.');
    const encoded = info.bpp === 4
      ? QRS.encodeQrs4Texture(png.indices, png.width, png.height)
      : QRS.encodeQrs8Texture(png.indices, png.width, png.height);
    if (encoded.length !== target.payloadBytes) throw new Error('Dimensione codificata diversa dal payload originale.');
    const replacementEntry = entryBytes.slice();
    replacementEntry.set(encoded, target.payloadOffset - 16);
    const after = QRS.decodeAllQrsTexturesPaired(makeSyntheticQrsPak(replacementEntry));
    const afterTargetRecord = after.pak.entries[0].records.find(record =>
      !record.isPalette && record.offset - 16 === info.textureOffset);
    const afterTarget = afterTargetRecord && after.decoded.find(d => d.recordOffset === afterTargetRecord.offset);
    if (!afterTarget || afterTarget.bpp !== info.bpp || afterTarget.width !== info.width || afterTarget.height !== info.height)
      throw new Error('Verifica round-trip fallita: la texture ricostruita non è decodificabile.');
    if (!sameBytes(afterTarget.indices, png.indices))
      throw new Error('Verifica round-trip fallita: gli indici non coincidono con il PNG.');
    if (!sameBytes(afterTarget.palette, info.palette))
      throw new Error('Verifica round-trip fallita: la palette originale è cambiata.');
    const oldByRelativeOffset = new Map(before.decoded.map(d => [d.recordOffset - 16, d]));
    for (const newTexture of after.decoded) {
      const rel = newTexture.recordOffset - 16;
      if (rel === info.textureOffset) continue;
      const oldTexture = oldByRelativeOffset.get(rel);
      if (!oldTexture || !sameBytes(oldTexture.rgba, newTexture.rgba))
        throw new Error('La sostituzione altererebbe un’altra texture o una palette condivisa.');
    }
    const archiveBlob = buildArchiveWithReplacement(info.index, replacementEntry);
    const rebuilt = await parseBt3(new Uint8Array(await archiveBlob.arrayBuffer()), current.label + '_verifica');
    if (!rebuilt || rebuilt.type !== current.type || !rebuilt.entries[info.index] ||
        !rebuilt.entries[info.index].valid || rebuilt.entries[info.index].size !== replacementEntry.length)
      throw new Error('La verifica finale dell’archivio AFS/PAK non è riuscita.');
    const ext = current.type.toLowerCase();
    const base = String(current.label || 'archivio').replace(/\\.[^.]+$/, '');
    const filename = base + '_texture_sostituita.' + ext;
    downloadBlob(archiveBlob, filename);
    say('Texture sostituita e verificata: ' + info.width + '×' + info.height + ', ' + info.bpp +
      '-bit. Gli indici sono stati ricodificati; la palette originale è rimasta invariata. Archivio: ' + filename);
  } catch (error) {
    say('Reimportazione annullata: ' + error.message);
  }
}

function psmName(psm) {
  return ({ 0: 'PSMCT32', 1: 'PSMCT24', 2: 'PSMCT16', 10: 'PSMCT16S', 19: 'PSMT8', 20: 'PSMT4' })[psm] || ('PSM ' + psm);
}

async function analyzeSelectedTexFile() {
  try {
    const bytes = selectedEntryBytes();
    const m = await getCore();
    const data = m._malloc(bytes.length || 1);
    const info = m._malloc(8);
    const entry = m._malloc(64);
    try {
      m.HEAPU8.set(bytes, data);
      const rc = m._bt3_texfile_validate(data, bytes.length, info);
      if (rc !== 0) throw new Error('TexFile non valido (codice ' + rc + ').');
      const count = m.HEAPU32[info >>> 2];
      const results = [];
      for (let i = 0; i < count; i++) {
        const entryRc = m._bt3_texfile_entry_info(data, bytes.length, i, entry);
        if (entryRc !== 0) throw new Error('Lettura entry ' + i + ' fallita (codice ' + entryRc + ').');
        const base = entry >>> 2;
        const w = m.HEAPU32.slice(base, base + 16);
        results.push({
          index: i, pixOffset: w[0], clutOffset: w[1], pixSize: w[2], clutSize: w[3],
          tbpStep: w[4], cbpStep: w[5], pixBlt: w[6], clutBlt: w[7],
          tbpOffset: w[8], cbpOffset: w[9], width: w[12], height: w[13],
          psm: w[14], flags: w[15]
        });
      }
      texfileResults.replaceChildren();
      texfileResults.hidden = false;
      const summary = document.createElement('p');
      summary.textContent = 'TexFile valido · ' + count + ' entry · tabella a offset byte ' + m.HEAPU32[(info >>> 2) + 1] + '.';
      texfileResults.append(summary);
      for (const item of results) {
        const line = document.createElement('p');
        line.textContent = '#' + item.index + ' · ' + psmName(item.psm) + ' · storage ' +
          item.width + '×' + item.height + ' · pixel ' + item.pixSize + ' B @ ' + item.pixOffset +
          ' · CLUT ' + item.clutSize + ' B @ ' + item.clutOffset +
          ' · TBP/CBP step ' + item.tbpStep + '/' + item.cbpStep +
          ' · flags 0x' + item.flags.toString(16);
        texfileResults.append(line);
      }
      const note = document.createElement('p');
      note.className = 'small-status';
      note.textContent = 'Nota: il decomp descrive questi campi come pacchetti trasferiti alla GS via DMA. Qui vengono letti struttura, PSM, dimensioni e offset; non vengono ancora convertiti in PNG né riscritti come VRAM.';
      texfileResults.append(note);
      say('TexFile analizzato: ' + count + ' entry. Metadati GS letti; contenuto DMA lasciato invariato.');
    } finally {
      m._free(entry); m._free(info); m._free(data);
    }
  } catch (error) {
    texfileResults.hidden = false;
    texfileResults.textContent = 'Analisi TexFile non riuscita: ' + error.message;
    say('Analisi TexFile non riuscita: ' + error.message);
  }
}

async function scanModelVif() {
  if (!modelVifBytes) return;
  const m = await getCore();
  const data = m._malloc(modelVifBytes.length || 1);
  const stats = m._malloc(12);
  try {
    m.HEAPU8.set(modelVifBytes, data);
    const rc = m._bt3_model_vif_scan(data, modelVifBytes.length, stats);
    if (rc !== 0) throw new Error('Stream VIF non valido o senza terminatore (codice ' + rc + ').');
    const count = m.HEAPU32[stats >>> 2];
    const minTbp = m.HEAPU32[(stats >>> 2) + 1];
    const minCbp = m.HEAPU32[(stats >>> 2) + 2];
    modelStatus.textContent = modelVifName + ' · ' + count + ' riferimenti TEX0 · min TBP0 ' + minTbp + ' · min CBP ' + minCbp;
    rebaseModelButton.disabled = false;
  } finally { m._free(stats); m._free(data); }
}

if (analyzeQrsButton) analyzeQrsButton.addEventListener('click', analyzeSelectedQrs);
if (analyzeTexFileButton) analyzeTexFileButton.addEventListener('click', analyzeSelectedTexFile);

if (modelVifInput) modelVifInput.addEventListener('change', async () => {
  const file = modelVifInput.files && modelVifInput.files[0];
  if (!file) return;
  try {
    if (file.size > 64 * 1024 * 1024) throw new Error('Stream VIF troppo grande (limite 64 MiB per questa interfaccia).');
    modelVifBytes = new Uint8Array(await file.arrayBuffer());
    modelVifName = file.name;
    modelStatus.textContent = 'Stream caricato; scansione riferimenti…';
    await scanModelVif();
    say('Stream VIF analizzato.');
  } catch (error) {
    modelVifBytes = null;
    rebaseModelButton.disabled = true;
    modelStatus.textContent = 'Errore VIF: ' + error.message;
    say('Analisi VIF non riuscita: ' + error.message);
  }
});

if (rebaseModelButton) rebaseModelButton.addEventListener('click', async () => {
  if (!modelVifBytes) return;
  try {
    const values = ['model-tbp', 'model-cbp', 'model-tbp2', 'model-cbp2'].map(id => Number(byId(id).value));
    if (values.some(value => !Number.isInteger(value) || value < 0 || value > 0x3FFF))
      throw new Error('I quattro valori GS devono essere interi tra 0 e 16383.');
    const m = await getCore();
    const data = m._malloc(modelVifBytes.length || 1);
    const stats = m._malloc(12);
    try {
      m.HEAPU8.set(modelVifBytes, data);
      const rc = m._bt3_model_vif_rebase(data, modelVifBytes.length,
        values[0], values[1], values[2], values[3], 0xFFFFFFFF, 0xFFFFFFFF, stats);
      if (rc !== 0) throw new Error('Rebase VIF non riuscito (codice ' + rc + ').');
      const output = m.HEAPU8.slice(data, data + modelVifBytes.length);
      const name = modelVifName.replace(/\\.[^.]+$/, '') + '_texture_rebased.vif';
      downloadBlob(new Blob([output], { type: 'application/octet-stream' }), name);
      modelStatus.textContent = 'Rebase completato · ' + m.HEAPU32[stats >>> 2] + ' riferimenti · minima TBP/CBP automatica.';
      say('Stream VIF reindirizzato ed esportato: ' + name);
    } finally { m._free(stats); m._free(data); }
  } catch (error) {
    modelStatus.textContent = 'Rebase non riuscito: ' + error.message;
    say('Rebase VIF non riuscito: ' + error.message);
  }
});

getCore().then(() => {
  coreState.textContent = 'Core WASM: pronto'
  coreState.style.color = '#a7e0be'
}).catch((error) => {
  coreState.textContent = 'Core WASM: non compilato'
  coreState.title = error.message
})


// Optional TurboWarp parent-frame bridge. Only the embedding parent may issue requests.
let bridgeArchive = null;
if (window.parent !== window) {
  window.addEventListener('message', async (event) => {
    if (event.source !== window.parent || !event.data || event.data.type !== 'bt3-request') return;
    const msg = event.data;
    const reply = (payload, transfer = []) => event.source.postMessage({ type: 'bt3-result', id: msg.id, ...payload }, event.origin, transfer);
    try {
      if (msg.action === 'open') {
        if (!(msg.buffer instanceof ArrayBuffer)) throw new Error('File non ricevuto.');
        bridgeArchive = await openBytes(new Uint8Array(msg.buffer), String(msg.name || 'archivio'));
        reply({ message: bridgeArchive.type + ': ' + bridgeArchive.entries.length + ' voci caricate.',
          entries: bridgeArchive.entries.map((e, i) => ({ index: i + 1, name: e.name, size: e.size || 0, valid: !!e.valid, type: e.kind || '' })) });
      } else if (msg.action === 'extract') {
        const index = Number(msg.index);
        const item = bridgeArchive && bridgeArchive.entries[index];
        if (!item || !item.valid) throw new Error('Indice non valido o voce non estraibile.');
        const bytes = item.getData();
        if (!bytes) throw new Error('Contenuto non disponibile.');
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        reply({ name: item.name, buffer }, [buffer]);
      } else {
        throw new Error('Azione non supportata: ' + msg.action);
      }
    } catch (error) { reply({ error: error && error.message ? error.message : String(error) }); }
  });
  window.parent.postMessage({ type: 'bt3-ready' }, '*');
}
