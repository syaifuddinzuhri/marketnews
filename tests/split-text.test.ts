import { describe, expect, it } from 'vitest';
import { splitTextByByteLimit, utf8ByteLength } from '../src/utils/split-text.js';

describe('splitTextByByteLimit', () => {
  it('membagi teks panjang menjadi segmen yang aman', () => {
    const text = 'This is a very long sentence for the translator to split safely across multiple requests. Each segment should remain under the byte limit.';
    const segments = splitTextByByteLimit(text, 50);

    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) {
      expect(utf8ByteLength(segment)).toBeLessThanOrEqual(50);
    }
  });

  it('mengembalikan array kosong untuk teks kosong', () => {
    expect(splitTextByByteLimit('   ')).toEqual([]);
  });
});
