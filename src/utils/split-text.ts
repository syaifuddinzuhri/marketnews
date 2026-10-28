export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function splitTextByByteLimit(input: string, maxBytes = 500): string[] {
  const normalized = input.trim();

  if (!normalized) {
    return [];
  }

  if (utf8ByteLength(normalized) <= maxBytes) {
    return [normalized];
  }

  const slices: string[] = [];
  let current = '';

  for (const char of Array.from(normalized)) {
    const candidate = `${current}${char}`;

    if (utf8ByteLength(candidate) <= maxBytes) {
      current = candidate;
      continue;
    }

    if (current.trim()) {
      slices.push(current.trim());
    }

    current = char;
  }

  if (current.trim()) {
    slices.push(current.trim());
  }

  return slices.filter(Boolean);
}
