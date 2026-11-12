// BT3 Web Modder — TurboWarp, modalità Unsandboxed
/*
 * NOTA STORICA — commento interno, non mostrato nell'interfaccia.
 * BT3 Web Modder nasce dall'evoluzione del prototipo chiamato PSRET AFS/PAK.
 * Da quel progetto conserva il nucleo di esplorazione degli archivi AFS/PAK,
 * l'analisi delle texture QRS e gli strumenti di esportazione/sostituzione PNG.
 * Il decoder è stato poi aggiornato con le correzioni di GS page-stride.
 * Il vecchio nome è mantenuto qui soltanto per documentare la provenienza;
 * nome, identificativo e testi visibili dell'estensione sono ora BT3 Web Modder.
 */

(function (Scratch) {
  'use strict';
  if (!Scratch.extensions.unsandboxed) throw new Error('BT3 Web Modder richiede Unsandboxed.');
  const ALIGN = 2048;
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

  // Decoder QRS ricostruito dal loader originale; nessuna dipendenza esterna.
/*
 * KkTeamQrsExplorer v1.1 - decoder QRS PAK 4/8-bit con palette, swizzle e multi-pass.
 * Ricostruzione statica diretta dal PE32 originale.
 *
 * Modulo di riferimento statico. I helper e gli indici sono trascritti
 * dalle routine x86; il wrapper completo dei loader resta separato.
 * Coordinate e dimensioni devono essere non negative; il loader standard
 * chiama queste routine con coordinate locali non negative.
 */
(function (root) {
  'use strict';
  const T4119A0 = Object.freeze([
    0,1,4,5,16,17,20,21,2,3,6,7,18,19,22,23,
    8,9,12,13,24,25,28,29,10,11,14,15,26,27,30,31,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1
  ]);
  // 0x4117A0 is 128 DWORD long: the second 64 entries are indexed by
  // ((y mod 16)/4 & 1) << 6. The previous 64-entry extraction was incomplete.
  const T4117A0 = Object.freeze([
    0,1,4,5,8,9,12,13,0,1,4,5,8,9,12,13,
    2,3,6,7,10,11,14,15,2,3,6,7,10,11,14,15,
    8,9,12,13,0,1,4,5,8,9,12,13,0,1,4,5,
    10,11,14,15,2,3,6,7,10,11,14,15,2,3,6,7,
    8,9,12,13,0,1,4,5,8,9,12,13,0,1,4,5,
    10,11,14,15,2,3,6,7,10,11,14,15,2,3,6,7,
    0,1,4,5,8,9,12,13,0,1,4,5,8,9,12,13,
    2,3,6,7,10,11,14,15,2,3,6,7,10,11,14,15
  ]);
  const T4116A0 = Object.freeze([
    0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,
    0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,
    1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3,
    1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3
  ]);

  function int(v, name) {
    v = Number(v);
    if (!Number.isSafeInteger(v) || v < 0) throw new RangeError(name + ' deve essere un intero >= 0.');
    return v;
  }

  // Replica dell'indirizzo [0x433040 + computed*4 + T4116A0[index]].
  function scratchByteOffset8(x, y, rowStride, base64) {
    x = int(x, 'x'); y = int(y, 'y');
    rowStride = int(rowStride, 'rowStride'); base64 = int(base64 || 0, 'base64');

    const x128 = x & 127;
    const y64 = y & 63;
    const y16 = y & 15;
    const q = y16 >>> 2;
    const tableAIndex = (x128 >>> 4) + ((y64 >>> 4) * 8);
    const tableBIndex = ((q & 1) << 6) + (x128 & 15) + ((y & 3) << 4);
    const tableCIndex = (x128 & 15) + ((y & 3) << 4);

    const wordIndex = (
      (((x >>> 7) + ((y >>> 6) * rowStride)) << 11) +
      (T4119A0[tableAIndex] << 6) +
      T4117A0[tableBIndex] +
      (q << 4) +
      (base64 << 6)
    );
    return (wordIndex << 2) + T4116A0[tableCIndex];
  }

  // Parametri equivalenti agli argomenti della routine x86:
  // base64, rowStride2, xStart, yStart, width, height, data.
  // rowStride2 viene diviso per 2 dal binario.
  function scatter8(data, options) {
    const o = options || {};
    const xStart = int(o.xStart || 0, 'xStart');
    const yStart = int(o.yStart || 0, 'yStart');
    const width = int(o.width, 'width');
    const height = int(o.height, 'height');
    const base64 = int(o.base64 || 0, 'base64');
    const rowStride2 = int(o.rowStride2 == null ? Math.max(2, Math.ceil(width / 64) * 2) : o.rowStride2, 'rowStride2');
    if ((rowStride2 & 1) !== 0) throw new RangeError('rowStride2 deve essere pari.');
    if (!data || data.length < width * height) throw new RangeError('Buffer sorgente troppo corto.');
    const rowStride = rowStride2 >>> 1;
    let max = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = scratchByteOffset8(xStart + x, yStart + y, rowStride, base64);
      if (p > max) max = p;
    }
    const scratch = new Uint8Array(max + 1);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      scratch[scratchByteOffset8(xStart + x, yStart + y, rowStride, base64)] = data[y * width + x];
    }
    return scratch;
  }

  function gather8(scratch, options) {
    const o = options || {};
    const xStart = int(o.xStart || 0, 'xStart');
    const yStart = int(o.yStart || 0, 'yStart');
    const width = int(o.width, 'width');
    const height = int(o.height, 'height');
    const base64 = int(o.base64 || 0, 'base64');
    const rowStride2 = int(o.rowStride2 == null ? Math.max(2, Math.ceil(width / 64) * 2) : o.rowStride2, 'rowStride2');
    if ((rowStride2 & 1) !== 0) throw new RangeError('rowStride2 deve essere pari.');
    const rowStride = rowStride2 >>> 1;
    const out = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = scratchByteOffset8(xStart + x, yStart + y, rowStride, base64);
      if (p >= scratch.length) throw new RangeError('Scratch buffer troppo corto per il percorso inverso.');
      out[y * width + x] = scratch[p];
    }
    return out;
  }

  const T411020 = Object.freeze([
    0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,
    4,4,4,4,4,4,4,4,6,6,6,6,6,6,6,6,
    0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,
    4,4,4,4,4,4,4,4,6,6,6,6,6,6,6,6,
    1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3,
    5,5,5,5,5,5,5,5,7,7,7,7,7,7,7,7,
    1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3,
    5,5,5,5,5,5,5,5,7,7,7,7,7,7,7,7
  ]);
  const T411620 = Object.freeze([
    0,2,8,10,1,3,9,11,4,6,12,14,5,7,13,15,
    16,18,24,26,17,19,25,27,20,22,28,30,21,23,29,31
  ]);
  const T411220 = Object.freeze([
    0,1,4,5,8,9,12,13,0,1,4,5,8,9,12,13,
    0,1,4,5,8,9,12,13,0,1,4,5,8,9,12,13,
    2,3,6,7,10,11,14,15,2,3,6,7,10,11,14,15,
    2,3,6,7,10,11,14,15,2,3,6,7,10,11,14,15,
    8,9,12,13,0,1,4,5,8,9,12,13,0,1,4,5,
    8,9,12,13,0,1,4,5,8,9,12,13,0,1,4,5,
    10,11,14,15,2,3,6,7,10,11,14,15,2,3,6,7,
    10,11,14,15,2,3,6,7,10,11,14,15,2,3,6,7,
    8,9,12,13,0,1,4,5,8,9,12,13,0,1,4,5,
    8,9,12,13,0,1,4,5,8,9,12,13,0,1,4,5,
    10,11,14,15,2,3,6,7,10,11,14,15,2,3,6,7,
    10,11,14,15,2,3,6,7,10,11,14,15,2,3,6,7,
    0,1,4,5,8,9,12,13,0,1,4,5,8,9,12,13,
    0,1,4,5,8,9,12,13,0,1,4,5,8,9,12,13,
    2,3,6,7,10,11,14,15,2,3,6,7,10,11,14,15,
    2,3,6,7,10,11,14,15,2,3,6,7,10,11,14,15
  ]);

  function scratchNibbleAddress4(x, y, rowStride, base64) {
    x = int(x, 'x'); y = int(y, 'y');
    rowStride = int(rowStride, 'rowStride'); base64 = int(base64 || 0, 'base64');
    const x128 = x & 127;
    const y128 = y & 127;
    const q = (y128 & 15) >>> 2;
    const y4 = y & 3;
    const table0Index = (x128 & 31) + (y4 << 5);
    const table1Index = (x128 >>> 5) + ((y128 >>> 4) << 2);
    const table2Index = (x128 & 31) + (y4 << 5) + ((q & 1) << 7);
    const selector = T411020[table0Index];
    const wordIndex = (
      (((x >>> 7) + ((y >>> 7) * rowStride)) << 11) +
      (T411620[table1Index] << 6) +
      T411220[table2Index] +
      (q << 4) +
      (base64 << 6)
    );
    return { byteOffset: (wordIndex << 2) + (selector >>> 1), highNibble: (selector & 1) !== 0 };
  }

  function scatter4(sourceBytes, options) {
    const o = options || {};
    const xStart = int(o.xStart || 0, 'xStart');
    const yStart = int(o.yStart || 0, 'yStart');
    const width = int(o.width, 'width');
    const height = int(o.height, 'height');
    const base64 = int(o.base64 || 0, 'base64');
    const rowStride2 = int(o.rowStride2 == null ? Math.max(2, Math.ceil(width / 128) * 2) : o.rowStride2, 'rowStride2');
    if (rowStride2 & 1) throw new RangeError('rowStride2 deve essere pari.');
    const count = width * height;
    if (!Number.isSafeInteger(count)) throw new RangeError('Dimensioni 4-bit troppo grandi.');
    const requiredSourceBytes = Math.ceil(count / 2);
    if (!sourceBytes || sourceBytes.length < requiredSourceBytes)
      throw new RangeError('Buffer 4-bit Explorer troppo corto: servono ceil(width*height/2) byte packed.');
    const rowStride = rowStride2 >>> 1;
    let max = -1;
    for (let i = 0; i < count; i++) {
      const x = xStart + (i % width), y = yStart + Math.floor(i / width);
      const a = scratchNibbleAddress4(x, y, rowStride, base64);
      if (a.byteOffset > max) max = a.byteOffset;
    }
    const scratch = new Uint8Array(max + 1);
    for (let i = 0; i < count; i++) {
      const x = xStart + (i % width), y = yStart + Math.floor(i / width);
      const a = scratchNibbleAddress4(x, y, rowStride, base64);
      // 0x405B20: legge lo stesso byte sorgente per due pixel consecutivi.
      // Il primo pixel usa il nibble basso, il secondo quello alto; il
      // contatore di parita' si azzera a ogni chiamata helper, non a ogni riga.
      const sourceByte = sourceBytes[i >>> 1];
      const nibble = (i & 1) ? (sourceByte >>> 4) : (sourceByte & 15);
      const old = scratch[a.byteOffset];
      scratch[a.byteOffset] = a.highNibble ? ((old & 15) | (nibble << 4)) : ((old & 240) | nibble);
    }
    return scratch;
  }

  function unpackPaletteIndices4(packed) {
    if (!packed || typeof packed.length !== 'number') throw new TypeError('Buffer 4-bit packed non valido.');
    const out = new Uint8Array(packed.length * 2);
    for (let i = 0; i < packed.length; i++) {
      const b = Number(packed[i]) & 255;
      out[i * 2] = b & 15;
      out[i * 2 + 1] = b >>> 4;
    }
    return out;
  }

  function gather4(scratch, options) {
    const o = options || {};
    const xStart = int(o.xStart || 0, 'xStart');
    const yStart = int(o.yStart || 0, 'yStart');
    const width = int(o.width, 'width');
    const height = int(o.height, 'height');
    const base64 = int(o.base64 || 0, 'base64');
    const rowStride2 = int(o.rowStride2 == null ? Math.max(2, Math.ceil(width / 128) * 2) : o.rowStride2, 'rowStride2');
    if (rowStride2 & 1) throw new RangeError('rowStride2 deve essere pari.');
    const rowStride = rowStride2 >>> 1;
    const count = width * height;
    // Il percorso inverso restituisce un byte per pixel, alternando la
    // posizione del nibble nello scratch; non ricompone uno stream packed.
    const out = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const x = xStart + (i % width), y = yStart + Math.floor(i / width);
      const a = scratchNibbleAddress4(x, y, rowStride, base64);
      if (a.byteOffset >= scratch.length) throw new RangeError('Scratch 4-bit troppo corto.');
      const b = scratch[a.byteOffset];
      const n = a.highNibble ? (b >>> 4) : (b & 15);
      out[i] = (i & 1) ? (n << 4) : n;
    }
    return out;
  }

  const T412120 = Object.freeze([
    0,1,4,5,16,17,20,21,2,3,6,7,18,19,22,23,
    8,9,12,13,24,25,28,29,10,11,14,15,26,27,30,31
  ]);
  const T4120E0 = Object.freeze([
    0,1,4,5,8,9,12,13,2,3,6,7,10,11,14,15
  ]);

  function scratchDwordIndex404780(x, y, rowStride, base64) {
    x = int(x, 'x'); y = int(y, 'y');
    rowStride = int(rowStride, 'rowStride'); base64 = int(base64 || 0, 'base64');
    const x64 = x & 63;
    const y32 = y & 31;
    const y8 = y & 7;
    const tableAIndex = (x64 >>> 3) + (y32 & 24);
    const tableBIndex = (x64 & 7) + ((y8 & 1) << 3);
    return (((((x >>> 6) + ((y >>> 5) * rowStride)) << 11) +
      (T412120[tableAIndex] << 6) + T4120E0[tableBIndex] +
      ((y8 >>> 1) << 4) + (base64 << 6)));
  }

  // Trascrizione del passaggio 0x404780: legge DWORD dal buffer 0x433040
  // e li scrive in ordine lineare nel buffer destinazione.
  function bytesToDwordsLE(bytes) {
    if (!bytes || typeof bytes.length !== 'number') throw new TypeError('Buffer byte non valido.');
    const count = Math.floor(bytes.length / 4);
    const out = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
      const p = i * 4;
      out[i] = (bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24)) >>> 0;
    }
    return out;
  }

  function finalStage404780(scratchDwords, options) {
    const o = options || {};
    const xStart = int(o.xStart || 0, 'xStart');
    const yStart = int(o.yStart || 0, 'yStart');
    const width = int(o.width, 'width');
    const height = int(o.height, 'height');
    const rowStride = int(o.rowStride || 0, 'rowStride');
    const base64 = int(o.base64 || 0, 'base64');
    const out = new Uint32Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = scratchDwordIndex404780(xStart + x, yStart + y, rowStride, base64);
      if (p >= scratchDwords.length) throw new RangeError('Scratch DWORD troppo corto per 0x404780.');
      out[y * width + x] = scratchDwords[p];
    }
    return out;
  }

  // Ricostruzione del ramo 4-bit di 0x4062C0 per altezza <= 0x80.
  // Contratto: width=arg3 del loader, height=arg4; sourceBytes e' lo
  // stream packed a 4 bit. 0x405B20 consuma un byte ogni due pixel.
  // La provenienza/struttura completa del file QRS resta da verificare.
  function decode4SinglePassExplorer(sourceBytes, width, height) {
    width = int(width, 'width'); height = int(height, 'height');
    if (height > 128) throw new RangeError('Il ramo single-pass vale solo per height <= 128.');
    if (width === 0 || height === 0) throw new RangeError('Dimensioni texture non valide.');
    if (!sourceBytes || sourceBytes.length < Math.ceil(width * height / 2))
      throw new RangeError('Il ramo 0x405B20 richiede ceil(width*height/2) byte packed.');

    // 0x406410: 0x405B20(0,0,0,0,width,height,src)
    const scratchBytes = scatter4(sourceBytes, {
      base64: 0, rowStride2: Math.max(2, Math.ceil(width / 128) * 2), xStart: 0, yStart: 0,
      width, height
    });

    // 0x406444..0x40646A: final mapper width=ceil(width/2),
    // height=ceil(height/4), rowStride=0, base64=0.
    const outWidth = (width + 1) >>> 1;
    const outHeight = (height + 3) >>> 2;
    let maxDword = -1;
    for (let y = 0; y < outHeight; y++) for (let x = 0; x < outWidth; x++) {
      const idx = scratchDwordIndex404780(x, y, Math.max(1, Math.ceil(outWidth / 64)), 0);
      if (idx > maxDword) maxDword = idx;
    }
    const requiredBytes = (maxDword + 1) * 4;
    const completeScratch = new Uint8Array(Math.max(requiredBytes, scratchBytes.length));
    completeScratch.set(scratchBytes);
    const scratchDwords = bytesToDwordsLE(completeScratch);
    const outputDwords = finalStage404780(scratchDwords, {
      xStart: 0, yStart: 0, width: outWidth, height: outHeight,
      rowStride: Math.max(1, Math.ceil(outWidth / 64)), base64: 0
    });
    return Object.freeze({
      mode: 'explorer-4bit-single-pass-reference',
      sourceWidth: width, sourceHeight: height,
      outputWidth: outWidth, outputHeight: outHeight,
      scratchBytes: completeScratch,
      scratchDwords,
      outputDwords
    });
  }


  // Piano delle chiamate 0x4062C0 per i rami multi-pass. Riproduce gli
  // argomenti osservati nel disassemblato, ma non presume ancora che il
  // puntatore destinazione sia un array Uint32 lineare: l'offset x86 viene
  // conservato in byte esattamente come calcolato dal binario.
  function plan4MultiPassExplorer(width, height) {
    width = int(width, 'width'); height = int(height, 'height');
    if (!width || !height) throw new RangeError('Dimensioni texture non valide.');
    if (height > 512) {
      if ((width & 1) !== 0) return Object.freeze({ supported: false, reason: 'Il mapper 4-bit richiede larghezza pari.', passes: [] });
      if (width > 128 && (height % 128) !== 0) return Object.freeze({ supported: false, reason: 'Per larghezze oltre 128 pixel, il tiling esteso richiede blocchi verticali completi da 128 righe.', passes: [] });
      if (width <= 128 && (height % 32) !== 0) return Object.freeze({ supported: false, reason: 'Il tiling esteso richiede un’altezza multipla di 32 righe.', passes: [] });
      const passes = [];
      let rowStart = 0;
      while (rowStart < height) {
        const remaining = height - rowStart;
        const candidates = (width > 128 ? [128] : [128, 96, 64, 32]).filter(h => h <= remaining);
        const blockHeight = candidates[0];
        if (!blockHeight) return Object.freeze({ supported: false, reason: 'Fascia finale non coperta dal tiling QRS.', passes: [] });
        passes.push(Object.freeze({
          index: passes.length,
          sourceByteOffset: rowStart * width / 2,
          sourceBytes: width * blockHeight / 2,
          destinationPixelOffset: rowStart * width,
          helperWidth: width,
          helperHeight: blockHeight
        }));
        rowStart += blockHeight;
      }
      return Object.freeze({
        supported: true,
        mode: '0.1-extended-4bit-vertical-tiles',
        sourceWidth: width, sourceHeight: height,
        passCount: passes.length,
        passCountIsExtension: true,
        passes: Object.freeze(passes),
        note: 'Estensione a tile verticali; il loader nativo 0x4062C0 si ferma a 512 righe.'
      });
    }
    if (height <= 128) throw new RangeError('Per height <= 128 usare decode4SinglePassExplorer.');

    const twoPass = height <= 256;
    const alignment = twoPass ? 8 : 16;
    if ((width & 1) !== 0) return Object.freeze({
      supported: false,
      reason: 'Il mapper 4-bit del loader QRS richiede width pari.',
      passes: []
    });
    if ((height % alignment) !== 0) return Object.freeze({
      supported: false,
      reason: `Il ramo ${twoPass ? 'two-pass' : 'four-pass'} usa H>>${twoPass ? 3 : 4}; height deve essere multiplo di ${alignment} per non perdere righe.`,
      passes: []
    });
    const passDivisor = twoPass ? 2 : 4;
    const chunkDivisor = twoPass ? 4 : 8;
    const mapperDivisor = twoPass ? 8 : 16;
    const helperHeight = Math.floor(height / passDivisor);
    const mapperWidth = Math.ceil(width / 2);
    const mapperHeight = Math.floor(height / mapperDivisor);
    const pixelCount = width * height;
    if (!Number.isSafeInteger(pixelCount)) throw new RangeError('Dimensioni 4-bit troppo grandi.');
    // 0x40638F..0x4063C7 and 0x4064F9..0x406546:
    // the pointer step is ceil(width*height/4) or ceil(width*height/8),
    // not the number of packed bytes consumed by one helper call.
    const chunkOffset = Math.ceil(pixelCount / chunkDivisor);
    const passCount = twoPass ? 2 : 4;
    const helperInputBytes = Math.ceil((width * helperHeight) / 2);
    const passes = [];
    for (let i = 0; i < passCount; i++) {
      const offset = i * chunkOffset;
      const nextOffset = (i + 1) * chunkOffset;
      passes.push(Object.freeze({
        index: i,
        helper405B20: Object.freeze({
          base64: 0, rowStride2: Math.max(2, Math.ceil(width / 128) * 2), xStart: 0, yStart: 0,
          width, height: helperHeight,
          sourceByteOffset: offset,
          requiredPackedSourceBytes: helperInputBytes,
          nextPassSourceByteOffset: i + 1 < passCount ? nextOffset : null,
          sourceBytesUntilNextPass: i + 1 < passCount ? chunkOffset : null,
          overlapWithNextPass: i + 1 < passCount ? Math.max(0, offset + helperInputBytes - nextOffset) : 0,
          gapBeforeNextPass: i + 1 < passCount ? Math.max(0, nextOffset - (offset + helperInputBytes)) : 0
        }),
        mapper404780: Object.freeze({
          base64: 0, rowStride: Math.max(1, Math.ceil(mapperWidth / 64)), xStart: 0, yStart: 0,
          width: mapperWidth, height: mapperHeight,
          destinationByteOffset: offset,
          logicalDwordCount: mapperWidth * mapperHeight
        })
      }));
    }
    return Object.freeze({
      supported: true,
      mode: twoPass ? 'explorer-4bit-two-pass-call-plan' : 'explorer-4bit-four-pass-call-plan',
      sourceWidth: width, sourceHeight: height, pixelCount,
      passCount, helperHeight, helperInputBytes, mapperWidth, mapperHeight,
      chunkByteOffset: chunkOffset,
      chunkOffsetFormula: `ceil(width*height/${chunkDivisor})`,
      helperInputFormula: 'ceil(width*floor(height/passDivisor)/2)',
      helperAndChunkOffsetsAreNotAssumedEqual: true,
      destinationOffsetUnit: 'byte (il binario aggiunge l’offset direttamente al puntatore destinazione)',
      assembly: Object.freeze({
        twoPass: '0x406300-0x40646A',
        fourPass: '0x406470-0x406653',
        sourceAndDestinationStep: twoPass ? 'ceil(width*height/4)' : 'ceil(width*height/8)'
      }),
      passes: Object.freeze(passes)
    });
  }

  // Preprocessing osservato nel loader Qt: pixelIndex() produce indici
  // palette; il ramo 4-bit li ricompatta due per byte (pixel pari nel nibble
  // basso, pixel dispari nel nibble alto). Il ramo 8-bit conserva un byte
  // per indice. Questi helper modellano solo questa trasformazione.
  function packPaletteIndices4(indices) {
    if (!indices || typeof indices.length !== 'number') throw new TypeError('Indici palette non validi.');
    const count = int(indices.length, 'numero indici');
    const out = new Uint8Array(Math.ceil(count / 2));
    for (let i = 0; i < count; i++) {
      const value = int(Number(indices[i]), 'indice palette');
      if (value > 15) throw new RangeError('Indice palette 4-bit fuori intervallo 0..15.');
      if ((i & 1) === 0) out[i >>> 1] = value;
      else out[i >>> 1] |= value << 4;
    }
    return out;
  }

  function copyPaletteIndices8(indices) {
    if (!indices || typeof indices.length !== 'number') throw new TypeError('Indici palette non validi.');
    const out = new Uint8Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
      const value = int(Number(indices[i]), 'indice palette');
      if (value > 255) throw new RangeError('Indice palette 8-bit fuori intervallo 0..255.');
      out[i] = value;
    }
    return out;
  }



  // Hint QImage::fromData confermati direttamente dai puntatori .rdata
  // usati nel percorso 0x4077F0. Non sono estensioni file: sono format hints.
  const QRS_IMAGE_HINTS = Object.freeze({
    fourBitCustom: '4bitTm2',       // VA 0x4130BB, file offset 0x116BB
    png: 'png',                     // VA 0x4130C3, file offset 0x116C3
    indexed8: 'Format_Indexed8',    // VA 0x4130C7, file offset 0x116C7
    eightBitCustom: '8bitTxs'       // VA 0x4130D7, file offset 0x116D7
  });

  // Traccia le chiamate fromData osservate. Il risultato descrive i punti
  // decisionali, senza simulare QImage né inventare il risultato dei probe.
  function planQrsImageProbe(bpp) {
    bpp = int(bpp, 'bpp');
    if (bpp !== 4 && bpp !== 8) throw new RangeError('bpp deve essere 4 oppure 8.');
    const steps = [
      Object.freeze({ address: '0x40782F', api: 'QImage::fromData', hint: QRS_IMAGE_HINTS.fourBitCustom,
        nextIfNonNull: '0x407844', nextIfNull: bpp === 4 ? '0x407FC0' : '0x407844' })
    ];
    if (bpp === 8) {
      steps.push(Object.freeze({ address: '0x40786B', api: 'QImage::fromData', hint: QRS_IMAGE_HINTS.png,
        nextIfNonNull: '0x407AB5', nextIfNull: 'fallback-path' }));
    } else {
      steps.push(Object.freeze({ address: '0x40786B', api: 'QImage::fromData', hint: QRS_IMAGE_HINTS.png,
        condition: 'raggiunto se il primo probe 4bitTm2 restituisce un oggetto non nullo',
        nextIfNonNull: '0x407AB5', nextIfNull: 'fallback-path' }));
    }
    steps.push(Object.freeze({ address: '0x407AC7', api: 'QImage::fromData', hint: QRS_IMAGE_HINTS.eightBitCustom,
      condition: 'ramo secondario raggiunto dal flusso di fallback; condizione completa ancora da chiudere' }));
    return Object.freeze({ bpp, steps: Object.freeze(steps), indexed8FormatName: QRS_IMAGE_HINTS.indexed8,
      note: 'Piano statico dei riferimenti; non equivale a eseguire i decoder Qt.' });
  }



  // Mappa statica del fallback 4-bit raggiunto quando QImage::fromData
  // con hint "4bitTm2" restituisce null (salto 0x40783E -> 0x407FC0).
  // Le dimensioni e le chiamate sono osservate nel PE; non simula Qt.
  function plan4BitFallback(width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    const pixels = width * height;
    if (!Number.isSafeInteger(pixels)) throw new RangeError('Dimensioni troppo grandi.');
    const halfRounded = Math.ceil(pixels / 2);
    return Object.freeze({
      entry: '0x407FC0',
      condition: 'bpp=4 e QImage::fromData(..., "4bitTm2") restituisce null',
      dimensions: Object.freeze({ width, height, pixels, halfRounded }),
      observedOperations: Object.freeze([
        Object.freeze({ address: '0x407FC8-0x407FF2', operation: 'chiama QByteArray::mid(64, ceil(width*height/2)): estrae una slice dal QByteArray sorgente a partire dall’offset 0x40', certainty: 'assembly + import Qt identificato' }),
        Object.freeze({ address: '0x408002-0x408018', operation: 'costruisce un QByteArray di ceil(width*height/2) byte inizializzati a zero', certainty: 'assembly + import Qt identificato' }),
        Object.freeze({ address: '0x408096-0x4080AA', operation: 'chiama 0x4062C0 con la slice QByteArray::mid come sorgente, il QByteArray azzerato come destinazione e le dimensioni del descriptor', certainty: 'assembly' }),
        Object.freeze({ address: '0x408175-0x408195', operation: 'prepara un oggetto immagine con una chiamata indiretta; il significato preciso della funzione va identificato', certainty: 'assembly' }),
        Object.freeze({ address: '0x4081A0-0x4086C5', operation: 'copia indici/byte in buffer con gestione dei confini dei blocchi; poi chiama 0x406950', certainty: 'assembly' }),
        Object.freeze({ address: '0x4086C5', operation: 'chiama 0x406950 per il percorso di immagine', certainty: 'assembly' })
      ]),
      unresolved: Object.freeze([
        'relazione esatta tra inizio del QByteArray passato al loader e inizio del record QRS nel PAK',
        'significato dei buffer locali QImage e loro stride',
        'verifica pixel-per-pixel della trasformazione effettuata da 0x4062C0',
        'formato colore finale e relazione tra la slice a offset 64 e il payload QRS grezzo'
      ]),
      warning: 'Mappa di controllo e dimensionamento, non decoder QRS completo.'
    });
  }



  // Riproduce QByteArray::mid(64, ceil(width*height/2)) osservato nel
  // fallback 4-bit. bytes deve rappresentare esattamente i byte del
  // QByteArray passato al loader, non necessariamente l'intero record PAK.
  function extract4BitFallbackSlice(bytes, width, height) {
    if (!bytes || typeof bytes.length !== 'number') throw new TypeError('QByteArray sorgente non valido.');
    width = int(width, 'width');
    height = int(height, 'height');
    const pixels = width * height;
    if (!Number.isSafeInteger(pixels)) throw new RangeError('Dimensioni troppo grandi.');
    const length = Math.ceil(pixels / 2);
    const start = 64;
    if (bytes.length < start + length) throw new RangeError('QByteArray troppo corto per la slice 4bitTm2 osservata.');
    return new Uint8Array(Array.from(bytes).slice(start, start + length));
  }



  // Import Qt identificati dalla Import Address Table PE32 (non dedotti
  // dai soli call-site): utili per leggere il fallback senza attribuire
  // significati errati alle chiamate indirette.
  const QT_IAT = Object.freeze({
    '0x834528': 'QArrayData::deallocate',
    '0x834530': 'QArrayData::allocate',
    '0x834534': 'QByteArray::reallocData',
    '0x834540': 'QByteArray::expand',
    '0x834548': 'QByteArray::QByteArray(int, char)',
    '0x83454C': 'QByteArray::operator=(QByteArray const&)',
    '0x8345D4': 'QIODevice::readAll',
    '0x8345F0': 'QByteArray::mid(int, int)',
    '0x834634': 'QImage::setColorTable',
    '0x834640': 'QImage::setPixel',
    '0x834644': 'QImage::QImage(int, int, QImage::Format)',
    '0x834668': 'QImage::colorTable',
    '0x83466C': 'QImage::pixelIndex'
  });

  // Estrae il quarto byte di ogni gruppo da 4 e applica la normalizzazione
  // osservata nel ciclo 0x4082C0..0x4084E0. Non assegna un nome RGB/RGBA
  // ai canali: replica soltanto la trasformazione del quarto byte.
  // Il binario parte dall'indice 3 e avanza di 4; il limite osservato e' 0x400.
  function extractNormalizedFourthByteLane(bytes, options) {
    if (!bytes || typeof bytes.length !== 'number') throw new TypeError('Buffer trailing non valido.');
    const o = options || {};
    const start = int(o.start === undefined ? 0 : o.start, 'start');
    const maxRecords = int(o.maxRecords === undefined ? 1024 : o.maxRecords, 'maxRecords');
    const stride = 4;
    const lane = 3;
    const available = Math.max(0, Math.floor((bytes.length - start - lane + stride - 1) / stride));
    const count = Math.min(maxRecords, available);
    const out = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const value = Number(bytes[start + i * stride + lane]) & 255;
      out[i] = value === 0x7F ? 0x80 : (value >>> 1);
    }
    return out;
  }

  function normalizeExplorerAlphaByte(value) {
    value = int(Number(value), 'alpha byte');
    if (value > 255) throw new RangeError('Il byte alpha deve essere 0..255.');
    return value === 0x7F ? 0x80 : (value >>> 1);
  }

  // Il tratto 0x408175+ usa ancora QByteArray::mid e copia byte/indici
  // nei buffer immagine; non è una semplice conversione lineare RGBA.
  const QRS_POST_FALLBACK = Object.freeze({
    afterDecode: '0x408175',
    operations: Object.freeze([
      Object.freeze({ address: '0x408175-0x408195', operation: 'QByteArray::mid(64 + ceil(width*height/2), -1) sul QByteArray originario: estrae i byte successivi alla slice packed dei pixel; il contenuto è compatibile con una regione dati/palette, ma il parsing completo non è ancora chiuso' }),
      Object.freeze({ address: '0x4081A0-0x40826A', operation: 'copia byte dalla regione successiva ai pixel in buffer associati ai dati immagine/palette; QByteArray::expand viene usato quando la destinazione deve crescere' }),
      Object.freeze({ address: '0x4082C0-0x4086C5', operation: 'ulteriore copia a blocchi; il ramo tratta gruppi di 4 byte e normalizza il byte alpha: A==0x7F diventa 0x80, altrimenti A>>1; poi chiama 0x406950' })
    ]),
    unresolved: 'il formato esatto della regione trailing e la semantica completa della trasformazione alpha vanno verificati contro un QRS reale; la routine arriva fino alla chiamata 0x406950 a 0x4086C5'
  });

  // Origine del QByteArray: nel caller 0x40AE00, QIODevice::readAll
  // (IAT 0x8345D4) riempie il QByteArray locale poi passato a 0x4077F0.
  const QRS_FALLBACK_INPUT = Object.freeze({
    caller: '0x40AE00',
    readAllCall: '0x40AF7F',
    importAddress: '0x8345D4',
    importSymbol: 'QIODevice::readAll()',
    loaderCall: '0x40AFD1',
    loader: '0x4077F0',
    meaning: 'il QByteArray usato da QByteArray::mid(64, len) deriva dalla lettura completa del file aperto dal programma'
  });


  // ---------------- QRS PAK texture decoder (stage 2) ----------------
  // Nel PAK il record QRS descrive le dimensioni base dell'upload. Il
  // costruttore 0x406AE0 le espande in base alla profondita' della palette:
  // 4-bit: width=2*baseWidth, height=4*baseHeight;
  // 8-bit: width=2*baseWidth, height=2*baseHeight.
  // I byte sorgente iniziano a +0x60; il record occupa 0x80 + 4*baseW*baseH.

  function readU32LE(bytes, offset) {
    if (offset < 0 || offset + 4 > bytes.length) throw new RangeError('Lettura DWORD fuori dal buffer.');
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }

  function hasQrsMarker(bytes, offset) {
    return offset >= 0 && offset + 0x4c <= bytes.length &&
      bytes[offset + 0x28] === 0x51 && bytes[offset + 0x38] === 0x52 && bytes[offset + 0x48] === 0x53;
  }

  function parseQrsPak(bytes, options) {
    if (!bytes || typeof bytes.length !== 'number' || bytes.length < 8)
      throw new TypeError('PAK non valido o troppo corto.');
    const maxDimension = (options && options.maxDimension) || 4096;
    const entryCount = readU32LE(bytes, 0);
    if (!entryCount || entryCount > 65535)
      throw new RangeError('Numero entry PAK non plausibile.');

    // Header Spike: uint32 N seguito da N+1 offset LE.
    const tableEnd = 4 + (entryCount + 1) * 4;
    if (tableEnd > bytes.length)
      throw new RangeError('Tabella offset PAK (N+1) troncata.');
    const offsets = new Array(entryCount + 1);
    for (let i = 0; i <= entryCount; i++) {
      offsets[i] = readU32LE(bytes, 4 + i * 4);
      if (offsets[i] > bytes.length || (i === 0 && offsets[i] < tableEnd) ||
          (i > 0 && offsets[i] < offsets[i - 1]))
        throw new RangeError('Offset PAK non monotoni o fuori file.');
    }
    if ((offsets[0] & 15) !== 0)
      throw new RangeError('Il primo dato PAK non rispetta l’allineamento a 16 byte.');
    if (offsets[entryCount] !== bytes.length)
      throw new RangeError('Il puntatore terminale PAK non coincide con la fine del file.');

    const entries = [];
    const records = [];
    for (let ei = 0; ei < entryCount; ei++) {
      const start = offsets[ei];
      const end = offsets[ei + 1];
      const entryRecords = [];
      let pos = start;
      while (pos + 0x80 <= end) {
        if (!hasQrsMarker(bytes, pos)) { pos += 4; continue; }
        const baseWidth = readU32LE(bytes, pos + 0x30);
        const baseHeight = readU32LE(bytes, pos + 0x34);
        if (!baseWidth || !baseHeight || baseWidth > maxDimension || baseHeight > maxDimension) {
          pos += 4; continue;
        }
        const payloadBytes = baseWidth * baseHeight * 4;
        const recordSize = 0x80 + payloadBytes;
        if (!Number.isSafeInteger(payloadBytes) || pos + recordSize > end) {
          pos += 4; continue;
        }
        const recordId = readU32LE(bytes, pos + 0x0c);
        const isPalette16 = recordId === 0x5000000b || (baseWidth === 8 && baseHeight === 2);
        const isPalette256 = recordId === 0x50000047 || (baseWidth === 16 && baseHeight === 16);
        const paletteCount = isPalette16 ? baseWidth * baseHeight : (isPalette256 ? baseWidth * baseHeight : 0);
        const record = Object.freeze({
          entryIndex: ei, offset: pos, relativeOffset: pos - start, recordId,
          baseWidth, baseHeight, payloadOffset: pos + 0x60,
          payloadBytes, recordSize,
          isPalette: isPalette16 || isPalette256, paletteCount
        });
        entryRecords.push(record);
        records.push(record);
        pos += recordSize;
      }
      let activePalette = null;
      const linked = entryRecords.map(record => {
        if (record.isPalette) { activePalette = record; return Object.freeze({ ...record, paletteForNext: true }); }
        return Object.freeze({ ...record, palette: activePalette });
      });
      entries.push(Object.freeze({ index: ei, start, end, size: end - start, records: Object.freeze(linked) }));
    }
    return Object.freeze({ entryCount, tableEnd, offsets: Object.freeze(offsets), entries: Object.freeze(entries), records: Object.freeze(records) });
  }

  function buildMapperDwordMap(width, height) {
    const outWidth = Math.ceil(width / 2);
    const outHeight = Math.ceil(height / 4);
    const map = new Map();
    let maxIndex = -1;
    for (let y = 0; y < outHeight; y++) for (let x = 0; x < outWidth; x++) {
      const p = scratchDwordIndex404780(x, y, Math.max(1, Math.ceil(outWidth / 64)), 0);
      if (map.has(p)) throw new Error('Collisione nella mappa DWORD 0x404780.');
      map.set(p, y * outWidth + x);
      if (p > maxIndex) maxIndex = p;
    }
    return { map, outWidth, outHeight, maxIndex };
  }

  // Ricostruzione 4-bit usata dal percorso QImage: 0x404600 -> 0x405D20.
  // Il vecchio percorso 0x405B20 -> 0x404780 era una trasformazione
  // inversa/adatta a un buffer intermedio, non il passaggio finale mostrato
  // dal loader. Il risultato del vecchio percorso erano le scacchiere viste
  // nelle texture 4-bit.
  function gatherPacked4_405D20(scratch, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    // Una pagina GS 4-bit copre 128 pixel in larghezza. Il rowStride
    // conta le pagine per riga: senza questo valore y>=128 riutilizza
    // gli indirizzi della prima pagina e sovrascrive le righe superiori.
    const pageRowStride = Math.max(1, Math.ceil(width / 128));
    const xCount = width;  // 0x405D20 riceve arg5=altezza nativa, che corrisponde alla larghezza QRS decodificata
    const yCount = height; // arg6=larghezza nativa, corrispondente all’altezza QRS decodificata
    const pixelCount = xCount * yCount;
    if (!Number.isSafeInteger(pixelCount)) throw new RangeError('Dimensioni 4-bit troppo grandi.');
    const packed = new Uint8Array(Math.ceil(pixelCount / 2));
    let writeByte = 0;
    let highHalf = false;

    // 0x405D20: il ciclo interno avanza sulla coordinata x (larghezza
    // decodificata), quello esterno sulla y (altezza decodificata).
    // Ogni pixel legge il nibble basso/alto scelto da 0x411020.
    for (let y = 0; y < yCount; y++) {
      for (let x = 0; x < xCount; x++) {
        const a = scratchNibbleAddress4(x, y, pageRowStride, 0);
        if (a.byteOffset >= scratch.length) throw new RangeError('Scratch 4-bit insufficiente nel gather 0x405D20.');
        const value = scratch[a.byteOffset];
        const nibble = a.highNibble ? ((value >>> 4) & 15) : (value & 15);
        if (!highHalf) {
          packed[writeByte] = nibble;
          highHalf = true;
        } else {
          packed[writeByte] |= nibble << 4;
          writeByte++;
          highHalf = false;
        }
      }
    }
    return packed;
  }

  // Percorso 4-bit originale 0x405B20 -> 0x404780.
  // Viene usato per le geometrie grandi e per i passaggi multipli; il
  // percorso 0x404600 -> 0x405D20 della 0.0.8.11 resta come fallback per
  // le geometrie che non soddisfano la copertura del mapper originale.
  function decodeQrs4BlockMapper(source, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (!width || !height || (width & 1) || (height & 3))
      throw new RangeError('Il mapper 4-bit richiede larghezza pari e altezza multipla di 4.');
    const required = Math.ceil(width * height / 2);
    if (!Number.isSafeInteger(width * height) || !source || source.length < required)
      throw new RangeError('Blocco QRS 4-bit troncato.');

    const mapper = buildMapperDwordMap(width, height);
    const mapperKeys = new Set(mapper.map.keys());
    const pageRowStride = Math.max(1, Math.ceil(width / 128));

    function candidate(swapped) {
      const groups = new Set();
      const addresses = new Array(width * height);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const a = swapped
          ? scratchNibbleAddress4(y, x, pageRowStride, 0)
          : scratchNibbleAddress4(x, y, pageRowStride, 0);
        addresses[y * width + x] = a;
        groups.add(a.byteOffset >>> 2);
      }
      if (groups.size !== mapperKeys.size) return null;
      for (const key of mapperKeys) if (!groups.has(key)) return null;
      for (const key of groups) if (!mapperKeys.has(key)) return null;
      return addresses;
    }

    const addresses = candidate(false) || candidate(true);
    if (!addresses)
      throw new Error('Geometria scratch 4-bit non compatibile con il mapper 0x404780.');

    const scratch = new Uint8Array((mapper.maxIndex + 1) * 4);
    for (let i = 0; i < width * height; i++) {
      const sourceByte = source[i >>> 1];
      const nibble = (i & 1)
        ? ((sourceByte >>> 4) & 15)
        : (sourceByte & 15);
      const a = addresses[i];
      if (a.highNibble) scratch[a.byteOffset] = (scratch[a.byteOffset] & 0x0f) | (nibble << 4);
      else scratch[a.byteOffset] = (scratch[a.byteOffset] & 0xf0) | nibble;
    }

    const scratchDwords = bytesToDwordsLE(scratch);
    const outputDwords = finalStage404780(scratchDwords, {
      xStart: 0, yStart: 0,
      width: mapper.outWidth, height: mapper.outHeight,
      rowStride: Math.max(1, Math.ceil(mapper.outWidth / 64)), base64: 0
    });
    const outputPixelCount = outputDwords.length * 8;
    if (outputPixelCount !== width * height) {
      throw new RangeError(
        'Geometria 4-bit non allineata al mapper: ' + outputPixelCount +
        ' indici prodotti, ' + (width * height) + ' richiesti.'
      );
    }
    const indices = new Uint8Array(outputPixelCount);
    for (let i = 0; i < outputPixelCount; i++) {
      const dword = outputDwords[i >>> 3];
      indices[i] = (dword >>> ((i & 7) * 4)) & 15;
    }
    return indices;
  }

  // Decodifica multipass del loader 0x4062C0: 1 pass <=128 righe,
  // 2 pass <=256, 4 pass <=512. Gli offset sono in byte sulla sorgente
  // packed e in pixel sul risultato (due indici per byte).
  function decodeQrs4TextureMapper(source, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (!width || !height || (width & 1) || (height & 3))
      throw new RangeError('Dimensioni QRS 4-bit non valide: ' + width + '×' + height + '.');
    const pixelCount = width * height;
    const required = Math.ceil(pixelCount / 2);
    if (!Number.isSafeInteger(pixelCount) || !source || source.length < required)
      throw new RangeError('Texture QRS 4-bit troncata.');

    if (height > 512)
      throw new RangeError('L’altezza supera il limite nativo di 512 righe: serve il tiling esteso.');

    const passCount = height <= 128 ? 1 : (height <= 256 ? 2 : 4);
    const alignment = passCount === 1 ? 4 : (passCount === 2 ? 8 : 16);
    if (height % alignment)
      throw new RangeError('Geometria 4-bit non allineata: altezza ' + height +
        ' non multipla di ' + alignment + ' per il ramo a ' + passCount + ' passaggi.');

    const helperHeight = height / passCount;
    const chunkOffset = passCount === 1 ? 0 : Math.ceil(pixelCount / (passCount * 2));
    const indices = new Uint8Array(pixelCount);
    const passReports = [];
    for (let pass = 0; pass < passCount; pass++) {
      const sourceOffset = pass * chunkOffset;
      const sourceBytes = Math.ceil(width * helperHeight / 2);
      const block = source.subarray(sourceOffset, sourceOffset + sourceBytes);
      if (block.length < sourceBytes)
        throw new RangeError('Sorgente QRS insufficiente nel passaggio ' + (pass + 1) + '.');
      const passIndices = decodeQrs4BlockMapper(block, width, helperHeight);
      const destinationByteOffset = sourceOffset;
      const destinationPixelOffset = destinationByteOffset * 2;
      if (destinationPixelOffset + passIndices.length > indices.length)
        throw new RangeError('Il passaggio ' + (pass + 1) + ' supera il buffer destinazione 4-bit.');
      indices.set(passIndices, destinationPixelOffset);
      passReports.push(Object.freeze({
        pass: pass + 1,
        sourceByteOffset: sourceOffset,
        sourceBytes,
        destinationByteOffset,
        destinationPixelOffset,
        helperWidth: width,
        helperHeight,
        mapperWidth: Math.ceil(width / 2),
        mapperHeight: helperHeight / 4
      }));
    }
    return Object.freeze({
      indices,
      passCount,
      mode: passCount === 1 ? '0x4062C0-4bit-single-pass' :
        (passCount === 2 ? '0x4062C0-4bit-two-pass' : '0x4062C0-4bit-four-pass'),
      passReports: Object.freeze(passReports),
      blocks: Object.freeze([])
    });
  }

  // Estensione oltre il limite di 512 righe del programma originale.
  // Riutilizza il mapper completo su blocchi verticali indipendenti; il
  // blocco finale viene accettato solo se il mapper copre tutta la geometria.
  // Nessuna anteprima viene restituita se resterebbe una fascia rumorosa.
  function decodeQrs4TextureExtended(source, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (!width || !height || (width & 1) || (height & 3))
      throw new RangeError('Dimensioni QRS 4-bit non valide: ' + width + '×' + height + '.');
    const pixelCount = width * height;
    if (!Number.isSafeInteger(pixelCount) || !source || source.length < Math.ceil(pixelCount / 2))
      throw new RangeError('Texture QRS 4-bit troncata.');

    const indices = new Uint8Array(pixelCount);
    const passReports = [];
    let rowStart = 0;
    let pass = 0;
    while (rowStart < height) {
      const remaining = height - rowStart;
      const candidates = [128, 96, 64, 32].filter(h => h <= remaining);
      let chosen = null;
      let lastError = null;
      const sourceOffset = rowStart * width / 2;
      for (const blockHeight of candidates) {
        const sourceBytes = width * blockHeight / 2;
        const block = source.subarray(sourceOffset, sourceOffset + sourceBytes);
        try {
          const blockIndices = decodeQrs4BlockMapper(block, width, blockHeight);
          chosen = { blockHeight, sourceBytes, blockIndices };
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!chosen) {
        const axis = height > 512 ? 'altezza' : 'dimensioni';
        throw new RangeError(
          'Texture 4-bit ' + width + '×' + height + ': impossibile coprire la fascia da riga ' +
          rowStart + ' (' + remaining + ' righe residue) con il mapper QRS. ' +
          'Nessuna anteprima generata per evitare artefatti. ' +
          (lastError ? lastError.message : '')
        );
      }
      const destinationPixelOffset = rowStart * width;
      if (destinationPixelOffset + chosen.blockIndices.length > indices.length)
        throw new RangeError('Il tile 4-bit supera il buffer di destinazione.');
      indices.set(chosen.blockIndices, destinationPixelOffset);
      passReports.push(Object.freeze({
        pass: ++pass,
        sourceByteOffset: sourceOffset,
        sourceBytes: chosen.sourceBytes,
        destinationByteOffset: destinationPixelOffset / 2,
        destinationPixelOffset,
        helperWidth: width,
        helperHeight: chosen.blockHeight,
        mapperWidth: Math.ceil(width / 2),
        mapperHeight: chosen.blockHeight / 4
      }));
      rowStart += chosen.blockHeight;
    }
    return Object.freeze({
      indices,
      passCount: passReports.length,
      mode: '0.1-extended-4bit-vertical-tiles',
      diagnostic: 'Decodifica estesa a tile verticali; oltre 512 righe non è il percorso standard del loader originale.',
      passReports: Object.freeze(passReports),
      blocks: Object.freeze([])
    });
  }

  // Decoder 4-bit QRS 0x404600 -> 0x405D20. Il rowStride calcolato
  // nelle funzioni di scatter/gather consente di attraversare pagine GS.
  function decodeQrs4BlockLegacy(source, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (!width || !height || (width & 1) || (height & 1))
      throw new RangeError('Il percorso QRS 4-bit richiede larghezza e altezza pari.');
    const pixelCount = width * height;
    const requiredBytes = Math.ceil(pixelCount / 2);
    if (!Number.isSafeInteger(pixelCount) || !source || source.length < requiredBytes)
      throw new RangeError('Blocco QRS 4-bit troncato.');
    const dwordWidth = Math.ceil(width / 2);
    const dwordHeight = Math.ceil(height / 4);
    const scratch = scatterDwords404600(source, dwordWidth, dwordHeight, { readback4: { width, height } });
    const packed = gatherPacked4_405D20(scratch, width, height);
    const unpacked = unpackPaletteIndices4(packed);
    return unpacked.subarray(0, pixelCount);
  }

  function decodeQrs4TextureLegacy(source, width, height, fallbackReason) {
    const requiredBytes = Math.ceil(width * height / 2);
    if (!Number.isSafeInteger(width * height) || !source || source.length < requiredBytes)
      throw new RangeError('Texture QRS 4-bit troncata.');
    const indices = decodeQrs4BlockLegacy(source, width, height);
    return Object.freeze({
      indices,
      passCount: 1,
      mode: fallbackReason ? '0x404600-0x405D20-compatibility-fallback' : '0x404600-0x405D20',
      fallbackReason: fallbackReason || null,
      passReports: Object.freeze([Object.freeze({
        pass: 1, sourceByteOffset: 0, sourceBytes: requiredBytes,
        destinationByteOffset: 0, destinationPixelOffset: 0,
        helperWidth: width, helperHeight: height,
        mapperWidth: Math.ceil(width / 2), mapperHeight: Math.ceil(height / 4)
      })]),
      blocks: Object.freeze([])
    });
  }

  function decodeQrs4Texture(source, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (!width || !height || (width & 1) || (height & 1))
      throw new RangeError('Dimensioni texture QRS 4-bit non valide: ' + width + '×' + height + '.');
    const pixelCount = width * height;
    if (!Number.isSafeInteger(pixelCount) || !source || source.length < Math.ceil(pixelCount / 2))
      throw new RangeError('Texture QRS 4-bit troncata.');

    // Il percorso 0x404600 -> 0x405D20 gestisce le pagine verticali
    // consecutive quando il rowStride GS è corretto. Manteniamo quindi
    // un unico decoder anche oltre 128/256/512 righe: il vecchio mapper
    // 4-bit multi-pass usava offset a chunk che potevano sovrapporsi.
    return decodeQrs4TextureLegacy(source, width, height, null);
  }

  // 0x404600: distribuisce DWORD sorgente nello scratch GS usando
  // la mappa 0x412120/0x4120E0. Il formato d'ingresso e' una griglia
  // di DWORD, non una griglia di byte-pixel.
  function scatterDwords404600(sourceBytes, widthDwords, heightDwords, options) {
    widthDwords = int(widthDwords, 'widthDwords');
    heightDwords = int(heightDwords, 'heightDwords');
    // Le tre routine usano unità diverse per il TBW:
    // 0x404780: DWORD (64 DWORD per pagina); scratchByteOffset8: byte/texel
    // (TBW in unità da 64 pixel); scratchNibbleAddress4: pagine da 128 pixel.
    // Manteniamo quindi tre stride separati invece di riutilizzare un valore.
    const pixelWidth = widthDwords * 2;
    const is4BitReadback = !!(options && options.readback4);
    const byte8RowStride = Math.max(1, Math.ceil(pixelWidth / 64));
    const nibble4RowStride = Math.max(1, Math.ceil(pixelWidth / 128));
    // La mappa DWORD usa 64 DWORD per pagina; widthDwords è già in DWORD.
    // Le mappe byte e nibble mantengono invece i rispettivi TBW in pixel.
    const dwordRowStride = Math.max(1, Math.ceil(widthDwords / 64));
    const count = widthDwords * heightDwords;
    if (!Number.isSafeInteger(count) || !sourceBytes || sourceBytes.length < count * 4)
      throw new RangeError('Buffer DWORD QRS insufficiente per 0x404600.');
    let maxDword = -1;
    for (let y = 0; y < heightDwords; y++) for (let x = 0; x < widthDwords; x++) {
      const p = scratchDwordIndex404780(x, y, dwordRowStride, 0);
      if (p > maxDword) maxDword = p;
    }
    let maxByte = -1;
    for (let y = 0; y < heightDwords * 2; y++) for (let x = 0; x < widthDwords * 2; x++) {
      const p = scratchByteOffset8(x, y, byte8RowStride, 0);
      if (p > maxByte) maxByte = p;
    }
    // Lo scratch nativo (0x433040) è un'area fissa; il vecchio JS lo
    // dimensionava solo in base alla fase scatter. Nel 4-bit 0x405D20 può
    // leggere indirizzi più alti, quindi includiamo tutta la sua finestra.
    const readback4 = options && options.readback4;
    let maxNibbleByte = -1;
    if (readback4) {
      const rw = int(readback4.width, 'readback4.width');
      const rh = int(readback4.height, 'readback4.height');
      for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
        const p = scratchNibbleAddress4(x, y, nibble4RowStride, 0).byteOffset;
        if (p > maxNibbleByte) maxNibbleByte = p;
      }
    }
    const scratch = new Uint8Array(Math.max((maxDword + 1) * 4, maxByte + 1, maxNibbleByte + 1));
    const words = new DataView(sourceBytes.buffer, sourceBytes.byteOffset, sourceBytes.byteLength);
    const target = new DataView(scratch.buffer);
    for (let y = 0; y < heightDwords; y++) for (let x = 0; x < widthDwords; x++) {
      const sourceOffset = (y * widthDwords + x) * 4;
      const targetOffset = scratchDwordIndex404780(x, y, dwordRowStride, 0) * 4;
      target.setUint32(targetOffset, words.getUint32(sourceOffset, true), true);
    }
    return scratch;
  }

  function decodeQrs8Block(source, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (!width || !height || (width & 1) || (height & 1))
      throw new RangeError('Il percorso QRS 8-bit richiede larghezza e altezza pari.');
    const required = width * height;
    if (source.length < required) throw new RangeError('Blocco QRS 8-bit troncato.');

    // 0x406730: 0x404600 riceve W/2 DWORD per H/2 righe;
    // 0x405990 ricostruisce poi W x H byte lineari dallo scratch.
    const pageRowStride = Math.max(1, Math.ceil(width / 64));
    const scratch = scatterDwords404600(source, width >>> 1, height >>> 1);
    return gather8(scratch, {
      xStart: 0, yStart: 0, width, height,
      // scatter8/gather8 ricevono il TBW raddoppiato: il helper
      // divide rowStride2 per 2 prima di calcolare l'indirizzo GS.
      rowStride2: pageRowStride * 2, base64: 0
    });
  }

  function decodeQrs8Texture(source, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (source.length < width * height) throw new RangeError('Texture QRS 8-bit troncata.');
    const indices = new Uint8Array(width * height);
    const blocks = [];
    // 0x406730 avanza sull'asse verticale (arg4), a fasce di 64 righe.
    for (let y0 = 0; y0 < height; y0 += 64) {
      const blockHeight = Math.min(64, height - y0);
      if (blockHeight & 1) throw new RangeError('L’ultima fascia QRS 8-bit deve avere altezza pari.');
      const sourceOffset = y0 * width;
      const sourceLength = width * blockHeight;
      const block = source.subarray(sourceOffset, sourceOffset + sourceLength);
      const blockIndices = decodeQrs8Block(block, width, blockHeight);
      indices.set(blockIndices, sourceOffset);
      blocks.push(Object.freeze({ yStart: y0, height: blockHeight, sourceByteOffset: sourceOffset, sourceBytes: sourceLength }));
    }
    return Object.freeze({ indices, blocks: Object.freeze(blocks) });
  }

  // CSM1 per CLUT CT32/T8: scambia i bit 3 e 4 dell'indice.
  // La permutazione e' involutiva e corrisponde allo swap GS (i <-> i+8)
  // per gli indici con (i & 0x18) === 0x08.
  function csm1PaletteIndex(index) {
    return (index & 0xE7) | ((index & 0x08) << 1) | ((index & 0x10) >>> 1);
  }

  function resolveQrsPaletteStorageMode(paletteRecord, options) {
    const count = paletteRecord && paletteRecord.paletteCount;
    const requested = options && options.paletteStorageMode != null
      ? String(options.paletteStorageMode).toLowerCase()
      : 'auto';
    if (requested !== 'auto' && requested !== 'linear' && requested !== 'csm1')
      throw new TypeError('paletteStorageMode deve essere auto, linear oppure csm1.');
    if (requested === 'auto') return count === 256 ? 'csm1' : 'linear';
    if (requested === 'csm1' && count !== 256)
      throw new RangeError("CSM1 e implementato qui solo per CLUT CT32 da 256 colori; le palette da 16 colori restano lineari.");
    return requested;
  }

  // Il byte alpha nei record QRS/GS è nel range 0..128.
  // Conversione GS -> RGBA8: scala lineare x2 con saturazione a 255.
  // In particolare 0x7F diventa 254 e 0x80 diventa 255.
  function gsAlphaToRgbaByte(value) {
    value = int(Number(value), 'GS alpha');
    if (value > 0x80) throw new RangeError('Il GS alpha QRS deve essere 0..128.');
    return Math.min(255, value * 2);
  }

  function paletteBytesToRgba(bytes, paletteRecord, options) {
    const count = paletteRecord.paletteCount;
    const start = paletteRecord.payloadOffset;
    if (start + count * 4 > bytes.length) throw new RangeError('Palette QRS troncata.');
    const storageMode = resolveQrsPaletteStorageMode(paletteRecord, options);
    const out = new Uint8Array(count * 4);
    for (let i = 0; i < count; i++) {
      // Per CSM1 i byte della CLUT sono salvati nell'ordine fisico GS:
      // li rimappiamo nell'ordine logico usato dagli indici T8.
      const sourceIndex = storageMode === 'csm1' ? csm1PaletteIndex(i) : i;
      const p = start + sourceIndex * 4;
      out[i * 4] = bytes[p];
      out[i * 4 + 1] = bytes[p + 1];
      out[i * 4 + 2] = bytes[p + 2];
      const a = bytes[p + 3];
      // QRS contiene alpha GS 0..128: 0x7F deve restare 254;
      // solo 0x80 rappresenta il massimo 255 dopo la conversione.
      out[i * 4 + 3] = gsAlphaToRgbaByte(a);
    }
    return out;
  }

  function decodeQrsTexture(bytes, textureRecord, options) {
    if (!textureRecord || textureRecord.isPalette) throw new TypeError('Serve un record QRS texture, non una palette.');
    const palette = textureRecord.palette;
    if (!palette || !palette.paletteCount) throw new Error('Nessuna palette QRS precedente riconosciuta nella stessa entry.');
    const bpp = palette.paletteCount === 16 ? 4 : (palette.paletteCount === 256 ? 8 : 0);
    if (!bpp) throw new Error('Dimensione palette non supportata.');
    const width = textureRecord.baseWidth * 2;
    const height = textureRecord.baseHeight * (bpp === 4 ? 4 : 2);
    const sourceBytes = bpp === 4 ? Math.ceil(width * height / 2) : width * height;
    if (sourceBytes !== textureRecord.payloadBytes) throw new Error('La geometria derivata non coincide con la lunghezza dati QRS.');
    const source = bytes.subarray(textureRecord.payloadOffset, textureRecord.payloadOffset + sourceBytes);
    const decoded = bpp === 4 ? decodeQrs4Texture(source, width, height) : decodeQrs8Texture(source, width, height);
    const paletteStorageMode = resolveQrsPaletteStorageMode(palette, options);
    const paletteRgba = paletteBytesToRgba(bytes, palette, { paletteStorageMode });
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < decoded.indices.length; i++) {
      const index = decoded.indices[i];
      if (index >= palette.paletteCount) throw new RangeError('Indice palette fuori intervallo alla posizione ' + i + '.');
      const p = index * 4;
      rgba[i * 4] = paletteRgba[p];
      rgba[i * 4 + 1] = paletteRgba[p + 1];
      rgba[i * 4 + 2] = paletteRgba[p + 2];
      rgba[i * 4 + 3] = paletteRgba[p + 3];
    }
    return Object.freeze({
      entryIndex: textureRecord.entryIndex, recordOffset: textureRecord.offset,
      paletteOffset: palette.offset, bpp, width, height,
      baseWidth: textureRecord.baseWidth, baseHeight: textureRecord.baseHeight,
      sourceBytes, paletteCount: palette.paletteCount, paletteStorageMode,
      indices: decoded.indices, rgba,
      passCount: decoded.passCount || 1,
      decoderMode: decoded.mode || null,
      nativeSpecialPath: decoded.nativeSpecialPath || null,
      fallbackReason: decoded.fallbackReason || null,
      diagnostic: decoded.diagnostic || null,
      passReports: decoded.passReports || null,
      blocks: decoded.blocks || null
    });
  }

  function decodeAllQrsTextures(bytes, options) {
    const pak = parseQrsPak(bytes, options);
    const decoded = [];
    const skipped = [];
    for (const entry of pak.entries) for (const record of entry.records) {
      if (record.isPalette) continue;
      if (!record.palette) { skipped.push({ offset: record.offset, entryIndex: record.entryIndex, reason: 'palette-missing' }); continue; }
      try { decoded.push(decodeQrsTexture(bytes, record, options)); }
      catch (error) { skipped.push({ offset: record.offset, entryIndex: record.entryIndex, baseWidth: record.baseWidth, baseHeight: record.baseHeight, width: record.baseWidth * 2, height: record.baseHeight * (record.palette && record.palette.paletteCount === 16 ? 4 : 2), bpp: record.palette && record.palette.paletteCount === 16 ? 4 : 8, reason: error.message }); }
    }
    return Object.freeze({ pak, decoded: Object.freeze(decoded), skipped: Object.freeze(skipped) });
  }


  // Bug #2: associazione esplicita e validata dei descriptor palette.
  // Nel formato osservato non esiste un puntatore texture->palette: l'ordine
  // dei record e' il riferimento. Una palette immediatamente successiva e'
  // associata alla texture precedente; puo' inoltre essere condivisa dalle
  // texture successive della stessa famiglia recordId, fino al descriptor
  // palette seguente. Non si attraversano mai i confini delle entry PAK.
  function getQrsPaletteDescriptor(record) {
    if (!record) return null;
    if (record.recordId === 0x5000000b && record.baseWidth === 8 && record.baseHeight === 2 && record.payloadBytes === 64)
      return Object.freeze({ ...record, isPalette: true, paletteCount: 16, paletteKind: 'T4-16' });
    if (record.recordId === 0x50000047 && record.baseWidth === 16 && record.baseHeight === 16 && record.payloadBytes === 1024)
      return Object.freeze({ ...record, isPalette: true, paletteCount: 256, paletteKind: 'T8-256' });
    return null;
  }

  function pairQrsRecordsInEntry(sourceRecords) {
    const records = sourceRecords.map(record => {
      const descriptor = getQrsPaletteDescriptor(record);
      return descriptor || Object.freeze({ ...record, isPalette: false, paletteCount: 0 });
    });
    const paletteFamilyHints = new Map();

    // I record immediatamente adiacenti sono gli indizi piu' forti. Se una
    // palette e' condivisa, si consente il riuso solo per la stessa famiglia
    // ID osservata ai suoi lati; non basta che sia semplicemente la palette
    // piu' recente dell'entry.
    for (let i = 0; i < records.length; i++) {
      const palette = records[i];
      if (!palette.isPalette) continue;
      const hints = new Set();
      for (let j = i - 1; j >= 0; j--) {
        if (records[j].isPalette) break;
        hints.add(records[j].recordId >>> 0);
        break;
      }
      for (let j = i + 1; j < records.length; j++) {
        if (records[j].isPalette) break;
        hints.add(records[j].recordId >>> 0);
        break;
      }
      paletteFamilyHints.set(palette.offset, hints);
    }

    const linked = records.map((record, index) => {
      if (record.isPalette) {
        const previous = records[index - 1];
        const next = records[index + 1];
        return Object.freeze({
          ...record,
          paletteForPrevious: !!(previous && !previous.isPalette),
          paletteForNext: !!(next && !next.isPalette),
          palette: null,
          paletteLinkReason: 'descriptor'
        });
      }

      const next = records[index + 1] || null;
      let previousPalette = null;
      for (let j = index - 1; j >= 0; j--) {
        if (records[j].isPalette) { previousPalette = records[j]; break; }
      }

      let palette = null;
      let paletteLinkReason = 'unmatched';
      if (next && next.isPalette) {
        palette = next;
        paletteLinkReason = 'following-descriptor';
      } else if (previousPalette) {
        const hints = paletteFamilyHints.get(previousPalette.offset);
        if (hints && hints.has(record.recordId >>> 0)) {
          palette = previousPalette;
          paletteLinkReason = 'shared-descriptor-same-family';
        }
      }

      return Object.freeze({
        ...record,
        palette,
        paletteLinkReason,
        paletteLinkOffset: palette ? palette.offset : null
      });
    });
    return Object.freeze(linked);
  }

  function parseQrsPakPairs(bytes, options) {
    const parsed = parseQrsPak(bytes, options);
    const entries = parsed.entries.map(entry => Object.freeze({
      ...entry,
      records: pairQrsRecordsInEntry(entry.records)
    }));
    return Object.freeze({ ...parsed, entries: Object.freeze(entries) });
  }

  function decodeQrsTexturePaired(bytes, textureRecord, options) {
    if (!textureRecord || textureRecord.isPalette) throw new TypeError('Serve un record QRS texture, non una palette.');
    const palette = textureRecord.palette;
    if (!palette || !palette.paletteCount) throw new Error('Il record QRS successivo non e\' una palette supportata.');
    const bpp = palette.paletteCount === 16 ? 4 : 8;
    const width = textureRecord.baseWidth * 2;
    const height = textureRecord.baseHeight * (bpp === 4 ? 4 : 2);
    const sourceBytes = bpp === 4 ? Math.ceil(width * height / 2) : width * height;
    if (sourceBytes !== textureRecord.payloadBytes) throw new Error('Geometria QRS non coerente con il payload.');
    const source = bytes.subarray(textureRecord.payloadOffset, textureRecord.payloadOffset + sourceBytes);
    const decoded = bpp === 4 ? decodeQrs4Texture(source, width, height) : decodeQrs8Texture(source, width, height);
    const paletteStorageMode = resolveQrsPaletteStorageMode(palette, options);
    const paletteRgba = paletteBytesToRgba(bytes, palette, { paletteStorageMode });
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < decoded.indices.length; i++) {
      const index = decoded.indices[i];
      if (index >= palette.paletteCount) throw new RangeError('Indice palette fuori intervallo alla posizione ' + i + '.');
      const p = index * 4;
      rgba[i * 4] = paletteRgba[p];
      rgba[i * 4 + 1] = paletteRgba[p + 1];
      rgba[i * 4 + 2] = paletteRgba[p + 2];
      rgba[i * 4 + 3] = paletteRgba[p + 3];
    }
    return Object.freeze({
      entryIndex: textureRecord.entryIndex, recordOffset: textureRecord.offset,
      paletteOffset: palette.offset, paletteRecordId: palette.recordId,
      paletteLinkReason: textureRecord.paletteLinkReason || 'legacy-pairing',
      bpp, width, height,
      baseWidth: textureRecord.baseWidth, baseHeight: textureRecord.baseHeight,
      sourceBytes, paletteCount: palette.paletteCount, paletteStorageMode,
      indices: decoded.indices, rgba,
      passCount: decoded.passCount || 1,
      decoderMode: decoded.mode || null,
      nativeSpecialPath: decoded.nativeSpecialPath || null,
      fallbackReason: decoded.fallbackReason || null,
      diagnostic: decoded.diagnostic || null,
      passReports: decoded.passReports || null,
      blocks: decoded.blocks || null
    });
  }

  function decodeAllQrsTexturesPaired(bytes, options) {
    const pak = parseQrsPakPairs(bytes, options);
    const decoded = [];
    const skipped = [];
    for (const entry of pak.entries) for (const record of entry.records) {
      if (record.isPalette) continue;
      if (!record.palette) { skipped.push({ offset: record.offset, entryIndex: record.entryIndex, reason: 'next-qrs-not-palette' }); continue; }
      try { decoded.push(decodeQrsTexturePaired(bytes, record, options)); }
      catch (error) { skipped.push({ offset: record.offset, entryIndex: record.entryIndex, baseWidth: record.baseWidth, baseHeight: record.baseHeight, width: record.baseWidth * 2, height: record.baseHeight * (record.palette && record.palette.paletteCount === 16 ? 4 : 2), bpp: record.palette && record.palette.paletteCount === 16 ? 4 : 8, reason: error.message }); }
    }
    return Object.freeze({ pak, decoded: Object.freeze(decoded), skipped: Object.freeze(skipped) });
  }

  const api = Object.freeze({
    scratchByteOffset8, scatter8, gather8,
    scratchNibbleAddress4, scatter4, gather4,
    scratchDwordIndex404780, bytesToDwordsLE, finalStage404780, scatterDwords404600,
    decode4SinglePassExplorer, plan4MultiPassExplorer,
    parseQrsPak, decodeQrsTexture, decodeAllQrsTextures, decodeQrs4Texture, decodeQrs8Texture,
    parseQrsPakPairs, pairQrsRecordsInEntry, getQrsPaletteDescriptor, decodeQrsTexturePaired, decodeAllQrsTexturesPaired,
    csm1PaletteIndex, resolveQrsPaletteStorageMode, paletteBytesToRgba, gsAlphaToRgbaByte,
    packPaletteIndices4, unpackPaletteIndices4, copyPaletteIndices8,
    QRS_IMAGE_HINTS, planQrsImageProbe, plan4BitFallback, extract4BitFallbackSlice, QRS_FALLBACK_INPUT,
    QT_IAT, QRS_POST_FALLBACK,
    extractNormalizedFourthByteLane, normalizeExplorerAlphaByte,
    tables: Object.freeze({
      '0x4119A0': T4119A0, '0x4117A0': T4117A0, '0x4116A0': T4116A0,
      '0x411020': T411020, '0x411620': T411620, '0x411220': T411220,
      '0x412120': T412120, '0x4120E0': T4120E0
    })
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BT3_WEB_MODDER_QRS_STAGE2_4_8BIT_IDPAIRS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

  class BT3WebModder {
    constructor() {
      this.afs = null; this.afl = null; this.entries = []; this.names = [];
      this.archiveType = 'AFS'; this.archiveName = ''; this.archiveStack = [];
      this.status = 'In attesa di un archivio AFS o PAK.'; this.searchResultIndex = -1; this.zipPromise = null; this.selectedIndex = -1; this.panel = null; this.qrsCache = new Map(); this.qrsPreview = null;
    }
    getInfo() {
      return { id:'bt3webmodder', name:'BT3 Web Modder', color1:'#365b83', color2:'#294766', color3:'#1d344b',
        blocks:[
          {opcode:'chooseAFS',blockType:Scratch.BlockType.COMMAND,text:'carica archivio AFS'},
          {opcode:'choosePAK',blockType:Scratch.BlockType.COMMAND,text:'carica archivio PAK'},
          {opcode:'openNestedArchive',blockType:Scratch.BlockType.COMMAND,text:'apri archivio nella voce selezionata'},
          {opcode:'backArchive',blockType:Scratch.BlockType.COMMAND,text:'torna all archivio precedente'},
          {opcode:'chooseAFL',blockType:Scratch.BlockType.COMMAND,text:'carica indice AFL'},
          {opcode:'openExplorer',blockType:Scratch.BlockType.COMMAND,text:'apri esplora archivio'},
          {opcode:'createAFSFromZIP',blockType:Scratch.BlockType.COMMAND,text:'crea nuovo AFS da archivio ZIP'},
          {opcode:'extract',blockType:Scratch.BlockType.COMMAND,text:'estrai file con indice [INDEX]',arguments:{INDEX:{type:Scratch.ArgumentType.NUMBER,defaultValue:0}}},
          {opcode:'searchExact',blockType:Scratch.BlockType.COMMAND,text:'cerca file chiamato [NAME]',arguments:{NAME:{type:Scratch.ArgumentType.STRING,defaultValue:'resident_effect.pak'}}},
          {opcode:'getName',blockType:Scratch.BlockType.REPORTER,text:'nome AFL con indice [INDEX]',arguments:{INDEX:{type:Scratch.ArgumentType.NUMBER,defaultValue:0}}},
          {opcode:'getSize',blockType:Scratch.BlockType.REPORTER,text:'dimensione file con indice [INDEX]',arguments:{INDEX:{type:Scratch.ArgumentType.NUMBER,defaultValue:0}}},
          {opcode:'getCount',blockType:Scratch.BlockType.REPORTER,text:'numero file nell archivio'},
          {opcode:'getSearchResult',blockType:Scratch.BlockType.REPORTER,text:'indice dell ultimo risultato di ricerca'},
          {opcode:'getList',blockType:Scratch.BlockType.REPORTER,text:'elenco completo dei file in JSON'},
          {opcode:'loadAFS',blockType:Scratch.BlockType.COMMAND,text:'carica archivio AFS (legacy)'},
          {opcode:'loadAFL',blockType:Scratch.BlockType.COMMAND,text:'carica indice nomi AFL (legacy)'},
          {opcode:'count',blockType:Scratch.BlockType.REPORTER,text:'numero file AFS'},
          {opcode:'name',blockType:Scratch.BlockType.REPORTER,text:'nome file all’indice [I]',arguments:{I:{type:Scratch.ArgumentType.NUMBER,defaultValue:0}}},
          {opcode:'size',blockType:Scratch.BlockType.REPORTER,text:'dimensione file all’indice [I]',arguments:{I:{type:Scratch.ArgumentType.NUMBER,defaultValue:0}}},
          {opcode:'offset',blockType:Scratch.BlockType.REPORTER,text:'offset file all’indice [I]',arguments:{I:{type:Scratch.ArgumentType.NUMBER,defaultValue:0}}},
          {opcode:'search',blockType:Scratch.BlockType.COMMAND,text:'cerca nome contenente [Q]',arguments:{Q:{type:Scratch.ArgumentType.STRING,defaultValue:'.pak'}}},
          {opcode:'result',blockType:Scratch.BlockType.REPORTER,text:'indice risultato ricerca'},
          {opcode:'exportOne',blockType:Scratch.BlockType.COMMAND,text:'esporta file all’indice [I]',arguments:{I:{type:Scratch.ArgumentType.NUMBER,defaultValue:0}}},
          {opcode:'txt',blockType:Scratch.BlockType.COMMAND,text:'esporta indice TXT'},
          {opcode:'csv',blockType:Scratch.BlockType.COMMAND,text:'esporta indice CSV'},
          {opcode:'zip',blockType:Scratch.BlockType.COMMAND,text:'esporta archivio in formato ZIP'},
          {opcode:'replace',blockType:Scratch.BlockType.COMMAND,text:'sostituisci file all’indice [I] con file locale',arguments:{I:{type:Scratch.ArgumentType.NUMBER,defaultValue:0}}},
          {opcode:'state',blockType:Scratch.BlockType.REPORTER,text:'stato BT3 Web Modder'}
        ]};
    }
    set(s){this.status=String(s);}
    pick(accept='*/*') {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        Object.assign(input.style, {
          position: 'fixed',
          left: '8px',
          top: '8px',
          width: '2px',
          height: '2px',
          opacity: '0.02',
          zIndex: '2147483647'
        });
        document.body.appendChild(input);

        let completed = false;
        const finish = (callback, value) => {
          if (completed) return;
          completed = true;
          input.remove();
          callback(value);
        };

        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          if (file) finish(resolve, file);
          else finish(reject, new Error('Nessun file selezionato.'));
        }, { once: true });

        input.addEventListener('cancel', () => {
          finish(reject, new Error('Selezione annullata.'));
        }, { once: true });

        try {
          if (typeof input.showPicker === 'function') {
            input.showPicker();
          } else {
            input.click();
          }
        } catch (error) {
          try {
            input.click();
          } catch (secondError) {
            finish(reject, secondError);
          }
        }
      });
    }
    async loadAFS(){try{
      const f=await this.pick('.afs,application/octet-stream'), h=new Uint8Array(await f.slice(0,8).arrayBuffer());
      if(h.length<8||h[0]!==65||h[1]!==70||h[2]!==83||h[3]!==0)throw Error('Header AFS non valido.');
      const n=new DataView(h.buffer).getUint32(4,true), end=8+n*8;
      if(end>f.size)throw Error('Tabella AFS incompleta.');
      const d=new DataView(await f.slice(8,end).arrayBuffer());
      this.entries=Array.from({length:n},(_,i)=>{const o=d.getUint32(i*8,true),s=d.getUint32(i*8+4,true);return {index:i,offset:o,size:s,valid:o<=f.size&&s<=f.size-o};});
      this.names=this.entries.map((e,i)=>`file_${String(i).padStart(4,'0')}.bin`);
      this.afs=f; this.afl=null; this.archiveType='AFS'; this.archiveName=f.name; this.archiveStack=[]; this.selectedIndex=-1;
      this.searchResultIndex=-1;this.qrsCache.clear();this.qrsPreview=null;this.set(`AFS caricato: ${n} voci (${f.name}).`); this.render();
    }catch(e){this.set('Errore AFS: '+e.message);}}
    async parseAFSBlob(blob, label='archivio AFS') {
      const h = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
      if (h.length < 8 || h[0] !== 65 || h[1] !== 70 || h[2] !== 83 || h[3] !== 0) {
        throw Error('Firma AFS non valida.');
      }
      const n = new DataView(h.buffer).getUint32(4, true);
      const tableEnd = 8 + n * 8;
      if (!Number.isSafeInteger(tableEnd) || tableEnd > blob.size) throw Error('Tabella AFS incompleta.');
      const d = new DataView(await blob.slice(8, tableEnd).arrayBuffer());
      const entries = Array.from({length:n}, (_, i) => {
        const offset = d.getUint32(i * 8, true), size = d.getUint32(i * 8 + 4, true);
        return {index:i, offset, size, valid:offset <= blob.size && size <= blob.size - offset};
      });
      return {type:'AFS', entries, names:entries.map((e,i)=>`file_${String(i).padStart(4,'0')}.bin`), label};
    }
    async parsePAKBlob(blob, label='archivio PAK') {
      if (blob.size < 8) throw Error('File troppo corto per un PAK.');
      const h = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      const n = new DataView(h.buffer).getUint32(0, true);
      if (!n || n > 1000000) throw Error('Numero di voci PAK non plausibile.');
      const tableEnd = 4 + (n + 1) * 4;
      if (!Number.isSafeInteger(tableEnd) || tableEnd > blob.size) throw Error('Tabella offset PAK incompleta.');
      const raw = new DataView(await blob.slice(4, tableEnd).arrayBuffer());
      const offsets = Array.from({length:n+1}, (_,i)=>raw.getUint32(i*4, true));
      if (offsets[0] < tableEnd) throw Error('Il primo offset PAK precede la fine della tabella.');
      if (offsets[0] % 16 !== 0) throw Error('Allineamento iniziale PAK non riconosciuto (attesi multipli di 16).');
      for (let i=0;i<offsets.length;i++) {
        if (offsets[i] > blob.size) throw Error('Offset PAK fuori dal file.');
        if (i && offsets[i] < offsets[i-1]) throw Error('Tabella offset PAK non monotona.');
      }
      const entries = Array.from({length:n}, (_,i)=>({
        index:i, offset:offsets[i], size:offsets[i+1]-offsets[i], valid:true
      }));
      return {type:'PAK', entries, names:entries.map((e,i)=>`elemento_${String(i).padStart(4,'0')}.bin`), label};
    }
    async loadPAK() {
      try {
        const f = await this.pick('.pak,application/octet-stream');
        const parsed = await this.parsePAKBlob(f, f.name);
        this.afs = f; this.afl = null; this.entries = parsed.entries; this.names = parsed.names;
        this.archiveType = 'PAK'; this.archiveName = f.name; this.archiveStack = [];
        this.selectedIndex = -1; this.searchResultIndex = -1; this.qrsCache.clear(); this.qrsPreview = null;
        this.set(`PAK caricato: ${this.entries.length} voci (${f.name}).`); this.render();
      } catch(e) { this.set('Errore PAK: ' + e.message); this.render(); }
    }
    async openSelectedEntry() {
      const i = this.selectedIndex, e = this.entries[i];
      if (!e || !e.valid || !this.afs) { this.set('Seleziona una voce valida.'); this.render(); return; }
      try {
        const blob = this.afs.slice(e.offset, e.offset + e.size);
        let parsed = null, failure = '';
        try { parsed = await this.parseAFSBlob(blob, this.names[i]); } catch(err) { failure = err.message; }
        if (!parsed) {
          try { parsed = await this.parsePAKBlob(blob, this.names[i]); } catch(err) { failure = err.message; }
        }
        if (!parsed) { this.set('La voce selezionata non è stata riconosciuta come AFS o PAK. ' + failure); this.render(); return; }
        this.archiveStack.push({
          afs:this.afs, afl:this.afl, entries:this.entries, names:this.names,
          archiveType:this.archiveType, archiveName:this.archiveName,
          selectedIndex:this.selectedIndex, searchResultIndex:this.searchResultIndex
        });
        this.afs = blob; this.afl = null; this.entries = parsed.entries; this.names = parsed.names;
        this.archiveType = parsed.type; this.archiveName = parsed.label || this.names[i];
        this.selectedIndex = -1; this.searchResultIndex = -1; this.qrsCache.clear(); this.qrsPreview = null;
        this.set(`${parsed.type} annidato aperto: ${parsed.entries.length} voci (${this.archiveName}).`);
        this.render();
      } catch(err) { this.set('Apertura annidata non riuscita: ' + err.message); this.render(); }
    }
    goBackArchive() {
      const prev = this.archiveStack.pop();
      if (!prev) { this.set('Sei già al livello archivio principale.'); this.render(); return; }
      this.afs=prev.afs; this.afl=prev.afl; this.entries=prev.entries; this.names=prev.names;
      this.archiveType=prev.archiveType; this.archiveName=prev.archiveName;
      this.selectedIndex=prev.selectedIndex; this.searchResultIndex=prev.searchResultIndex; this.qrsCache.clear(); this.qrsPreview=null;
      this.set(`Tornato a ${this.archiveType}: ${this.archiveName}.`); this.render();
    }
    async loadAFL(){try{
      if(!this.afs || this.archiveType !== 'AFS')throw Error('Carica prima un AFS.');
      const f=await this.pick('.afl,application/octet-stream'); if(f.size<16)throw Error('AFL troppo corto.');
      const h=new Uint8Array(await f.slice(0,16).arrayBuffer());
      if(h[0]!==65||h[1]!==70||h[2]!==76||h[3]!==0)throw Error('Header AFL non valido.');
      const n=new DataView(h.buffer).getUint32(12,true); if(16+n*32>f.size)throw Error('AFL incompleto.');
      const b=new Uint8Array(await f.slice(16,16+n*32).arrayBuffer()), dec=new TextDecoder();
      const names=Array.from({length:n},(_,i)=>{const r=b.slice(i*32,(i+1)*32);let z=r.indexOf(0);if(z<0)z=32;return dec.decode(r.slice(0,z)).trim()||`file_${String(i).padStart(4,'0')}.bin`;});
      this.afl=f;this.names=this.entries.map((e,i)=>names[i]||`file_${String(i).padStart(4,'0')}.bin`);this.set(`AFL caricato: ${n} nomi.`); this.render();
    }catch(e){this.set('Errore AFL: '+e.message);}}
    // Decoder QRS 4/8-bit ricostruito: applica palette, swizzle e mapper 0x404780.
    async inspectQRS(index) {
      const e = this.entries[index];
      if (!this.afs || !e || !e.valid) return null;
      if (this.qrsCache.has(index)) return this.qrsCache.get(index);
      const pending = (async () => {
        const bytes = new Uint8Array(await this.afs.slice(e.offset, e.offset + e.size).arrayBuffer());
        const decoder = globalThis.BT3_WEB_MODDER_QRS_STAGE2_4_8BIT_IDPAIRS;
        if (!decoder) throw new Error('Modulo decoder QRS non inizializzato.');
        // Il parser del modulo lavora su PAK completo: creiamo un contenitore
        // temporaneo con una sola entry, senza modificare i byte dell'archivio.
        // PAK sintetico valido: N=1, tabella N+1, primo dato allineato a 16.
        // Header: count=1, offsets[0]=16, offsets[1]=16+bytes.length.
        // La versione precedente scriveva il primo dato a +8 e non impostava
        // l'offset terminale: parseQrsPak leggeva quindi un header invalido.
        const dataOffset = 16;
        const fakePak = new Uint8Array(dataOffset + bytes.length);
        const fakeView = new DataView(fakePak.buffer);
        fakeView.setUint32(0, 1, true);
        fakeView.setUint32(4, dataOffset, true);
        fakeView.setUint32(8, dataOffset + bytes.length, true);
        fakePak.set(bytes, dataOffset);
        const result = decoder.decodeAllQrsTexturesPaired(fakePak);
        const previews = [];
        let totalPixels = 0;
        for (const d of result.decoded) {
          const pixels = d.width * d.height;
          if (previews.length >= 48 || totalPixels + pixels > 1048576) break;
          previews.push({
            index,
            textureOffset: d.recordOffset - dataOffset,
            paletteOffset: d.paletteOffset - dataOffset,
            paletteLinkReason: d.paletteLinkReason,
            width: d.width, height: d.height,
            baseWidth: d.baseWidth, baseHeight: d.baseHeight,
            bpp: d.bpp, paletteColors: d.paletteCount,
            sourceByteLength: d.sourceBytes,
            passCount: d.passCount || 1,
            decoderMode: d.decoderMode || 'QRS decoder',
            fallbackReason: d.fallbackReason || null,
            diagnostic: d.diagnostic || null,
            rgba: new Uint8ClampedArray(d.rgba),
            indices: d.indices,
            decoder: d.bpp + '-bit indexed + mapper 0x404780',
            layoutStatus: d.bpp === 8
              ? 'swizzle texture + CLUT CT32 CSM1 (bit 3/4 scambiati); palette associata tramite sequenza descriptor + famiglia ID'
              : 'swizzle texture + CLUT 16 colori lineare; palette associata tramite sequenza descriptor + famiglia ID'
          });
          totalPixels += pixels;
        }
        const largeItems = [...result.decoded, ...result.skipped].filter(d => (d.width || d.baseWidth * 2) > 512 || (d.height || d.baseHeight * (d.bpp === 4 ? 4 : 2)) > 512);
        const largeSummary = largeItems.length
          ? ` Dimensioni oltre 512 rilevate automaticamente: ${largeItems.slice(0, 5).map(d => `${d.width || d.baseWidth * 2}×${d.height || d.baseHeight * (d.bpp === 4 ? 4 : 2)}`).join(', ')}${largeItems.length > 5 ? ', …' : ''}.`
          : '';
        this.set(`QRS: ${result.decoded.length} texture decodificate, ${result.skipped.length} saltate; anteprime mostrate ${previews.length}.${largeSummary}`);
        return previews.length ? previews : null;
      })();
      this.qrsCache.set(index, pending);
      const result = await pending;
      this.qrsCache.set(index, result);
      return result;
    }
    showQRSPreview(container, infos) {
      if (!infos) return;
      const list = Array.isArray(infos) ? infos : [infos];
      for (const info of list) {
        const wrap = document.createElement('div');
        Object.assign(wrap.style, {
          gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px', background: '#172838', border: '1px solid #496987',
          borderRadius: '8px', flexWrap: 'wrap'
        });
        const canvas = document.createElement('canvas');
        canvas.width = info.width; canvas.height = info.height;
        const scale = Math.max(1, Math.min(4, Math.floor(256 / info.width)));
        canvas.style.width = Math.min(256, info.width * scale) + 'px';
        canvas.style.height = Math.max(16, Math.round(parseInt(canvas.style.width, 10) * info.height / info.width)) + 'px';
        canvas.style.imageRendering = 'pixelated'; canvas.style.background = '#101820';
        const ctx = canvas.getContext('2d');
        const draw = () => {
          const image = ctx.createImageData(info.width, info.height);
          image.data.set(info.rgba);
          ctx.putImageData(image, 0, 0);
          details.textContent = `${info.decoder} · ${info.width}×${info.height} · ${info.paletteColors} colori · ` +
            `texture +0x${info.textureOffset.toString(16).toUpperCase()} · palette +0x${info.paletteOffset.toString(16).toUpperCase()} · ` +
            `${info.passCount} passaggi · ${info.decoderMode} · ${info.diagnostic || (info.width > 512 || info.height > 512 ? 'dimensione oltre 512 rilevata automaticamente' : 'dimensioni standard')} · ${info.layoutStatus}`;
          if (info.fallbackReason) details.textContent += ` · fallback: ${info.fallbackReason}`;
          meta.textContent = `QRS base ${info.baseWidth}×${info.baseHeight} · sorgente ${info.sourceByteLength.toLocaleString()} byte · ` +
            `bpp ${info.bpp} · indici ${info.indices.length.toLocaleString()}`;
        };
        const details = document.createElement('small');
        details.style.color = '#c5d7e7';
        const meta = document.createElement('small');
        Object.assign(meta.style, { color: '#9db4c8', width: '100%', fontFamily: 'monospace', fontSize: '10px' });
        const controls = document.createElement('div');
        Object.assign(controls.style, { display: 'flex', gap: '6px', flexWrap: 'wrap' });
        controls.appendChild(this.btn('Esporta PNG', () => this.exportQRSPreview(info)));
        const bppSelect = document.createElement('select');
        bppSelect.style.cssText = 'padding:7px;border-radius:6px;background:#20364b;color:white;border:1px solid #789';
        for (const value of [4,8]) {
          const option=document.createElement('option'); option.value=String(value); option.textContent=value+' bit';
          if (value===info.bpp) option.selected=true;
          bppSelect.appendChild(option);
        }
        controls.appendChild(bppSelect);
        const importButton=this.btn('Sostituisci con PNG',()=>this.replaceQrsTexture(info,Number(bppSelect.value)));
        controls.appendChild(importButton);
        wrap.addEventListener('click',event=>event.stopPropagation());
        wrap.append(canvas, details, meta, controls);
        container.appendChild(wrap);
        draw();
      }
    }
    exportQRSPreview(info) {
      const canvas = document.createElement('canvas'); canvas.width = info.width; canvas.height = info.height;
      const ctx = canvas.getContext('2d'); const image = ctx.createImageData(info.width, info.height);
      image.data.set(info.rgba); ctx.putImageData(image,0,0);
      canvas.toBlob(blob => {
        if (!blob) { this.set('Esportazione PNG non riuscita.'); this.render(); return; }
        const name = this.clean(this.names[info.index] || `qrs_${info.index}`)
          .replace(/\.[^.]+$/, '') + `_QRS_${info.textureOffset.toString(16).toUpperCase()}.png`;
        this.download(blob, name); this.set('PNG QRS decodificato esportato: palette e mapper 0x404780 applicati.'); this.render();
      }, 'image/png');
    }
    async parseIndexedPNG(buffer, expectedWidth, expectedHeight) {
      const bytes = new Uint8Array(buffer);
      const signature = [137,80,78,71,13,10,26,10];
      if (bytes.length < 33 || !signature.every((v,i) => bytes[i] === v))
        throw new Error('Il file selezionato non è un PNG valido.');
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const read32 = (p) => view.getUint32(p, false);
      let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = -1;
      let palette = null, transparency = null, sawHeader = false, sawEnd = false;
      const idat = [];
      let idatLength = 0;
      while (pos + 12 <= bytes.length) {
        const length = read32(pos);
        if (length > bytes.length - pos - 12) throw new Error('Chunk PNG troncato o con lunghezza non valida.');
        const type = String.fromCharCode(bytes[pos+4],bytes[pos+5],bytes[pos+6],bytes[pos+7]);
        const start = pos + 8, end = start + length;
        if (type === 'IHDR') {
          if (sawHeader || length !== 13) throw new Error('Header IHDR PNG non valido.');
          width = read32(start); height = read32(start+4);
          bitDepth = bytes[start+8]; colorType = bytes[start+9];
          if (bytes[start+10] !== 0 || bytes[start+11] !== 0) throw new Error('Metodo di compressione o filtro PNG non supportato.');
          interlace = bytes[start+12]; sawHeader = true;
          if (!width || !height || width > 16384 || height > 16384 || width * height > 16777216)
            throw new Error('Dimensioni PNG non valide o troppo grandi.');
          if (width !== expectedWidth || height !== expectedHeight)
            throw new Error(`Dimensioni PNG ${width}×${height}: la texture richiede esattamente ${expectedWidth}×${expectedHeight}.`);
          if (colorType !== 3) throw new Error('PNG senza palette indicizzata: è richiesto il formato colore indicizzato (PNG color type 3).');
          if (![1,2,4,8].includes(bitDepth)) throw new Error('Profondità PNG indicizzata non supportata: usare 1, 2, 4 o 8 bit.');
          if (interlace !== 0) throw new Error('PNG interlacciato non supportato: esportarlo senza interlacciamento.');
        } else if (type === 'PLTE') {
          if (!sawHeader || length === 0 || length % 3 !== 0 || length > 768) throw new Error('Palette PLTE PNG non valida: sono ammessi da 1 a 256 colori.');
          palette = bytes.slice(start, end);
        } else if (type === 'tRNS') {
          transparency = bytes.slice(start, end);
        } else if (type === 'IDAT') {
          if (!sawHeader) throw new Error('Il PNG non contiene un IHDR valido.');
          idat.push(bytes.slice(start, end)); idatLength += length;
        } else if (type === 'IEND') {
          if (length !== 0) throw new Error('Chunk IEND PNG non valido.');
          sawEnd = true; pos = end + 4; break;
        }
        pos = end + 4; // ignora CRC: i limiti e la struttura dei chunk vengono comunque verificati
      }
      if (!sawHeader || !sawEnd) throw new Error('Struttura PNG incompleta (IHDR/IEND mancanti).');
      if (!palette) throw new Error('PNG senza palette PLTE: la sostituzione richiede una palette indicizzata.');
      const paletteCount = palette.length / 3;
      if (!paletteCount || paletteCount > 256 || paletteCount > (1 << bitDepth))
        throw new Error('Il PNG contiene una palette non valida o con più colori di quelli rappresentabili dalla profondità dichiarata.');
      if (transparency && transparency.length > paletteCount) throw new Error('Chunk tRNS più lungo della palette PNG.');
      if (!idatLength) throw new Error('Il PNG non contiene dati immagine IDAT.');
      if (typeof DecompressionStream !== 'function')
        throw new Error('Questo browser non supporta la decompressione PNG richiesta dall’importatore.');
      const rowBytes = Math.ceil(width * bitDepth / 8);
      const expectedLength = height * (rowBytes + 1);
      const compressed = new Uint8Array(idatLength);
      let compressedOffset = 0;
      for (const part of idat) { compressed.set(part, compressedOffset); compressedOffset += part.length; }
      let inflated;
      try {
        const reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
        const chunks = []; let total = 0;
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          total += result.value.length;
          if (total > expectedLength) { await reader.cancel(); throw new Error('Dati decompressi oltre la dimensione dichiarata nell’IHDR.'); }
          chunks.push(result.value);
        }
        if (total !== expectedLength) throw new Error('Dimensione dei dati PNG decompressi incoerente.');
        inflated = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) { inflated.set(chunk, offset); offset += chunk.length; }
      } catch (error) {
        throw new Error('Dati PNG compressi non leggibili: ' + error.message);
      }
      const raw = new Uint8Array(height * rowBytes);
      const bytesPerPixel = 1;
      const paeth = (a,b,c) => {
        const p = a + b - c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
        return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
      };
      for (let y = 0; y < height; y++) {
        const filter = inflated[y * (rowBytes + 1)];
        if (filter > 4) throw new Error('Filtro PNG non valido alla riga ' + y + '.');
        const src = y * (rowBytes + 1) + 1, dst = y * rowBytes, prev = dst - rowBytes;
        for (let x = 0; x < rowBytes; x++) {
          const value = inflated[src + x];
          const left = x >= bytesPerPixel ? raw[dst + x - bytesPerPixel] : 0;
          const up = y > 0 ? raw[prev + x] : 0;
          const upLeft = (y > 0 && x >= bytesPerPixel) ? raw[prev + x - bytesPerPixel] : 0;
          let predictor = 0;
          if (filter === 1) predictor = left;
          else if (filter === 2) predictor = up;
          else if (filter === 3) predictor = Math.floor((left + up) / 2);
          else if (filter === 4) predictor = paeth(left, up, upLeft);
          raw[dst + x] = (value + predictor) & 255;
        }
      }
      const indices = new Uint8Array(width * height);
      const mask = (1 << bitDepth) - 1;
      for (let y = 0; y < height; y++) {
        const row = y * rowBytes;
        for (let x = 0; x < width; x++) {
          const bit = x * bitDepth;
          const shift = 8 - bitDepth - (bit & 7);
          const value = (raw[row + (bit >>> 3)] >>> shift) & mask;
          if (value >= paletteCount) throw new Error(`Indice PNG ${value} fuori dalla palette alla coordinata ${x},${y}.`);
          indices[y * width + x] = value;
        }
      }
      const rgbaPalette = new Uint8Array(paletteCount * 4);
      for (let i = 0; i < paletteCount; i++) {
        rgbaPalette[i*4] = palette[i*3];
        rgbaPalette[i*4+1] = palette[i*3+1];
        rgbaPalette[i*4+2] = palette[i*3+2];
        rgbaPalette[i*4+3] = transparency && i < transparency.length ? transparency[i] : 255;
      }
      return { width, height, bitDepth, paletteCount, palette: rgbaPalette, indices };
    }
    makeQrsRecordWithPayload(entryBytes, record, payload, changes) {
      const relative = record.offset - 16;
      const oldRecord = entryBytes.subarray(relative, relative + record.recordSize);
      if (relative < 0 || oldRecord.length !== record.recordSize || record.recordSize !== 0x80 + record.payloadBytes)
        throw new Error('Record QRS originale incompleto: sostituzione annullata.');
      const out = new Uint8Array(0x80 + payload.length);
      out.set(oldRecord.subarray(0, 0x60), 0);
      out.set(payload, 0x60);
      // Gli ultimi 0x20 byte sono la coda del record, separata dal payload.
      out.set(oldRecord.subarray(0x60 + record.payloadBytes), 0x60 + payload.length);
      const dv = new DataView(out.buffer);
      if (changes && changes.recordId != null) dv.setUint32(0x0c, changes.recordId >>> 0, true);
      if (changes && changes.baseWidth != null) dv.setUint32(0x30, changes.baseWidth >>> 0, true);
      if (changes && changes.baseHeight != null) dv.setUint32(0x34, changes.baseHeight >>> 0, true);
      return out;
    }
    async buildQrsEntryReplacement(originalBytes, targetRecord, newTexture, paletteRecord, newPalette, shared) {
      const targetOffset = targetRecord.offset - 16;
      const targetEnd = targetOffset + targetRecord.recordSize;
      const replacements = new Map([[targetOffset, { oldSize: targetRecord.recordSize, bytes: newTexture }]]);
      const insertions = new Map();
      if (!shared) {
        const paletteOffset = paletteRecord.offset - 16;
        if (replacements.has(paletteOffset)) throw new Error('Record palette/texture sovrapposti.');
        replacements.set(paletteOffset, { oldSize: paletteRecord.recordSize, bytes: newPalette });
      } else {
        insertions.set(targetEnd, [newPalette]);
        if (paletteRecord.offset < targetRecord.offset) {
          const oldPalette = originalBytes.slice(paletteRecord.offset - 16, paletteRecord.offset - 16 + paletteRecord.recordSize);
          insertions.get(targetEnd).push(oldPalette);
        }
      }
      const starts = [...replacements.keys()].sort((a,b)=>a-b);
      for (let i=1;i<starts.length;i++) {
        const previous = replacements.get(starts[i-1]);
        if (starts[i] < starts[i-1] + previous.oldSize) throw new Error('Record QRS sovrapposti: ricostruzione annullata.');
      }
      const insertPositions = [...insertions.keys()].sort((a,b)=>a-b);
      const parts = [];
      let cursor = 0;
      while (cursor < originalBytes.length) {
        const add = insertions.get(cursor);
        if (add) { parts.push(...add); insertions.delete(cursor); }
        const replacement = replacements.get(cursor);
        if (replacement) {
          parts.push(replacement.bytes);
          cursor += replacement.oldSize;
          continue;
        }
        let next = originalBytes.length;
        for (const p of starts) if (p > cursor && p < next) next = p;
        for (const p of insertPositions) if (p > cursor && p < next) next = p;
        if (next <= cursor) throw new Error('Ricostruzione QRS bloccata da un offset non progressivo.');
        parts.push(originalBytes.subarray(cursor, next));
        cursor = next;
      }
      if (insertions.has(originalBytes.length)) parts.push(...insertions.get(originalBytes.length));
      const rebuilt = new Blob(parts); return new Uint8Array(await rebuilt.arrayBuffer());
    }
    async rebuildCurrentArchiveWithEntry(index, entryBytes) {
      if (!this.afs || !this.entries[index]) throw new Error('Archivio o voce selezionata non disponibili.');
      const entries = [...this.entries];
      if (entries.some(e => !e.valid)) throw new Error('L’archivio contiene voci non valide: ricostruzione annullata.');
      const valid = entries.filter(e => e.valid).sort((a,b)=>a.offset-b.offset);
      let previousEnd = 0;
      for (const e of valid) {
        if (e.offset < previousEnd || e.size > this.afs.size - e.offset) throw new Error('Voci archivio sovrapposte o fuori dai limiti.');
        previousEnd = e.offset + e.size;
      }
      const n = entries.length;
      if (!n) throw new Error('Archivio vuoto.');
      if (this.archiveType === 'AFS') {
        const tableEnd = 8 + n * 8;
        let cursor = Math.ceil(tableEnd / 2048) * 2048;
        const header = new Uint8Array(tableEnd), dv = new DataView(header.buffer);
        header.set([65,70,83,0]); dv.setUint32(4,n,true);
        const records = [];
        for (let i=0;i<n;i++) {
          const size = i === index ? entryBytes.length : entries[i].size;
          cursor = Math.ceil(cursor / 2048) * 2048;
          if (cursor > 0xffffffff || size > 0xffffffff || cursor + size > 0x100000000) throw new Error('Limite offset/dimensione AFS superato.');
          records.push({ offset:cursor, size, data:i === index ? entryBytes : this.afs.slice(entries[i].offset, entries[i].offset + entries[i].size) });
          dv.setUint32(8 + i*8,cursor,true); dv.setUint32(12 + i*8,size,true);
          cursor += size;
        }
        const parts = [header]; let out = tableEnd;
        for (const rec of records) {
          if (rec.offset > out) parts.push(new Uint8Array(rec.offset - out));
          parts.push(rec.data); out = rec.offset + rec.size;
        }
        return new Blob(parts,{type:'application/octet-stream'});
      }
      if (this.archiveType === 'PAK') {
        const tableEnd = 4 + (n + 1) * 4;
        let cursor = Math.ceil(tableEnd / 16) * 16;
        const offsets = new Array(n + 1), records = [];
        for (let i=0;i<n;i++) {
          cursor = Math.ceil(cursor / 16) * 16;
          const size = i === index ? entryBytes.length : entries[i].size;
          if (cursor > 0xffffffff || size > 0xffffffff || cursor + size > 0x100000000) throw new Error('Limite offset/dimensione PAK superato.');
          offsets[i] = cursor;
          records.push({offset:cursor,size,data:i === index ? entryBytes : this.afs.slice(entries[i].offset,entries[i].offset+entries[i].size)});
          cursor += size;
        }
        offsets[n] = cursor;
        const header = new Uint8Array(tableEnd), dv = new DataView(header.buffer);
        dv.setUint32(0,n,true);
        for (let i=0;i<=n;i++) dv.setUint32(4+i*4,offsets[i],true);
        const parts=[header]; let out=tableEnd;
        for(const rec of records){if(rec.offset>out)parts.push(new Uint8Array(rec.offset-out));parts.push(rec.data);out=rec.offset+rec.size;}
        return new Blob(parts,{type:'application/octet-stream'});
      }
      throw new Error('Tipo archivio non supportato per la ricostruzione.');
    }
    async replaceQrsTexture(info, requestedBpp) {
      try {
        if (!this.afs || !info || this.selectedIndex !== info.index) throw new Error('Seleziona prima la voce archivio contenente la texture.');
        const pngFile = await this.pick('.png,image/png');
        if (pngFile.size > 64 * 1024 * 1024) throw new Error('PNG troppo grande: il limite di importazione è 64 MiB.');
        const png = await this.parseIndexedPNG(await pngFile.arrayBuffer(), info.width, info.height);
        if (png.paletteCount > 256) throw new Error('La palette PNG supera il limite di 256 colori.');
        let bpp = Number(requestedBpp) === 8 ? 8 : 4;
        let autoPromoted = false;
        if (bpp === 4 && png.paletteCount > 16) { bpp = 8; autoPromoted = true; }
        if (bpp === 4 && png.paletteCount > 16) throw new Error('Una texture 4-bit può avere al massimo 16 colori.');
        if ((info.width & 1) || (bpp === 4 && (info.height & 3)) || (bpp === 8 && (info.height & 1)))
          throw new Error('Le dimensioni PNG non sono compatibili con la geometria QRS del formato scelto.');
        const decoder = globalThis.BT3_WEB_MODDER_QRS_STAGE2_4_8BIT_IDPAIRS;
        if (!decoder || typeof decoder.encodeQrs4Texture !== 'function' || typeof decoder.encodeQrs8Texture !== 'function')
          throw new Error('Encoder QRS non inizializzato.');
        const encodedTexture = bpp === 4
          ? decoder.encodeQrs4Texture(png.indices, png.width, png.height)
          : decoder.encodeQrs8Texture(png.indices, png.width, png.height);
        const paletteCount = bpp === 4 ? 16 : 256;
        const palettePayload = new Uint8Array(paletteCount * 4);
        for (let i=0;i<png.paletteCount;i++) {
          const physical = bpp === 8 ? decoder.csm1PaletteIndex(i) : i;
          const src=i*4,dst=physical*4;
          palettePayload[dst]=png.palette[src];
          palettePayload[dst+1]=png.palette[src+1];
          palettePayload[dst+2]=png.palette[src+2];
          palettePayload[dst+3]=Math.max(0,Math.min(128,Math.round(png.palette[src+3]/2)));
        }
        const archiveEntry = this.entries[info.index];
        if (!archiveEntry || !archiveEntry.valid) throw new Error('Voce archivio QRS non valida.');
        const originalBytes = new Uint8Array(await this.afs.slice(archiveEntry.offset,archiveEntry.offset+archiveEntry.size).arrayBuffer());
        const dataOffset = 16;
        const fakePak = new Uint8Array(dataOffset + originalBytes.length);
        const fakeView = new DataView(fakePak.buffer);
        fakeView.setUint32(0,1,true); fakeView.setUint32(4,dataOffset,true); fakeView.setUint32(8,dataOffset+originalBytes.length,true);
        fakePak.set(originalBytes,dataOffset);
        const before = decoder.decodeAllQrsTexturesPaired(fakePak);
        const parsedEntry = before.pak.entries[0];
        const target = parsedEntry.records.find(r=>!r.isPalette && r.offset-dataOffset===info.textureOffset);
        if (!target || !target.palette) throw new Error('La texture selezionata o la sua palette non è più riconoscibile nel record QRS.');
        if (target.baseWidth * 2 !== png.width) throw new Error('La larghezza PNG non coincide con la geometria QRS originale.');
        const allTextures = parsedEntry.records.filter(r=>!r.isPalette);
        const targetOrdinal = allTextures.indexOf(target);
        if (targetOrdinal < 0) throw new Error('Ordine dei record QRS non valido.');
        const paletteConsumers = allTextures.filter(r=>r.palette && r.palette.offset===target.palette.offset);
        const paletteShared = paletteConsumers.length > 1;
        const paletteRecord = parsedEntry.records.find(r=>r.isPalette && r.offset===target.palette.offset);
        if (!paletteRecord) throw new Error('Il record descriptor della palette non è disponibile.');
        const newBaseHeight = bpp === 4 ? png.height / 4 : png.height / 2;
        const textureRecordBytes = this.makeQrsRecordWithPayload(originalBytes,target,encodedTexture,{baseHeight:newBaseHeight});
        const paletteRecordId = bpp === 4 ? 0x5000000b : 0x50000047;
        const paletteWidth = bpp === 4 ? 8 : 16, paletteHeight = bpp === 4 ? 2 : 16;
        const paletteRecordBytes = this.makeQrsRecordWithPayload(originalBytes,paletteRecord,palettePayload,{
          recordId:paletteRecordId,baseWidth:paletteWidth,baseHeight:paletteHeight
        });
        const rebuiltEntry = await this.buildQrsEntryReplacement(originalBytes,target,textureRecordBytes,paletteRecord,paletteRecordBytes,paletteShared);
        const verifyFake = new Uint8Array(dataOffset + rebuiltEntry.length);
        const verifyView = new DataView(verifyFake.buffer);
        verifyView.setUint32(0,1,true); verifyView.setUint32(4,dataOffset,true); verifyView.setUint32(8,dataOffset+rebuiltEntry.length,true);
        verifyFake.set(rebuiltEntry,dataOffset);
        const after = decoder.decodeAllQrsTexturesPaired(verifyFake);
        const afterRecords = after.pak.entries[0].records.filter(r=>!r.isPalette);
        if (afterRecords.length !== allTextures.length) throw new Error('La ricostruzione cambierebbe il numero di record texture QRS.');
        const newTarget = afterRecords[targetOrdinal];
        const targetDecoded = after.decoded.find(d=>d.recordOffset===newTarget.offset);
        if (!targetDecoded || targetDecoded.width!==png.width || targetDecoded.height!==png.height || targetDecoded.bpp!==bpp)
          throw new Error('Verifica QRS fallita: il decoder non riconosce la texture sostituita nel formato previsto.');
        for (let i=0;i<png.indices.length;i++) {
          if (targetDecoded.indices[i]!==png.indices[i]) throw new Error('Verifica QRS fallita: gli indici PNG cambiano durante la ricodifica.');
          const pi=png.indices[i], p=pi*4, q=i*4;
          const expectedAlpha=Math.min(255,Math.round(png.palette[p+3]/2)*2);
          if (targetDecoded.rgba[q]!==png.palette[p] || targetDecoded.rgba[q+1]!==png.palette[p+1] ||
              targetDecoded.rgba[q+2]!==png.palette[p+2] || targetDecoded.rgba[q+3]!==expectedAlpha)
            throw new Error('Verifica QRS fallita: la palette ricostruita non coincide con quella PNG.');
        }
        const beforeByOffset=new Map(before.decoded.map(d=>[d.recordOffset,d]));
        const afterByOffset=new Map(after.decoded.map(d=>[d.recordOffset,d]));
        for (let i=0;i<allTextures.length;i++) {
          if (i===targetOrdinal) continue;
          const oldTexture=beforeByOffset.get(allTextures[i].offset);
          const newTexture=afterByOffset.get(afterRecords[i].offset);
          if (oldTexture && !newTexture) throw new Error('Verifica interrotta: una texture vicina non sarebbe più decodificabile.');
          if (oldTexture && newTexture) {
            if (oldTexture.width!==newTexture.width || oldTexture.height!==newTexture.height || oldTexture.bpp!==newTexture.bpp ||
                oldTexture.rgba.length!==newTexture.rgba.length)
              throw new Error('Verifica interrotta: la sostituzione altererebbe la geometria di un’altra texture.');
            for (let j=0;j<oldTexture.rgba.length;j++) if (oldTexture.rgba[j]!==newTexture.rgba[j])
              throw new Error('Verifica interrotta: la palette o i pixel di un’altra texture cambierebbero.');
          }
        }
        const archiveBlob = await this.rebuildCurrentArchiveWithEntry(info.index,rebuiltEntry);
        const parsedArchive = this.archiveType==='AFS'
          ? await this.parseAFSBlob(archiveBlob,'verifica AFS')
          : await this.parsePAKBlob(archiveBlob,'verifica PAK');
        const patchedEntry = parsedArchive.entries[info.index];
        if (!patchedEntry || !patchedEntry.valid || patchedEntry.size!==rebuiltEntry.length)
          throw new Error('Verifica finale dell’archivio fallita: voce sostituita non valida.');
        const ext=this.archiveType.toLowerCase();
        const base=this.clean(this.archiveName||('archivio.'+ext)).replace(/\.(afs|pak)$/i,'');
        const filename=base+'_texture_sostituita.'+ext;
        this.download(archiveBlob,filename);
        const paletteMessage=paletteShared
          ? 'Palette duplicata per non modificare le altre texture che la condividono.'
          : 'Palette sostituita senza modificare altre texture.';
        this.set(`PNG importato e verificato: ${png.width}×${png.height}, ${bpp}-bit. ${paletteMessage}${autoPromoted?' PNG con più di 16 colori: formato promosso automaticamente a 8-bit.':''} Archivio ricostruito ed esportato: ${filename}.`);
      } catch (error) {
        this.set('Sostituzione PNG annullata: ' + error.message);
      }
      this.render();
    }
    idx(v){const n=Math.floor(Number(v));return Number.isFinite(n)?n:-1;}
    count(){return this.entries.length;}
    name(a){const i=this.idx(a.I);return this.names[i]||'';}
    size(a){const i=this.idx(a.I);return this.entries[i]?.size||0;}
    offset(a){const i=this.idx(a.I);return this.entries[i]?.offset||0;}
    search(a){const q=String(a.Q||'').toLowerCase();this.searchResultIndex=this.names.findIndex(n=>n.toLowerCase().includes(q));this.set(this.searchResultIndex<0?'Nessun risultato.':`Risultato: indice ${this.searchResultIndex}.`);}
    result(){return this.searchResultIndex;}
    download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
    clean(n){return String(n||'file.bin').replace(/[\\/:*?"<>|]/g,'_');}
    async exportOne(a){const i=this.idx(a.I),e=this.entries[i];if(!this.afs||!e||!e.valid)return this.set('Indice non valido.');this.download(this.afs.slice(e.offset,e.offset+e.size),this.clean(this.names[i]));this.set('Esportazione avviata.');}
    indexText(csv){const q=csv?',':'\t',quote=s=>csv?'"'+String(s).replace(/"/g,'""')+'"':s;return ['indice'+q+'nome'+q+'offset'+q+'dimensione'+q+'validita',...this.entries.map((e,i)=>[e.index,quote(this.names[i]),e.offset,e.size,e.valid?'OK':'FUORI ARCHIVIO'].join(q))].join('\n');}
    txt(){this.download(new Blob([this.indexText(false)],{type:'text/plain;charset=utf-8'}),'BT3_Web_Modder_indice.txt');this.set('TXT esportato.');}
    csv(){this.download(new Blob([this.indexText(true)],{type:'text/csv;charset=utf-8'}),'BT3_Web_Modder_indice.csv');this.set('CSV esportato.');}
    loadZip(){if(window.JSZip)return Promise.resolve(window.JSZip);if(this.zipPromise)return this.zipPromise;this.zipPromise=new Promise((ok,no)=>{const s=document.createElement('script');s.src=CDN;s.onload=()=>window.JSZip?ok(window.JSZip):no(Error('JSZip non disponibile.'));s.onerror=()=>no(Error('CDN JSZip non raggiungibile.'));document.head.appendChild(s);});return this.zipPromise;}
    async zip(){try{
      if(!this.afs)throw Error('Carica prima AFS.');const total=this.entries.reduce((a,e)=>a+(e.valid?e.size:0),0);
      this.set(`Caricamento JSZip… (${total.toLocaleString()} byte da preparare)`);const Z=await this.loadZip(),z=new Z();
      this.entries.forEach((e,i)=>{if(e.valid)z.file(this.clean(this.names[i]),this.afs.slice(e.offset,e.offset+e.size),{binary:true,compression:'STORE'});});
      const blob=await z.generateAsync({type:'blob',compression:'STORE'},m=>this.set(`Creazione ZIP: ${Math.floor(m.percent)}%`));
      this.download(blob,'BT3_Web_Modder_estratto.zip');this.set(`ZIP pronto: ${blob.size} byte.`);
    }catch(e){this.set('Errore ZIP: '+e.message);}}
    async createAFSFromZIP() {
      try {
        const file = await this.pick('.zip,application/zip,application/x-zip-compressed');
        this.set('Caricamento libreria ZIP…');
        const Z = await this.loadZip();
        const archive = await Z.loadAsync(file);
        const files = Object.keys(archive.files)
          .map(name => archive.files[name])
          .filter(entry => !entry.dir);
        if (!files.length) throw Error('Lo ZIP non contiene file.');
        if (files.length > 0xffffffff) throw Error('Numero di file non supportato dal formato AFS.');

        const n = files.length;
        const tableEnd = 8 + n * 8;
        let cursor = Math.ceil(tableEnd / ALIGN) * ALIGN;
        const records = [];
        for (let i = 0; i < files.length; i++) {
          this.set(`Lettura ZIP: ${i + 1}/${n} — ${files[i].name}`);
          const data = await files[i].async('uint8array');
          if (data.byteLength > 0xffffffff || cursor + data.byteLength > 0x100000000) {
            throw Error('Il formato AFS a 32 bit non può superare 4 GiB di offset/dimensione.');
          }
          records.push({ name: files[i].name, data, offset: cursor, size: data.byteLength });
          cursor = Math.ceil((cursor + data.byteLength) / ALIGN) * ALIGN;
        }

        const header = new Uint8Array(tableEnd);
        header.set([65, 70, 83, 0]);
        const view = new DataView(header.buffer);
        view.setUint32(4, n, true);
        for (let i = 0; i < n; i++) {
          view.setUint32(8 + i * 8, records[i].offset, true);
          view.setUint32(12 + i * 8, records[i].size, true);
        }

        const parts = [header];
        let position = tableEnd;
        for (let i = 0; i < records.length; i++) {
          const rec = records[i];
          if (rec.offset > position) parts.push(new Uint8Array(rec.offset - position));
          parts.push(rec.data);
          position = rec.offset + rec.size;
          this.set(`Assemblaggio AFS: ${i + 1}/${n}`);
        }
        const blob = new Blob(parts, { type: 'application/octet-stream' });
        this.download(blob, file.name.replace(/\.zip$/i, '') + '.afs');
        this.set(`Nuovo AFS creato: ${n} file, ${blob.size.toLocaleString()} byte. I nomi restano nel file ZIP originale, non nella tabella AFS.`);
      } catch (e) {
        this.set('Creazione AFS da ZIP non riuscita: ' + e.message);
      }
      this.render();
    }

    async replace(a){try{
      if(!this.afs || this.archiveType !== 'AFS')throw Error('La sostituzione è disponibile solo per AFS.');const i=this.idx(a.I),old=this.entries[i];if(!old||!old.valid)throw Error('Indice non valido.');
      const f=await this.pick('*/*'),sorted=[...this.entries].sort((x,y)=>x.offset-y.offset);let prev=0;
      for(const e of sorted){if(!e.valid||e.offset<prev)throw Error('Voci sovrapposte o incomplete: ricostruzione annullata.');prev=e.offset+e.size;}
      if(f.size<=old.size){
        const parts=[];let cur=0;
        for(const e of sorted){if(e.offset>cur)parts.push(this.afs.slice(cur,e.offset));if(e.index===i){parts.push(f);if(old.size>f.size)parts.push(new Uint8Array(old.size-f.size));}else parts.push(this.afs.slice(e.offset,e.offset+e.size));cur=e.offset+e.size;}
        if(cur<this.afs.size)parts.push(this.afs.slice(cur));this.download(new Blob(parts),'BT3_Web_Modder_sostituito.afs');
        this.set('Sostituzione completata: dimensione originale mantenuta con padding zero.');return;
      }
      const n=this.entries.length,tableEnd=8+n*8;let cur=Math.ceil(tableEnd/ALIGN)*ALIGN;const head=new Uint8Array(tableEnd),dv=new DataView(head.buffer);
      head.set([65,70,83,0]);dv.setUint32(4,n,true);const ne=[];
      for(let j=0;j<n;j++){const sz=j===i?f.size:this.entries[j].size;cur=Math.ceil(cur/ALIGN)*ALIGN;if(cur>0xffffffff||sz>0xffffffff||cur+sz>0x100000000)throw Error('Limite offset/dimensione AFS superato.');ne[j]={offset:cur,size:sz};dv.setUint32(8+j*8,cur,true);dv.setUint32(12+j*8,sz,true);cur+=sz;}
      const parts=[head];let out=tableEnd;
      for(let j=0;j<n;j++){const target=ne[j].offset;if(target>out)parts.push(new Uint8Array(target-out));parts.push(j===i?f:this.afs.slice(this.entries[j].offset,this.entries[j].offset+this.entries[j].size));out=target+ne[j].size;}
      this.download(new Blob(parts),'BT3_Web_Modder_ricostruito.afs');this.set('AFS ricostruito: tabella aggiornata e offset allineati a 2048. AFL non modificato.');
    }catch(e){this.set('Sostituzione annullata: '+e.message);}}

    chooseAFS() { return this.loadAFS(); }
    choosePAK() { return this.loadPAK(); }
    openNestedArchive() { return this.openSelectedEntry(); }
    backArchive() { return this.goBackArchive(); }
    chooseAFL() { return this.loadAFL(); }
    extract(args) { return this.exportOne({I: args.INDEX}); }
    exportZIP() { return this.zip(); }
    getName(args) { return this.name({I: args.INDEX}); }
    getSize(args) { return this.size({I: args.INDEX}); }
    getCount() { return this.count(); }
    getSearchResult() { return this.result(); }
    getList() {
      return JSON.stringify(this.entries.map((e,i)=>({
        indice:e.index, nomeAFL:this.names[i] || '', nomeOriginalAFS:null,
        offset:e.offset, dimensione:e.size, valido:e.valid
      })));
    }
    searchExact(args) {
      const q = String(args.NAME || '').toLowerCase();
      this.searchResultIndex = this.names.findIndex(n => String(n).toLowerCase() === q);
      this.set(this.searchResultIndex >= 0 ? 'Trovato indice ' + this.searchResultIndex : 'File non trovato');
      if (this.panel) {
        const input = this.panel.querySelector('[data-q]');
        if (input) { input.value = args.NAME || ''; this.render(); }
      }
    }
    btn(label, fn) {
      const b=document.createElement('button'); b.textContent=label;
      Object.assign(b.style,{padding:'8px',borderRadius:'6px',background:'#294967',color:'white',border:'1px solid #789'});
      b.onclick=fn; return b;
    }
    openExplorer() {
      if (!this.panel) this.createPanel();
      this.panel.style.display='flex'; this.render();
    }
    createPanel() {
      const p=document.createElement('div'); this.panel=p;
      Object.assign(p.style,{position:'fixed',inset:'5%',zIndex:'2147483646',display:'flex',flexDirection:'column',background:'#101923',color:'#edf4fb',border:'1px solid #496987',borderRadius:'12px',padding:'12px',fontFamily:'Arial,sans-serif',boxShadow:'0 12px 40px #0008'});
      const top=document.createElement('div');
      Object.assign(top.style,{display:'flex',gap:'8px',alignItems:'center',marginBottom:'8px',flexWrap:'wrap'});
      const title=document.createElement('b'); title.textContent='BT3 Web Modder — Diagnostica archivio'; title.style.flex='1';
      const q=document.createElement('input'); q.type='search'; q.placeholder='Cerca nome o elemento'; q.setAttribute('data-q','1');
      const close=this.btn('Chiudi',()=>p.style.display='none'); top.append(title,q,close);
      const heads=document.createElement('div'); heads.textContent='NOME / ELEMENTO                         TIPO / DETTAGLI';
      Object.assign(heads.style,{display:'grid',gridTemplateColumns:'1fr 1fr',padding:'9px',background:'#20364b',fontWeight:'bold',gap:'8px'});
      const list=document.createElement('div'); list.setAttribute('data-list','1');
      Object.assign(list.style,{overflowY:'auto',flex:'1',minHeight:'80px',border:'1px solid #354b60'});
      const foot=document.createElement('div');
      Object.assign(foot.style,{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'8px'});
      foot.append(this.btn('Apri AFS',()=>this.loadAFS()),
        this.btn('Apri PAK',()=>this.loadPAK()),
        this.btn('Apri selezionato',()=>this.openSelectedEntry()),
        this.btn('Indietro',()=>this.goBackArchive()),
        this.btn('Estrai selezionato',()=>this.extractSelected()),
        this.btn('Esporta ZIP',()=>this.exportZIP()),
        this.btn('Crea AFS da ZIP',()=>this.createAFSFromZIP()));
      const st=document.createElement('small'); st.setAttribute('data-status','1'); st.style.marginTop='7px';
      p.append(top,heads,list,foot,st); document.body.appendChild(p);
      q.addEventListener('input',()=>this.render());
    }
    render() {
      if(!this.panel) return;
      const list=this.panel.querySelector('[data-list]'), q=this.panel.querySelector('[data-q]'),
        st=this.panel.querySelector('[data-status]'), term=q?q.value.toLowerCase().trim():'';
      const title=this.panel.querySelector('b');
      if(title) title.textContent=`BT3 Web Modder — ${this.archiveType}: ${this.archiveName || 'nessun archivio'}`;
      list.replaceChildren();
      this.entries.filter(e=>!term||String(this.names[e.index]||'').toLowerCase().includes(term)).forEach(e=>{
        const r=document.createElement('div');
        Object.assign(r.style,{display:'grid',gridTemplateColumns:'1fr auto',gap:'8px',padding:'9px',borderBottom:'1px solid #2b4053',cursor:'pointer'});
        const l=document.createElement('div'); l.textContent=this.names[e.index]||`elemento_${String(e.index).padStart(4,'0')}.bin`;
        const right=document.createElement('div'); right.textContent=this.archiveType==='PAK'?'Voce PAK':'Voce AFS';
        Object.assign(right.style,{color:'#aab8c5',fontStyle:'italic'});
        const meta=document.createElement('small');
        meta.textContent='Indice '+e.index+' · '+e.size.toLocaleString()+' byte · offset '+e.offset.toLocaleString();
        Object.assign(meta.style,{gridColumn:'1 / -1',color:'#8fa8bf'});
        r.append(l,right,meta);
        if(this.selectedIndex===e.index) {
          r.style.background='#294967';
          const cached=this.qrsCache.get(e.index);
          if(cached && typeof cached.then !== 'function' && cached) this.showQRSPreview(r,cached);
          else if(cached === null) {
            const no=document.createElement('small'); no.textContent='Nessun candidato QRS trovato'; no.style.color='#9aabba'; no.style.gridColumn='1 / -1'; r.appendChild(no);
          } else if(!cached || (cached && typeof cached.then === 'function')) {
            const wait=document.createElement('small'); wait.textContent='Controllo anteprima QRS…'; wait.style.color='#9aabba'; wait.style.gridColumn='1 / -1'; r.appendChild(wait);
          }
        }
        r.onclick=()=>{
          this.selectedIndex=e.index;
          this.render();
          this.inspectQRS(e.index).then(info=>{ if(this.selectedIndex===e.index){ this.qrsPreview=info; this.render(); } })
            .catch(err=>{ this.qrsCache.set(e.index,null); this.set('Controllo QRS non riuscito: '+err.message); this.render(); });
        };
        r.ondblclick=()=>{this.selectedIndex=e.index;this.openSelectedEntry();};
        list.appendChild(r);
      });
      if(st) st.textContent=this.status+' | '+list.children.length+'/'+this.entries.length+' voci | livelli annidati: '+this.archiveStack.length;
    }
    async extractSelected() {
      if(this.selectedIndex<0){this.set('Seleziona prima una riga');this.render();return;}
      await this.exportOne({I:this.selectedIndex}); this.render();
    }
    async exportAll() {
      if(!this.afs){this.set('Carica prima un AFS');return;}
      let ok=0,skip=0;
      for(let i=0;i<this.entries.length;i++){
        const e=this.entries[i];
        if(!e.valid){skip++;continue;}
        this.download(this.afs.slice(e.offset,e.offset+e.size),this.clean(this.names[i]));
        ok++; await new Promise(r=>setTimeout(r,250));
      }
      this.set('Download avviati: '+ok+'; saltati: '+skip+'. Il browser potrebbe chiedere di consentire download multipli.');
    }

    state(){return this.status;}
  }
  Scratch.extensions.register(new BT3WebModder());
})(Scratch);
