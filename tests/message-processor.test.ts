import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../src/config.js';
import { MessageProcessor, formatTranslationMessage } from '../src/services/message-processor.js';
import { createLogger } from '../src/utils/logger.js';

describe('MessageProcessor', () => {
  const config: AppConfig = {
    nodeEnv: 'development',
    telegramMode: 'temporary',
    apiId: 123456,
    apiHash: 'test-hash',
    botToken: '123:ABC',
    sourceChats: ['@example_channel'],
    myMemoryEmail: 'user@example.com',
    translateOnlyEnglish: true,
    enableSourceLink: true,
    logLevel: 'info',
    sessionFilePath: '/tmp/session.txt',
    chatStorePath: '/tmp/chat.json',
  };

  const logger = createLogger('error');

  it('mengabaikan teks kosong', async () => {
    const processor = new MessageProcessor({
      translate: async () => 'Harga emas naik.',
    }, config, logger);

    await expect(processor.processMessage({
      sourceChatId: 1,
      sourceName: 'Test Channel',
      sourceUsername: '@example_channel',
      messageId: 99,
      text: '   ',
    })).resolves.toBeNull();
  });

  it('mengembalikan null saat terjemahan gagal', async () => {
    const processor = new MessageProcessor({
      translate: async () => {
        throw new Error('Terjemahan gagal');
      },
    }, config, logger);

    await expect(processor.processMessage({
      sourceChatId: 1,
      sourceName: 'Test Channel',
      sourceUsername: '@example_channel',
      messageId: 100,
      text: 'Gold prices rise.',
    })).resolves.toBeNull();
  });

  it('membuat format pesan yang rapi', () => {
    const output = formatTranslationMessage({
      sourceName: 'Example Channel',
      sourceLink: 'https://t.me/example_channel/123',
      originalText: 'Gold prices rise.',
      translatedText: 'Harga emas naik.',
    });

    expect(output).toContain('🌐 TERJEMAHAN OTOMATIS');
    expect(output).toContain('🇬🇧 Original:');
    expect(output).toContain('🇮🇩 Terjemahan:');
    expect(output).toContain('https://t.me/example_channel/123');
  });
});
