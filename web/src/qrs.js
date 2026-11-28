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
      indices: decoded.indices, rgba, palette: paletteRgba,
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

  function encodeQrs4Texture(indices, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (!width || !height || (width & 1) || (height & 3))
      throw new RangeError('Il formato QRS 4-bit richiede larghezza pari e altezza multipla di 4.');
    const pixelCount = width * height;
    if (!Number.isSafeInteger(pixelCount) || !indices || indices.length !== pixelCount)
      throw new RangeError('Numero di indici QRS 4-bit non coerente con le dimensioni.');
    const dwordWidth = width >>> 1;
    const dwordHeight = height >>> 2;
    const pixelStride = Math.max(1, Math.ceil(width / 128));
    const dwordStride = Math.max(1, Math.ceil(dwordWidth / 64));
    let maxByte = -1, maxDword = -1;
    const addresses = new Array(pixelCount);
    const used = new Set();
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const value = Number(indices[index]);
      if (!Number.isInteger(value) || value < 0 || value > 15)
        throw new RangeError('Indice QRS 4-bit fuori intervallo alla posizione ' + index + '.');
      const address = scratchNibbleAddress4(x, y, pixelStride, 0);
      const key = address.byteOffset * 2 + (address.highNibble ? 1 : 0);
      if (used.has(key)) throw new Error('Collisione nella mappa inversa QRS 4-bit.');
      used.add(key);
      addresses[index] = address;
      if (address.byteOffset > maxByte) maxByte = address.byteOffset;
    }
    const dwordMap = new Array(dwordWidth * dwordHeight);
    const dwordUsed = new Set();
    for (let y = 0; y < dwordHeight; y++) for (let x = 0; x < dwordWidth; x++) {
      const p = scratchDwordIndex404780(x, y, dwordStride, 0);
      if (dwordUsed.has(p)) throw new Error('Collisione DWORD nella mappa inversa QRS 4-bit.');
      dwordUsed.add(p);
      dwordMap[y * dwordWidth + x] = p;
      if (p > maxDword) maxDword = p;
    }
    const scratch = new Uint8Array(Math.max(maxByte + 1, (maxDword + 1) * 4));
    for (let i = 0; i < pixelCount; i++) {
      const a = addresses[i], value = Number(indices[i]);
      const old = scratch[a.byteOffset];
      scratch[a.byteOffset] = a.highNibble
        ? ((old & 0x0F) | (value << 4))
        : ((old & 0xF0) | value);
    }
    const packed = new Uint8Array(pixelCount >>> 1);
    for (let i = 0; i < dwordMap.length; i++) {
      const from = dwordMap[i] * 4, to = i * 4;
      if (from + 4 > scratch.length) throw new Error('Mappa QRS 4-bit fuori dal buffer scratch.');
      packed.set(scratch.subarray(from, from + 4), to);
    }
    const check = decodeQrs4Texture(packed, width, height).indices;
    for (let i = 0; i < pixelCount; i++) if (check[i] !== Number(indices[i]))
      throw new Error('Verifica inversa QRS 4-bit fallita alla posizione ' + i + '.');
    return packed;
  }

  function encodeQrs8Block(indices, width, height) {
    const dwordWidth = width >>> 1;
    const dwordHeight = height >>> 1;
    const pixelStride = Math.max(1, Math.ceil(width / 64));
    const dwordStride = Math.max(1, Math.ceil(dwordWidth / 64));
    let maxByte = -1, maxDword = -1;
    const addresses = new Array(width * height);
    const used = new Set();
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x, value = Number(indices[i]);
      if (!Number.isInteger(value) || value < 0 || value > 255)
        throw new RangeError('Indice QRS 8-bit fuori intervallo alla posizione ' + i + '.');
      const address = scratchByteOffset8(x, y, pixelStride, 0);
      if (used.has(address)) throw new Error('Collisione nella mappa inversa QRS 8-bit.');
      used.add(address);
      addresses[i] = address;
      if (address > maxByte) maxByte = address;
    }
    const dwordMap = new Array(dwordWidth * dwordHeight);
    const dwordUsed = new Set();
    for (let y = 0; y < dwordHeight; y++) for (let x = 0; x < dwordWidth; x++) {
      const p = scratchDwordIndex404780(x, y, dwordStride, 0);
      if (dwordUsed.has(p)) throw new Error('Collisione DWORD nella mappa inversa QRS 8-bit.');
      dwordUsed.add(p);
      dwordMap[y * dwordWidth + x] = p;
      if (p > maxDword) maxDword = p;
    }
    const scratch = new Uint8Array(Math.max(maxByte + 1, (maxDword + 1) * 4));
    for (let i = 0; i < addresses.length; i++) scratch[addresses[i]] = Number(indices[i]);
    const packed = new Uint8Array(width * height);
    for (let i = 0; i < dwordMap.length; i++) {
      const from = dwordMap[i] * 4, to = i * 4;
      if (from + 4 > scratch.length) throw new Error('Mappa QRS 8-bit fuori dal buffer scratch.');
      packed.set(scratch.subarray(from, from + 4), to);
    }
    const check = decodeQrs8Block(packed, width, height);
    for (let i = 0; i < indices.length; i++) if (check[i] !== Number(indices[i]))
      throw new Error('Verifica inversa QRS 8-bit fallita alla posizione ' + i + '.');
    return packed;
  }

  function encodeQrs8Texture(indices, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (!width || !height || (width & 1) || (height & 1))
      throw new RangeError('Il formato QRS 8-bit richiede larghezza e altezza pari.');
    if (!indices || indices.length !== width * height)
      throw new RangeError('Numero di indici QRS 8-bit non coerente con le dimensioni.');
    const out = new Uint8Array(width * height);
    for (let y0 = 0; y0 < height; y0 += 64) {
      const blockHeight = Math.min(64, height - y0);
      if (blockHeight & 1) throw new RangeError('L’ultima fascia QRS 8-bit deve avere altezza pari.');
      const start = y0 * width;
      const block = indices.subarray ? indices.subarray(start, start + width * blockHeight)
        : Array.prototype.slice.call(indices, start, start + width * blockHeight);
      out.set(encodeQrs8Block(block, width, blockHeight), start);
    }
    const check = decodeQrs8Texture(out, width, height).indices;
    for (let i = 0; i < check.length; i++) if (check[i] !== Number(indices[i]))
      throw new Error('Verifica inversa QRS 8-bit fallita alla posizione ' + i + '.');
    return out;
  }

  const api = Object.freeze({
    scratchByteOffset8, scatter8, gather8,
    scratchNibbleAddress4, scatter4, gather4,
    scratchDwordIndex404780, bytesToDwordsLE, finalStage404780, scatterDwords404600,
    decode4SinglePassExplorer, plan4MultiPassExplorer,
    parseQrsPak, decodeQrsTexture, decodeAllQrsTextures, decodeQrs4Texture, decodeQrs8Texture, encodeQrs4Texture, encodeQrs8Texture,
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