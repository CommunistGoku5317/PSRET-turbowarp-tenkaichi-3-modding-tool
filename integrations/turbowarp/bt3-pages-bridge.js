// TurboWarp <-> GitHub Pages bridge. Load as an unsandboxed TurboWarp extension.
(function (Scratch) {
  'use strict';
  if (!Scratch.extensions.unsandboxed) {
    throw new Error('BT3 Pages Bridge richiede un’estensione non sandboxata.');
  }

  const PAGE_URL = 'https://communistgoku5317.github.io/PSRET-turbowarp-tenkaichi-3-modding-tool/';
  let frame, input, ready = false, pending = new Map(), sequence = 0;
  let lastEntries = '[]', lastStatus = 'Non connesso';
  const waiters = new Map();

  function connect() {
    if (frame) return;
    frame = document.createElement('iframe');
    frame.src = PAGE_URL + '?turbowarpBridge=1';
    frame.title = 'BT3 Modder engine';
    Object.assign(frame.style, { position: 'fixed', width: '1px', height: '1px', left: '-10px', bottom: '0', opacity: '0', pointerEvents: 'none' });
    document.body.appendChild(frame);
    input = document.createElement('input');
    input.type = 'file';
    input.accept = '.7z,.rar,.iso,.afs,.pak,.bin,.img';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      lastStatus = 'Invio ' + file.name + ' al motore…';
      try {
        const buffer = await file.arrayBuffer();
        const result = await request('open', { name: file.name, buffer }, [buffer]);
        lastStatus = result.message || 'Archivio aperto';
        lastEntries = JSON.stringify(result.entries || []);
      } catch (e) { lastStatus = 'Errore: ' + e.message; lastEntries = '[]'; }
    });
    window.addEventListener('message', (event) => {
      if (event.source !== frame.contentWindow || event.origin !== new URL(PAGE_URL).origin) return;
      const m = event.data || {};
      if (m.type === 'bt3-ready') { ready = true; lastStatus = 'Motore Pages collegato'; return; }
      if (m.type !== 'bt3-result' || !pending.has(m.id)) return;
      const p = pending.get(m.id); pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error)); else p.resolve(m);
    });
  }

  function request(action, payload = {}, transfer = []) {
    connect();
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      const send = () => frame.contentWindow.postMessage({ type: 'bt3-request', id, action, ...payload }, new URL(PAGE_URL).origin, transfer);
      if (ready) send();
      else {
        const started = Date.now();
        const poll = () => {
          if (ready) send();
          else if (Date.now() - started > 15000) { pending.delete(id); reject(new Error('Motore Pages non raggiungibile.')); }
          else setTimeout(poll, 100);
        };
        poll();
      }
    });
  }

  class BT3PagesBridge {
    getInfo() {
      return {
        id: 'bt3pagesbridge',
        name: 'BT3 Modder Pages',
        color1: '#315b85',
        color2: '#24466b',
        color3: '#183653',
        blocks: [
          { opcode: 'connect', blockType: Scratch.BlockType.COMMAND, text: 'connetti al motore BT3 Pages' },
          { opcode: 'choose', blockType: Scratch.BlockType.COMMAND, text: 'apri archivio con BT3 Modder' },
          { opcode: 'status', blockType: Scratch.BlockType.REPORTER, text: 'stato BT3 Pages' },
          { opcode: 'entries', blockType: Scratch.BlockType.REPORTER, text: 'voci archivio (JSON)' },
          { opcode: 'extract', blockType: Scratch.BlockType.COMMAND, text: 'estrai voce numero [INDEX]', arguments: { INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } }
        ]
      };
    }
    connect() { connect(); lastStatus = 'Connessione al motore Pages…'; }
    choose() { connect(); input.click(); }
    status() { return lastStatus; }
    entries() { return lastEntries; }
    async extract(args) {
      try {
        const result = await request('extract', { index: Math.max(0, Math.floor(Number(args.INDEX) || 1) - 1) });
        const blob = new Blob([result.buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = result.name || 'bt3-extracted.bin'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        lastStatus = 'Estrazione avviata: ' + (result.name || 'file');
      } catch (e) { lastStatus = 'Errore estrazione: ' + e.message; }
    }
  }
  Scratch.extensions.register(new BT3PagesBridge());
})(Scratch);
