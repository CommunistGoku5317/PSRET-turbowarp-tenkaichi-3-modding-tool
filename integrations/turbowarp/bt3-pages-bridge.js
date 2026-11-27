// TurboWarp unsandboxed overlay: shows BT3 Modder directly over the Stage.
(function (Scratch) {
  'use strict';

  const PAGE_URL = 'https://communistgoku5317.github.io/PSRET-turbowarp-tenkaichi-3-modding-tool/';
  const PAGE_ORIGIN = new URL(PAGE_URL).origin;
  let overlay = null;
  let frame = null;
  let stageCanvas = null;
  let resizeObserver = null;
  let visible = false;
  let statusText = 'BT3 Modder nascosto';

  function findStageCanvas() {
    const vmCanvas = Scratch.vm && Scratch.vm.renderer && Scratch.vm.renderer.canvas;
    if (vmCanvas) return vmCanvas;
    return document.querySelector('.stage canvas') || document.querySelector('canvas');
  }

  function positionOverlay() {
    if (!overlay || !stageCanvas) return;
    const rect = stageCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      overlay.style.display = 'none';
      return;
    }
    overlay.style.display = 'block';
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }

  function onMessage(event) {
    if (!frame || event.source !== frame.contentWindow || event.origin !== PAGE_ORIGIN) return;
    const message = event.data || {};
    if (message.type === 'bt3-close') {
      hideModder();
    } else if (message.type === 'bt3-status') {
      statusText = String(message.message || 'BT3 Modder pronto');
    }
  }

  function showModder() {
    if (overlay) {
      visible = true;
      overlay.style.display = 'block';
      positionOverlay();
      statusText = 'BT3 Modder visibile nello Stage';
      return;
    }

    stageCanvas = findStageCanvas();
    if (!stageCanvas) {
      statusText = 'Errore: Stage non trovato. Avvia il progetto e riprova.';
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'bt3-modder-stage-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '1px',
      height: '1px',
      zIndex: '2147483000',
      overflow: 'hidden',
      background: '#101820',
      border: '1px solid #4a8cc4',
      borderRadius: '3px',
      boxSizing: 'border-box',
      pointerEvents: 'auto'
    });

    frame = document.createElement('iframe');
    frame.src = PAGE_URL + '?turbowarpStage=1';
    frame.title = 'BT3 Modder nello Stage';
    frame.setAttribute('allow', 'clipboard-read; clipboard-write');
    Object.assign(frame.style, {
      display: 'block',
      width: '100%',
      height: '100%',
      border: '0',
      background: '#101820'
    });

    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    window.addEventListener('resize', positionOverlay);
    window.addEventListener('scroll', positionOverlay, true);
    window.addEventListener('message', onMessage);
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(positionOverlay);
      resizeObserver.observe(stageCanvas);
    }
    if (frame.contentWindow) {
      visible = true;
      statusText = 'Caricamento BT3 Modder nello Stage…';
    }
    frame.addEventListener('load', () => {
      visible = true;
      statusText = 'BT3 Modder pronto nello Stage';
      positionOverlay();
    });
    positionOverlay();
  }

  function hideModder() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    window.removeEventListener('resize', positionOverlay);
    window.removeEventListener('scroll', positionOverlay, true);
    window.removeEventListener('message', onMessage);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    frame = null;
    stageCanvas = null;
    visible = false;
    statusText = 'BT3 Modder nascosto';
  }

  class BT3StageModder {
    getInfo() {
      return {
        id: 'bt3stagemodder',
        name: 'BT3 Modder Stage',
        color1: '#315b85',
        color2: '#24466b',
        color3: '#183653',
        blocks: [
          { opcode: 'show', blockType: Scratch.BlockType.COMMAND, text: 'mostra BT3 Modder nello Stage' },
          { opcode: 'hide', blockType: Scratch.BlockType.COMMAND, text: 'nascondi BT3 Modder' },
          { opcode: 'visible', blockType: Scratch.BlockType.BOOLEAN, text: 'BT3 Modder visibile?' },
          { opcode: 'status', blockType: Scratch.BlockType.REPORTER, text: 'stato BT3 Modder' }
        ]
      };
    }
    show() { showModder(); }
    hide() { hideModder(); }
    visible() { return visible; }
    status() { return statusText; }
  }

  Scratch.extensions.register(new BT3StageModder());
})(Scratch);
