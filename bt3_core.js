// BT3 Desktop Modder v0.1 — Motore Standalone Completo (adattato da BT3_Web_Modder.js)
(function (root) {
  'use strict';
  const T4119A0 = Object.freeze([
    0,1,4,5,16,17,20,21,2,3,6,7,18,19,22,23,
    8,9,12,13,24,25,28,29,10,11,14,15,26,27,30,31,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1
  ]);
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

  function gatherPacked4_405D20(scratch, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    const pageRowStride = Math.max(1, Math.ceil(width / 128));
    const pixelCount = width * height;
    if (!Number.isSafeInteger(pixelCount)) throw new RangeError('Dimensioni 4-bit troppo grandi.');
    const packed = new Uint8Array(Math.ceil(pixelCount / 2));
    let writeByte = 0;
    let highHalf = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
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

  function scatterDwords404600(sourceBytes, widthDwords, heightDwords, options) {
    widthDwords = int(widthDwords, 'widthDwords');
    heightDwords = int(heightDwords, 'heightDwords');
    const pixelWidth = widthDwords * 2;
    const byte8RowStride = Math.max(1, Math.ceil(pixelWidth / 64));
    const nibble4RowStride = Math.max(1, Math.ceil(pixelWidth / 128));
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

  function decodeQrs4Texture(source, width, height) {
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
    const indices = unpackPaletteIndices4(packed).subarray(0, pixelCount);
    return Object.freeze({
      indices,
      passCount: 1,
      mode: '0x404600-0x405D20',
      passReports: [],
      blocks: []
    });
  }

  function decodeQrs8Block(source, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (!width || !height || (width & 1) || (height & 1))
      throw new RangeError('Il percorso QRS 8-bit richiede larghezza e altezza pari.');
    if (source.length < width * height) throw new RangeError('Blocco QRS 8-bit troncato.');
    const pageRowStride = Math.max(1, Math.ceil(width / 64));
    const scratch = scatterDwords404600(source, width >>> 1, height >>> 1);
    return gather8(scratch, {
      xStart: 0, yStart: 0, width, height,
      rowStride2: pageRowStride * 2, base64: 0
    });
  }

  function decodeQrs8Texture(source, width, height) {
    width = int(width, 'width');
    height = int(height, 'height');
    if (source.length < width * height) throw new RangeError('Texture QRS 8-bit troncata.');
    const indices = new Uint8Array(width * height);
    const blocks = [];
    for (let y0 = 0; y0 < height; y0 += 64) {
      const blockHeight = Math.min(64, height - y0);
      if (blockHeight & 1) throw new RangeError('L’ultima fascia QRS 8-bit deve avere altezza pari.');
      const sourceOffset = y0 * width;
      const sourceLength = width * blockHeight;
      const block = source.subarray(sourceOffset, sourceOffset + sourceLength);
      indices.set(decodeQrs8Block(block, width, blockHeight), sourceOffset);
      blocks.push(Object.freeze({ yStart: y0, height: blockHeight }));
    }
    return Object.freeze({ indices, blocks: Object.freeze(blocks) });
  }

  function csm1PaletteIndex(index) {
    return (index & 0xE7) | ((index & 0x08) << 1) | ((index & 0x10) >>> 1);
  }

  function resolveQrsPaletteStorageMode(paletteRecord, options) {
    const count = paletteRecord && paletteRecord.paletteCount;
    const requested = options && options.paletteStorageMode != null
      ? String(options.paletteStorageMode).toLowerCase()
      : 'auto';
    if (requested === 'auto') return count === 256 ? 'csm1' : 'linear';
    return requested;
  }

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
      const sourceIndex = storageMode === 'csm1' ? csm1PaletteIndex(i) : i;
      const p = start + sourceIndex * 4;
      out[i * 4] = bytes[p];
      out[i * 4 + 1] = bytes[p + 1];
      out[i * 4 + 2] = bytes[p + 2];
      out[i * 4 + 3] = gsAlphaToRgbaByte(bytes[p + 3]);
    }
    return out;
  }

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

    return Object.freeze(records.map((record, index) => {
      if (record.isPalette) {
        return Object.freeze({ ...record, palette: null, paletteLinkReason: 'descriptor' });
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
      return Object.freeze({ ...record, palette, paletteLinkReason });
    }));
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
    if (!palette || !palette.paletteCount) throw new Error('Il record QRS successivo non è una palette supportata.');
    const bpp = palette.paletteCount === 16 ? 4 : 8;
    const width = textureRecord.baseWidth * 2;
    const height = textureRecord.baseHeight * (bpp === 4 ? 4 : 2);
    const sourceBytes = bpp === 4 ? Math.ceil(width * height / 2) : width * height;
    if (sourceBytes !== textureRecord.payloadBytes) throw new Error('Geometria QRS non coerente con il payload.');
    const source = bytes.subarray(textureRecord.payloadOffset, textureRecord.payloadOffset + sourceBytes);
    const decoded = bpp === 4 ? decodeQrs4Texture(source, width, height) : decodeQrs8Texture(source, width, height);
    const paletteRgba = paletteBytesToRgba(bytes, palette, options);
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
      paletteOffset: palette.offset, paletteLinkReason: textureRecord.paletteLinkReason,
      bpp, width, height, baseWidth: textureRecord.baseWidth, baseHeight: textureRecord.baseHeight,
      sourceBytes, paletteCount: palette.paletteCount, indices: decoded.indices, rgba,
      passCount: decoded.passCount || 1, decoderMode: decoded.mode || 'QRS'
    });
  }

  function decodeAllQrsTexturesPaired(bytes, options) {
    const pak = parseQrsPakPairs(bytes, options);
    const decoded = [];
    const skipped = [];
    for (const entry of pak.entries) for (const record of entry.records) {
      if (record.isPalette) continue;
      if (!record.palette) { skipped.push({ offset: record.offset, reason: 'next-qrs-not-palette' }); continue; }
      try { decoded.push(decodeQrsTexturePaired(bytes, record, options)); }
      catch (err) { skipped.push({ offset: record.offset, reason: err.message }); }
    }
    return Object.freeze({ pak, decoded: Object.freeze(decoded), skipped: Object.freeze(skipped) });
  }

  root.BT3_WEB_MODDER_QRS_STAGE2_4_8BIT_IDPAIRS = Object.freeze({
    parseQrsPakPairs, decodeAllQrsTexturesPaired, csm1PaletteIndex
  });
})(window);

// =========================================================================
// CLASSE PRINCIPALE BT3 DESKTOP MODDER v0.1 (Interfaccia Nero/Verde)
// =========================================================================
const ALIGN = 2048;
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

class BT3DesktopModder {
  constructor() {
    this.afs = null; this.afl = null; this.entries = []; this.names = [];
    this.archiveType = 'AFS'; this.archiveName = ''; this.archiveStack = [];
    this.status = 'In attesa di un archivio AFS o PAK.';
    this.zipPromise = null; this.selectedIndex = -1; this.panel = null; this.qrsCache = new Map();
  }

  set(s) {
    this.status = String(s);
    const logBox = document.getElementById('cli-log');
    if (logBox) {
      logBox.textContent = `[STATUS] ${this.status}`;
    }
  }

  pick(accept = '*/*') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (file) resolve(file);
        else reject(new Error('Nessun file selezionato.'));
      };
      input.click();
    });
  }

  async loadAFS() {
    try {
      const f = await this.pick('.afs,application/octet-stream');
      const h = new Uint8Array(await f.slice(0, 8).arrayBuffer());
      if (h.length < 8 || h[0] !== 65 || h[1] !== 70 || h[2] !== 83 || h[3] !== 0) throw Error('Header AFS non valido.');
      const n = new DataView(h.buffer).getUint32(4, true), end = 8 + n * 8;
      if (end > f.size) throw Error('Tabella AFS incompleta.');
      const d = new DataView(await f.slice(8, end).arrayBuffer());
      this.entries = Array.from({ length: n }, (_, i) => {
        const o = d.getUint32(i * 8, true), s = d.getUint32(i * 8 + 4, true);
        return { index: i, offset: o, size: s, valid: o <= f.size && s <= f.size - o };
      });
      this.names = this.entries.map((e, i) => `file_${String(i).padStart(4, '0')}.bin`);
      this.afs = f; this.afl = null; this.archiveType = 'AFS'; this.archiveName = f.name; this.archiveStack = [];
      this.selectedIndex = -1; this.qrsCache.clear();
      this.set(`AFS caricato: ${n} voci (${f.name}). Ora puoi aprire l'archivio.`);
      this.render();
    } catch (e) { this.set('Errore AFS: ' + e.message); }
  }

  async parseAFSBlob(blob, label = 'archivio AFS') {
    const h = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    if (h.length < 8 || h[0] !== 65 || h[1] !== 70 || h[2] !== 83 || h[3] !== 0) throw Error('Firma AFS non valida.');
    const n = new DataView(h.buffer).getUint32(4, true), tableEnd = 8 + n * 8;
    const d = new DataView(await blob.slice(8, tableEnd).arrayBuffer());
    const entries = Array.from({ length: n }, (_, i) => {
      const offset = d.getUint32(i * 8, true), size = d.getUint32(i * 8 + 4, true);
      return { index: i, offset, size, valid: offset <= blob.size && size <= blob.size - offset };
    });
    return { type: 'AFS', entries, names: entries.map((e, i) => `file_${String(i).padStart(4, '0')}.bin`), label };
  }

  async parsePAKBlob(blob, label = 'archivio PAK') {
    const h = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    const n = new DataView(h.buffer).getUint32(0, true);
    if (!n || n > 1000000) throw Error('Numero di voci PAK non plausibile.');
    const tableEnd = 4 + (n + 1) * 4;
    if (tableEnd > blob.size) throw Error('Tabella offset PAK incompleta.');
    const raw = new DataView(await blob.slice(4, tableEnd).arrayBuffer());
    const offsets = Array.from({ length: n + 1 }, (_, i) => raw.getUint32(i * 4, true));
    if (offsets[0] < tableEnd || offsets[0] % 16 !== 0) throw Error('Header PAK non riconosciuto.');
    const entries = Array.from({ length: n }, (_, i) => ({
      index: i, offset: offsets[i], size: offsets[i + 1] - offsets[i], valid: true
    }));
    return { type: 'PAK', entries, names: entries.map((e, i) => `elemento_${String(i).padStart(4, '0')}.bin`), label };
  }

  async loadPAK() {
    try {
      const f = await this.pick('.pak,application/octet-stream');
      const parsed = await this.parsePAKBlob(f, f.name);
      this.afs = f; this.afl = null; this.entries = parsed.entries; this.names = parsed.names;
      this.archiveType = 'PAK'; this.archiveName = f.name; this.archiveStack = [];
      this.selectedIndex = -1; this.qrsCache.clear();
      this.set(`PAK caricato: ${this.entries.length} voci (${f.name}).`);
      this.render();
    } catch (e) { this.set('Errore PAK: ' + e.message); this.render(); }
  }

  async openSelectedEntry() {
    const i = this.selectedIndex, e = this.entries[i];
    if (!e || !e.valid || !this.afs) { this.set('Seleziona una voce valida.'); this.render(); return; }
    try {
      const blob = this.afs.slice(e.offset, e.offset + e.size);
      let parsed = null;
      try { parsed = await this.parseAFSBlob(blob, this.names[i]); } catch (_) {}
      if (!parsed) { try { parsed = await this.parsePAKBlob(blob, this.names[i]); } catch (_) {} }
      if (!parsed) { this.set('La voce selezionata non è un archivio AFS/PAK annidato.'); this.render(); return; }
      this.archiveStack.push({
        afs: this.afs, afl: this.afl, entries: this.entries, names: this.names,
        archiveType: this.archiveType, archiveName: this.archiveName, selectedIndex: this.selectedIndex
      });
      this.afs = blob; this.afl = null; this.entries = parsed.entries; this.names = parsed.names;
      this.archiveType = parsed.type; this.archiveName = parsed.label || this.names[i];
      this.selectedIndex = -1; this.qrsCache.clear();
      this.set(`${parsed.type} annidato aperto: ${parsed.entries.length} voci.`);
      this.render();
    } catch (err) { this.set('Apertura annidata non riuscita: ' + err.message); this.render(); }
  }

  goBackArchive() {
    const prev = this.archiveStack.pop();
    if (!prev) { this.set('Sei già al livello archivio principale.'); this.render(); return; }
    Object.assign(this, prev);
    this.qrsCache.clear();
    this.set(`Tornato a ${this.archiveType}: ${this.archiveName}.`);
    this.render();
  }

  async loadAFL() {
    try {
      if (!this.afs || this.archiveType !== 'AFS') throw Error('Carica prima un AFS.');
      const f = await this.pick('.afl,application/octet-stream');
      if (f.size < 16) throw Error('AFL troppo corto.');
      const h = new Uint8Array(await f.slice(0, 16).arrayBuffer());
      if (h[0] !== 65 || h[1] !== 70 || h[2] !== 76 || h[3] !== 0) throw Error('Header AFL non valido.');
      const n = new DataView(h.buffer).getUint32(12, true);
      if (16 + n * 32 > f.size) throw Error('AFL incompleto.');
      const b = new Uint8Array(await f.slice(16, 16 + n * 32).arrayBuffer()), dec = new TextDecoder();
      const names = Array.from({ length: n }, (_, i) => {
        const r = b.slice(i * 32, (i + 1) * 32);
        let z = r.indexOf(0); if (z < 0) z = 32;
        return dec.decode(r.slice(0, z)).trim() || `file_${String(i).padStart(4, '0')}.bin`;
      });
      this.afl = f;
      this.names = this.entries.map((e, i) => names[i] || `file_${String(i).padStart(4, '0')}.bin`);
      this.set(`AFL caricato: ${n} nomi associati.`);
      this.render();
    } catch (e) { this.set('Errore AFL: ' + e.message); }
  }

  async inspectQRS(index) {
    const e = this.entries[index];
    if (!this.afs || !e || !e.valid) return null;
    if (this.qrsCache.has(index)) return this.qrsCache.get(index);
    const pending = (async () => {
      const bytes = new Uint8Array(await this.afs.slice(e.offset, e.offset + e.size).arrayBuffer());
      const decoder = window.BT3_WEB_MODDER_QRS_STAGE2_4_8BIT_IDPAIRS;
      const dataOffset = 16;
      const fakePak = new Uint8Array(dataOffset + bytes.length);
      const fakeView = new DataView(fakePak.buffer);
      fakeView.setUint32(0, 1, true); fakeView.setUint32(4, dataOffset, true); fakeView.setUint32(8, dataOffset + bytes.length, true);
      fakePak.set(bytes, dataOffset);
      const result = decoder.decodeAllQrsTexturesPaired(fakePak);
      const previews = result.decoded.slice(0, 48).map(d => ({
        index, textureOffset: d.recordOffset - dataOffset, paletteOffset: d.paletteOffset - dataOffset,
        width: d.width, height: d.height, bpp: d.bpp, paletteColors: d.paletteCount,
        rgba: new Uint8ClampedArray(d.rgba), decoder: d.bpp + '-bit indexed + mapper 0x404780'
      }));
      this.set(`QRS: ${result.decoded.length} texture decodificate, ${result.skipped.length} saltate.`);
      return previews.length ? previews : null;
    })();
    this.qrsCache.set(index, pending);
    const res = await pending;
    this.qrsCache.set(index, res);
    return res;
  }

  showQRSPreview(container, list) {
    if (!list) return;
    for (const info of list) {
      const wrap = document.createElement('div');
      Object.assign(wrap.style, {
        gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px', background: '#090C10', border: '1px solid #2EA043', borderRadius: '6px', flexWrap: 'wrap'
      });
      const canvas = document.createElement('canvas');
      canvas.width = info.width; canvas.height = info.height;
      const scale = Math.max(1, Math.min(4, Math.floor(256 / info.width)));
      canvas.style.width = Math.min(256, info.width * scale) + 'px';
      canvas.style.height = Math.max(16, Math.round(parseInt(canvas.style.width, 10) * info.height / info.width)) + 'px';
      canvas.style.imageRendering = 'pixelated'; canvas.style.background = '#0D1117';
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(info.width, info.height);
      img.data.set(info.rgba);
      ctx.putImageData(img, 0, 0);

      const details = document.createElement('small');
      details.style.color = '#3FB950';
      details.textContent = `${info.decoder} · ${info.width}×${info.height} · ${info.paletteColors} colori`;

      const expBtn = this.btn('Esporta PNG', () => this.exportQRSPreview(info));
      wrap.addEventListener('click', ev => ev.stopPropagation());
      wrap.append(canvas, details, expBtn);
      container.appendChild(wrap);
    }
  }

  exportQRSPreview(info) {
    const canvas = document.createElement('canvas'); canvas.width = info.width; canvas.height = info.height;
    const ctx = canvas.getContext('2d'); const image = ctx.createImageData(info.width, info.height);
    image.data.set(info.rgba); ctx.putImageData(image, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const name = this.clean(this.names[info.index] || `qrs_${info.index}`).replace(/\.[^.]+$/, '') + `_QRS.png`;
      this.download(blob, name);
      this.set(`PNG esportato: ${name}`);
    }, 'image/png');
  }

  download(blob, name) {
    const u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  }

  clean(n) { return String(n || 'file.bin').replace(/[\/:*?"<>|]/g, '_'); }

  loadZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (this.zipPromise) return this.zipPromise;
    this.zipPromise = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = CDN;
      s.onload = () => window.JSZip ? ok(window.JSZip) : no(Error('JSZip non disponibile.'));
      s.onerror = () => no(Error('CDN JSZip non raggiungibile.'));
      document.head.appendChild(s);
    });
    return this.zipPromise;
  }

  async exportZIP() {
    try {
      if (!this.afs) throw Error('Carica prima un archivio.');
      const Z = await this.loadZip(), z = new Z();
      this.entries.forEach((e, i) => {
        if (e.valid) z.file(this.clean(this.names[i]), this.afs.slice(e.offset, e.offset + e.size), { binary: true, compression: 'STORE' });
      });
      const blob = await z.generateAsync({ type: 'blob', compression: 'STORE' }, m => this.set(`Creazione ZIP: ${Math.floor(m.percent)}%`));
      this.download(blob, 'BT3_Desktop_Modder_estratto.zip');
      this.set(`ZIP esportato: ${blob.size.toLocaleString()} byte.`);
    } catch (e) { this.set('Errore ZIP: ' + e.message); }
  }

  async createAFSFromZIP() {
    try {
      const file = await this.pick('.zip,application/zip');
      const Z = await this.loadZip();
      const archive = await Z.loadAsync(file);
      const files = Object.keys(archive.files).map(name => archive.files[name]).filter(entry => !entry.dir);
      if (!files.length) throw Error('Lo ZIP è vuoto.');

      const n = files.length, tableEnd = 8 + n * 8;
      let cursor = Math.ceil(tableEnd / ALIGN) * ALIGN;
      const records = [];
      for (let i = 0; i < files.length; i++) {
        this.set(`Lettura ZIP: ${i + 1}/${n} — ${files[i].name}`);
        const data = await files[i].async('uint8array');
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

      const parts = [header]; let position = tableEnd;
      for (const rec of records) {
        if (rec.offset > position) parts.push(new Uint8Array(rec.offset - position));
        parts.push(rec.data); position = rec.offset + rec.size;
      }
      const blob = new Blob(parts, { type: 'application/octet-stream' });
      this.download(blob, file.name.replace(/\.zip$/i, '') + '.afs');
      this.set(`Nuovo AFS creato: ${n} file (${blob.size.toLocaleString()} byte).`);
    } catch (e) { this.set('Errore creazione AFS: ' + e.message); }
  }

  btn(label, fn) {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      padding: '8px 12px', borderRadius: '4px', background: '#161B22',
      color: '#00E676', border: '1px solid #2EA043', cursor: 'pointer', fontWeight: 'bold'
    });
    b.onmouseenter = () => { b.style.background = '#2EA043'; b.style.color = '#0D1117'; };
    b.onmouseleave = () => { b.style.background = '#161B22'; b.style.color = '#00E676'; };
    b.onclick = fn;
    return b;
  }

  openExplorer() {
    if (!this.afs) {
      this.set('[ERRORE] Importa prima un file .AFS o .PAK prima di aprire l’archivio.');
      return;
    }
    if (!this.panel) this.createPanel();
    this.panel.style.display = 'flex';
    this.render();
  }

  createPanel() {
    const p = document.createElement('div'); this.panel = p;
    Object.assign(p.style, {
      position: 'fixed', inset: '4%', zIndex: '9999', display: 'flex', flexDirection: 'column',
      background: '#0D1117', color: '#E6EDF3', border: '2px solid #00E676',
      borderRadius: '8px', padding: '14px', boxShadow: '0 12px 40px #000000cc'
    });
    const top = document.createElement('div');
    Object.assign(top.style, { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' });
    const title = document.createElement('b'); title.style.flex = '1'; title.style.color = '#00E676';
    const q = document.createElement('input'); q.type = 'search'; q.placeholder = 'Cerca file...'; q.setAttribute('data-q', '1');
    Object.assign(q.style, { background: '#161B22', color: '#E6EDF3', border: '1px solid #2EA043', padding: '6px', borderRadius: '4px' });
    const close = this.btn('[X] Chiudi', () => p.style.display = 'none');
    top.append(title, q, close);

    const list = document.createElement('div'); list.setAttribute('data-list', '1');
    Object.assign(list.style, { overflowY: 'auto', flex: '1', border: '1px solid #238636', background: '#161B22' });

    const foot = document.createElement('div');
    Object.assign(foot.style, { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' });
    foot.append(
      this.btn('Apri selezionato (PAK/AFS)', () => this.openSelectedEntry()),
      this.btn('Indietro', () => this.goBackArchive()),
      this.btn('Estrai file selezionato', () => {
        const e = this.entries[this.selectedIndex];
        if (e && e.valid) this.download(this.afs.slice(e.offset, e.offset + e.size), this.clean(this.names[this.selectedIndex]));
      }),
      this.btn('Esporta tutto in ZIP', () => this.exportZIP())
    );

    const st = document.createElement('small'); st.setAttribute('data-status', '1');
    st.style.marginTop = '8px'; st.style.color = '#3FB950';
    p.append(top, list, foot, st);
    document.body.appendChild(p);
    q.addEventListener('input', () => this.render());
  }

  render() {
    if (!this.panel) return;
    const list = this.panel.querySelector('[data-list]'), q = this.panel.querySelector('[data-q]'),
      st = this.panel.querySelector('[data-status]'), term = q ? q.value.toLowerCase().trim() : '';
    const title = this.panel.querySelector('b');
    if (title) title.textContent = `> EXPLORER // ${this.archiveType}: ${this.archiveName}`;
    list.replaceChildren();

    this.entries.filter(e => !term || String(this.names[e.index] || '').toLowerCase().includes(term)).forEach(e => {
      const r = document.createElement('div');
      Object.assign(r.style, {
        display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', padding: '10px',
        borderBottom: '1px solid #23863644', cursor: 'pointer'
      });
      const l = document.createElement('div'); l.textContent = this.names[e.index]; l.style.fontWeight = 'bold';
      const right = document.createElement('div'); right.textContent = `${e.size.toLocaleString()} B`; right.style.color = '#3FB950';
      r.append(l, right);

      if (this.selectedIndex === e.index) {
        r.style.background = '#1f3a29';
        const cached = this.qrsCache.get(e.index);
        if (cached && typeof cached.then !== 'function') this.showQRSPreview(r, cached);
        else if (cached === null) {
          const no = document.createElement('small'); no.textContent = 'Nessuna texture QRS rilevata in questa voce.'; no.style.color = '#8b949e'; r.appendChild(no);
        } else {
          const wait = document.createElement('small'); wait.textContent = 'Analisi texture QRS in corso...'; wait.style.color = '#00E676'; r.appendChild(wait);
        }
      }

      r.onclick = () => {
        this.selectedIndex = e.index;
        this.render();
        this.inspectQRS(e.index).then(() => { if (this.selectedIndex === e.index) this.render(); });
      };
      r.ondblclick = () => { this.selectedIndex = e.index; this.openSelectedEntry(); };
      list.appendChild(r);
    });
    if (st) st.textContent = `${this.status} | Voci: ${this.entries.length} | Livelli annidati: ${this.archiveStack.length}`;
  }
}

const modder = new BT3DesktopModder();
