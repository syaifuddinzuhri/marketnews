import { afterEach, describe, expect, it, vi } from 'vitest';
import { TelegramBotApi } from '../src/telegram/bot-api.js';

describe('TelegramBotApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('menyensor token dan URL pada error 409 getUpdates', () => {
    const logger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    const bot = new TelegramBotApi('123456:ABCDEF', logger as any);

    (bot as any).logTelegramApiError('getUpdates', {
      ok: false,
      error_code: 409,
      description:
        'Conflict: terminated by other getUpdates request; bot token 123456:ABCDEF is active; https://api.telegram.org/bot123456:ABCDEF/getWebhookInfo',
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [, payload] = logger.warn.mock.calls[0];

    expect(payload.error_code).toBe(409);
    expect(payload.description).not.toContain('123456:ABCDEF');
    expect(payload.description).not.toContain('https://api.telegram.org');
    expect(payload.description).toContain('[TOKEN_REDACTED]');
  });

  it('memeriksa info webhook tanpa otomatis menghapus webhook', async () => {
    const logger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    const bot = new TelegramBotApi('123456:ABCDEF', logger as any);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input);

        if (url.includes('/getWebhookInfo')) {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              result: { url: 'https://example.com/webhook', pending_update_count: 0 },
            }),
          } as Response;
        }

        throw new Error(`Unexpected fetch call: ${url}`);
      }),
    );

    const info = await bot.getWebhookInfo();

    expect(info.url).toBe('https://example.com/webhook');
    expect(typeof bot.deleteWebhook).toBe('function');
  });
});
