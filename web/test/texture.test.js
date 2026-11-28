import test from 'node:test';
import assert from 'node:assert/strict';
import { QRS } from '../src/qrs.js';
import { decodeIndexedPNG, encodeIndexedPNG } from '../src/indexed-png.js';

function sequence(length, modulus, multiplier, add) {
  const values = new Uint8Array(length);
  for (let i = 0; i < length; i++) values[i] = (i * multiplier + add) % modulus;
  return values;
}

test('QRS 4-bit encoder round-trips the exact palette indices', () => {
  const width = 32, height = 32;
  const input = sequence(width * height, 16, 7, 3);
  const packed = QRS.encodeQrs4Texture(input, width, height);
  const decoded = QRS.decodeQrs4Texture(packed, width, height);
  assert.deepEqual(decoded.indices, input);
  assert.equal(packed.length, width * height / 2);
});

test('QRS 8-bit encoder round-trips the exact palette indices', () => {
  const width = 64, height = 64;
  const input = sequence(width * height, 256, 37, 19);
  const packed = QRS.encodeQrs8Texture(input, width, height);
  const decoded = QRS.decodeQrs8Texture(packed, width, height);
  assert.deepEqual(decoded.indices, input);
  assert.equal(packed.length, width * height);
});

test('CSM1 palette permutation is an involution', () => {
  for (let i = 0; i < 256; i++)
    assert.equal(QRS.csm1PaletteIndex(QRS.csm1PaletteIndex(i)), i);
});

test('indexed PNG preserves indices and alpha palette', async () => {
  const width = 17, height = 9;
  const indices = sequence(width * height, 16, 5, 1);
  const palette = new Uint8Array(16 * 4);
  for (let i = 0; i < 16; i++) {
    palette[i * 4] = i * 11;
    palette[i * 4 + 1] = 255 - i * 9;
    palette[i * 4 + 2] = i * 3;
    palette[i * 4 + 3] = i === 0 ? 0 : (i === 15 ? 254 : 255);
  }
  const blob = await encodeIndexedPNG(width, height, indices, palette);
  const decoded = await decodeIndexedPNG(await blob.arrayBuffer(), width, height);
  assert.deepEqual(decoded.indices, indices);
  assert.deepEqual(decoded.palette, palette);
  assert.equal(decoded.bitDepth, 4);
});

test('indexed PNG rejects a mismatched requested size', async () => {
  const indices = new Uint8Array(16);
  const palette = new Uint8Array([0, 0, 0, 255]);
  const png = await encodeIndexedPNG(4, 4, indices, palette);
  await assert.rejects(
    decodeIndexedPNG(await png.arrayBuffer(), 8, 8),
    /dimensioni PNG non coincidono/i
  );
});
