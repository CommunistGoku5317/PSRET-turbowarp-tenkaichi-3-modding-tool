import { extract } from 'archive-wasm'

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

let corePromise
let current = null
let stack = []
let selected = -1
let selectedData = null

function say(message) { status.textContent = message }

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

getCore().then(() => {
  coreState.textContent = 'Core WASM: pronto'
  coreState.style.color = '#a7e0be'
}).catch((error) => {
  coreState.textContent = 'Core WASM: non compilato'
  coreState.title = error.message
})
