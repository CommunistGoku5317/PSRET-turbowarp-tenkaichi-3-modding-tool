const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function concat(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function writeU32BE(out, offset, value) {
  out[offset] = (value >>> 24) & 255;
  out[offset + 1] = (value >>> 16) & 255;
  out[offset + 2] = (value >>> 8) & 255;
  out[offset + 3] = value & 255;
}

function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  writeU32BE(out, 0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes);
  crcInput.set(data, 4);
  writeU32BE(out, 8 + data.length, crc32(crcInput));
  return out;
}

async function deflate(bytes) {
  if (typeof CompressionStream !== 'function')
    throw new Error('Questo browser non supporta la compressione PNG (CompressionStream).');
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.length;
    chunks.push(part.value);
  }
  return concat(chunks);
}

async function inflate(bytes, expectedLength) {
  if (typeof DecompressionStream !== 'function')
    throw new Error('Questo browser non supporta la decompressione PNG (DecompressionStream).');
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.length;
    if (total > expectedLength) {
      await reader.cancel();
      throw new Error('Il PNG si espande oltre la dimensione dichiarata.');
    }
    chunks.push(part.value);
  }
  if (total !== expectedLength) throw new Error('Dimensione dati PNG decompressi non coerente.');
  return concat(chunks);
}

export async function encodeIndexedPNG(width, height, indices, rgbaPalette) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0)
    throw new Error('Dimensioni PNG non valide.');
  if (!indices || indices.length !== width * height)
    throw new Error('Il numero di indici non corrisponde alle dimensioni PNG.');
  if (!rgbaPalette || rgbaPalette.length === 0 || (rgbaPalette.length & 3) !== 0 || rgbaPalette.length > 1024)
    throw new Error('Palette RGBA non valida.');
  const colors = rgbaPalette.length >>> 2;
  const depth = colors <= 16 ? 4 : 8;
  if (colors > (1 << depth)) throw new Error('La palette supera il limite del PNG indicizzato.');
  const rowBytes = Math.ceil(width * depth / 8);
  const raw = new Uint8Array(height * (rowBytes + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // filtro PNG None
    for (let x = 0; x < width; x++) {
      const value = Number(indices[y * width + x]);
      if (!Number.isInteger(value) || value < 0 || value >= colors)
        throw new Error('Indice fuori dalla palette in (' + x + ', ' + y + ').');
      if (depth === 8) raw[rowStart + 1 + x] = value;
      else {
        const p = rowStart + 1 + (x >>> 1);
        if ((x & 1) === 0) raw[p] = value << 4;
        else raw[p] |= value;
      }
    }
  }
  const plte = new Uint8Array(colors * 3);
  const alpha = new Uint8Array(colors);
  for (let i = 0; i < colors; i++) {
    plte[i * 3] = rgbaPalette[i * 4];
    plte[i * 3 + 1] = rgbaPalette[i * 4 + 1];
    plte[i * 3 + 2] = rgbaPalette[i * 4 + 2];
    alpha[i] = rgbaPalette[i * 4 + 3];
  }
  let alphaLength = alpha.length;
  while (alphaLength > 0 && alpha[alphaLength - 1] === 255) alphaLength--;
  const ihdr = new Uint8Array(13);
  writeU32BE(ihdr, 0, width);
  writeU32BE(ihdr, 4, height);
  ihdr[8] = depth; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const compressed = await deflate(raw);
  const parts = [PNG_SIGNATURE, pngChunk('IHDR', ihdr), pngChunk('PLTE', plte)];
  if (alphaLength) parts.push(pngChunk('tRNS', alpha.subarray(0, alphaLength)));
  parts.push(pngChunk('IDAT', compressed), pngChunk('IEND', new Uint8Array(0)));
  return new Blob([concat(parts)], { type: 'image/png' });
}

export async function decodeIndexedPNG(buffer, expectedWidth, expectedHeight) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 33 || !PNG_SIGNATURE.every((value, i) => bytes[i] === value))
    throw new Error('Il file selezionato non è un PNG valido.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read32 = offset => view.getUint32(offset, false);
  let pos = 8, width = 0, height = 0, depth = 0, colorType = -1, interlace = -1;
  let palette = null, transparency = null, sawHeader = false, sawEnd = false;
  const idat = [];
  let idatLength = 0;
  while (pos + 12 <= bytes.length) {
    const length = read32(pos);
    if (length > bytes.length - pos - 12) throw new Error('Chunk PNG troncato o con lunghezza non valida.');
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const start = pos + 8, end = start + length;
    const typeBytes = bytes.subarray(pos + 4, pos + 8);
    const crcInput = new Uint8Array(4 + length);
    crcInput.set(typeBytes);
    crcInput.set(bytes.subarray(start, end), 4);
    if (crc32(crcInput) !== read32(end)) throw new Error('CRC non valido nel chunk PNG ' + type + '.');
    if (type === 'IHDR') {
      if (sawHeader || length !== 13) throw new Error('Header IHDR PNG non valido.');
      width = read32(start); height = read32(start + 4);
      depth = bytes[start + 8]; colorType = bytes[start + 9];
      if (bytes[start + 10] !== 0 || bytes[start + 11] !== 0) throw new Error('Metodo PNG non supportato.');
      interlace = bytes[start + 12]; sawHeader = true;
      if (!width || !height || width > 16384 || height > 16384 || width * height > 16777216)
        throw new Error('Dimensioni PNG non valide o troppo grandi.');
      if (expectedWidth != null && width !== expectedWidth || expectedHeight != null && height !== expectedHeight)
        throw new Error('Le dimensioni PNG non coincidono con quelle della texture originale.');
      if (colorType !== 3) throw new Error('È richiesto un PNG indicizzato (color type 3).');
      if (![1, 2, 4, 8].includes(depth)) throw new Error('Profondità PNG indicizzata non supportata.');
      if (interlace !== 0) throw new Error('PNG interlacciato non supportato.');
    } else if (type === 'PLTE') {
      if (!sawHeader || length === 0 || length % 3 !== 0 || length > 768)
        throw new Error('Palette PLTE PNG non valida.');
      palette = bytes.slice(start, end);
    } else if (type === 'tRNS') {
      transparency = bytes.slice(start, end);
    } else if (type === 'IDAT') {
      if (!sawHeader) throw new Error('IDAT precede IHDR.');
      idat.push(bytes.slice(start, end)); idatLength += length;
    } else if (type === 'IEND') {
      if (length !== 0) throw new Error('Chunk IEND non valido.');
      sawEnd = true; pos = end + 4; break;
    }
    pos = end + 4;
  }
  if (!sawHeader || !sawEnd || !palette || !idatLength) throw new Error('Struttura PNG indicizzato incompleta.');
  const paletteCount = palette.length / 3;
  if (!paletteCount || paletteCount > (1 << depth)) throw new Error('La palette supera la profondità dichiarata.');
  if (transparency && transparency.length > paletteCount) throw new Error('tRNS supera il numero di colori della palette.');
  const rowBytes = Math.ceil(width * depth / 8);
  const inflated = await inflate(concat(idat), height * (rowBytes + 1));
  const raw = new Uint8Array(height * rowBytes);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
  };
  for (let y = 0; y < height; y++) {
    const filter = inflated[y * (rowBytes + 1)];
    if (filter > 4) throw new Error('Filtro PNG non valido alla riga ' + y + '.');
    const src = y * (rowBytes + 1) + 1, dst = y * rowBytes, prev = dst - rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const value = inflated[src + x];
      const left = x > 0 ? raw[dst + x - 1] : 0;
      const up = y > 0 ? raw[prev + x] : 0;
      const upLeft = y > 0 && x > 0 ? raw[prev + x - 1] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paeth(left, up, upLeft);
      raw[dst + x] = (value + predictor) & 255;
    }
  }
  const indices = new Uint8Array(width * height);
  const mask = (1 << depth) - 1;
  for (let y = 0; y < height; y++) {
    const row = y * rowBytes;
    for (let x = 0; x < width; x++) {
      const bit = x * depth, shift = 8 - depth - (bit & 7);
      const value = (raw[row + (bit >>> 3)] >>> shift) & mask;
      if (value >= paletteCount) throw new Error('Indice PNG fuori dalla palette in (' + x + ', ' + y + ').');
      indices[y * width + x] = value;
    }
  }
  const rgbaPalette = new Uint8Array(paletteCount * 4);
  for (let i = 0; i < paletteCount; i++) {
    rgbaPalette[i * 4] = palette[i * 3];
    rgbaPalette[i * 4 + 1] = palette[i * 3 + 1];
    rgbaPalette[i * 4 + 2] = palette[i * 3 + 2];
    rgbaPalette[i * 4 + 3] = transparency && i < transparency.length ? transparency[i] : 255;
  }
  return { width, height, bitDepth: depth, paletteCount, palette: rgbaPalette, indices };
}
