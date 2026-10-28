import type { AppConfig } from '../config.js';
import type { Logger } from '../utils/logger.js';
import { splitTextByByteLimit } from '../utils/split-text.js';
import type { Translator } from './translator.interface.js';

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MyMemoryTranslator implements Translator {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  async translate(text: string): Promise<string> {
    const cleanText = text.trim();

    if (!cleanText) {
      throw new Error('Pesan kosong, tidak dapat diterjemahkan.');
    }

    const segments = splitTextByByteLimit(cleanText, 500);

    if (segments.length === 0) {
      throw new Error('Segmen teks tidak valid untuk MyMemory.');
    }

    const translatedSegments: string[] = [];

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const translated = await this.translateSegment(segment, index);
      translatedSegments.push(translated);

      if (index < segments.length - 1) {
        await wait(180);
      }
    }

    return translatedSegments.join(' ').replace(/\s+/g, ' ').trim();
  }

  private async translateSegment(segment: string, index: number): Promise<string> {
    const params = new URLSearchParams({ q: segment, langpair: 'en|id' });

    if (this.config.myMemoryEmail) {
      params.set('de', this.config.myMemoryEmail);
    }

    const url = `${MYMEMORY_API}?${params.toString()}`;
    let attempt = 0;

    while (attempt < 3) {
      attempt += 1;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        clearTimeout(timeout);

        if (!response.ok) {
          if (response.status === 429) {
            const retryDelay = 500 * attempt;
            this.logger.warn(`MyMemory rate limit: menunggu ${retryDelay}ms sebelum retry`, { segmentIndex: index });
            await wait(retryDelay);
            continue;
          }

          throw new Error(`MyMemory HTTP ${response.status}`);
        }

        const payload = (await response.json()) as Record<string, unknown>;
        const responseStatus = Number(payload.responseStatus ?? 0);
        const translatedText = payload.responseData && typeof payload.responseData === 'object'
          ? (payload.responseData as Record<string, unknown>).translatedText
          : undefined;

        if (responseStatus !== 200 || typeof translatedText !== 'string' || !translatedText.trim()) {
          throw new Error('Respon MyMemory tidak valid atau terjemahan kosong.');
        }

        return translatedText.trim();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (attempt >= 3) {
          this.logger.error('Gagal menerjemahkan teks dengan MyMemory', { segmentIndex: index, reason: message });
          throw new Error('Terjemahan gagal setelah retry terbatas.');
        }

        const retryDelay = 400 * attempt;
        this.logger.warn(`Retry MyMemory ${attempt}/3 dalam ${retryDelay}ms`, { segmentIndex: index, reason: message });
        await wait(retryDelay);
      }
    }

    throw new Error('MyMemory request gagal.');
  }
}
