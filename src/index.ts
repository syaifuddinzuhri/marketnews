import { closeSync, openSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.js';
import { ChatRegistrationStore } from './services/chat-registration.js';
import { MessageProcessor, chunkTelegramMessage } from './services/message-processor.js';
import { TelegramBotApi } from './telegram/bot-api.js';
import { SourceListener } from './telegram/source-listener.js';
import { createUserClient } from './telegram/user-client.js';
import { MyMemoryTranslator } from './translation/mymemory-translator.js';
import { createLogger } from './utils/logger.js';

function ensureSingleInstance(botToken: string): void {
  const tokenTag = botToken.replace(/[^a-zA-Z0-9]/g, '') || 'default';
  const lockFilePath = path.join(tmpdir(), `tele-translator-${tokenTag}.lock`);

  try {
    const fileDescriptor = openSync(lockFilePath, 'wx');
    closeSync(fileDescriptor);

    process.on('exit', () => {
      try {
        unlinkSync(lockFilePath);
      } catch {
        // File lock may already be removed by another process shutdown.
      }
    });
    return;
  } catch {
    throw new Error('Instans lain untuk bot Telegram ini sudah aktif. Hentikan proses lama sebelum menjalankan ulang.');
  }
}

async function runTemporaryMode(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const bot = new TelegramBotApi(config.botToken, logger);
  const translator = new MyMemoryTranslator(config, logger);

  logger.info('Mode temporary aktif: Telegram Bot API hanya untuk command interaktif.');

  await bot.startPolling(async (chatId, text) => {
    const command = text.trim();
    const lowerCommand = command.toLowerCase();

    if (lowerCommand === '/start') {
      await bot.sendMessage(chatId, '✅ Bot temporary aktif. Gunakan /translate <teks> untuk menerjemahkan pesan ke Bahasa Indonesia.');
      return;
    }

    if (lowerCommand === '/help') {
      await bot.sendMessage(chatId, 'Perintah yang tersedia:\n/start\n/help\n/translate <teks>');
      return;
    }

    if (lowerCommand.startsWith('/translate')) {
      const payload = command.replace(/^\/translate\s*/i, '').trim();
      if (!payload) {
        await bot.sendMessage(chatId, 'Format: /translate <teks yang ingin diterjemahkan>');
        return;
      }

      try {
        const translated = await translator.translate(payload);
        await bot.sendMessage(chatId, translated);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Terjemahan gagal';
        logger.warn('Terjemahan melalui mode temporary gagal', { reason });
        await bot.sendMessage(chatId, 'Saya gagal menerjemahkan teks saat ini. Silakan coba beberapa saat lagi.');
      }
    }
  });
}

async function runLiveMode(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  logger.info('Mode live aktif: GramJS dan Bot API diaktifkan.');

  const chatStore = new ChatRegistrationStore(config.chatStorePath);
  const bot = new TelegramBotApi(config.botToken, logger);
  const userClient = await createUserClient(config, logger);
  const translator = new MyMemoryTranslator(config, logger);
  const processor = new MessageProcessor(translator, config, logger);
  const sourceListener = new SourceListener(userClient, config, logger);

  const registeredChatId = chatStore.load();
  if (registeredChatId) {
    logger.info('Chat tujuan sudah terdaftar', { chatId: registeredChatId });
  } else {
    logger.warn('Belum ada chat pribadi yang terdaftar. Tekan /start di bot penerima untuk mendaftarkan chat tujuan.');
  }

  await sourceListener.start(async (message) => {
    const targetChatId = chatStore.load() ?? config.telegramChatId;

    if (!targetChatId) {
      logger.warn('Pesan diabaikan karena target chat belum tersedia', {
        sourceChatId: message.sourceChatId,
        sourceName: message.sourceName,
      });
      return;
    }

    const rendered = await processor.processMessage(message);
    if (!rendered) {
      return;
    }

    for (const chunk of chunkTelegramMessage(rendered)) {
      const sent = await bot.sendMessage(targetChatId, chunk);
      if (!sent) {
        logger.warn('Gagal mengirim chunk hasil terjemahan ke chat tujuan', { targetChatId });
      }
    }
  });

  await bot.startPolling(async (chatId, text) => {
    const command = text.trim().toLowerCase();

    if (command === '/start') {
      chatStore.save(chatId);
      await bot.sendMessage(chatId, '✅ Bot penerima sudah aktif. Chat pribadi Anda telah terdaftar untuk menerima terjemahan otomatis.');
      logger.info('Chat pribadi berhasil didaftarkan', { chatId });
      return;
    }

    if (command === '/help') {
      await bot.sendMessage(chatId, 'Gunakan /start untuk mendaftarkan chat pribadi. Aplikasi akan otomatis menerjemahkan pesan baru dari sumber yang dikonfigurasi.');
      return;
    }
  });

  process.on('SIGINT', async () => {
    logger.info('Menutup koneksi Telegram...');
    await userClient.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Sinyal terminate diterima. menutup koneksi Telegram...');
    await userClient.disconnect();
    process.exit(0);
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  logger.info('Memulai aplikasi Telegram Auto Translator', {
    nodeEnv: config.nodeEnv,
    telegramMode: config.telegramMode,
  });

  ensureSingleInstance(config.botToken);

  if (config.telegramMode === 'temporary') {
    await runTemporaryMode();
    return;
  }

  await runLiveMode();
}

main().catch((error) => {
  console.error('Aplikasi gagal berjalan:', error);
  process.exit(1);
});
