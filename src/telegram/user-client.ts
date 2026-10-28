import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import readline from 'node:readline/promises';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import type { AppConfig } from '../config.js';
import type { Logger } from '../utils/logger.js';

async function promptValue(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

export async function createUserClient(config: AppConfig, logger: Logger): Promise<TelegramClient> {
  const apiId = config.apiId;
  const apiHash = config.apiHash;

  if (!apiId || !apiHash) {
    throw new Error('Mode live membutuhkan TELEGRAM_API_ID dan TELEGRAM_API_HASH yang valid.');
  }

  const sessionString = config.telegramSession ?? (existsSync(config.sessionFilePath)
    ? readFileSync(config.sessionFilePath, 'utf8').trim()
    : '');

  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => {
      const value = await promptValue('Nomor telepon akun Telegram (contoh +628123456789): ');
      if (!value) {
        throw new Error('Nomor telepon wajib diisi.');
      }
      return value;
    },
    password: async () => {
      const value = await promptValue('Password 2FA Telegram (jika diminta): ');
      return value;
    },
    phoneCode: async () => {
      const value = await promptValue('Kode login Telegram: ');
      if (!value) {
        throw new Error('Kode login wajib diisi.');
      }
      return value;
    },
    onError: (error) => {
      logger.warn('Login Telegram gagal atau memerlukan langkah tambahan', {
        reason: error instanceof Error ? error.message : String(error),
      });
    },
  });

  const savedSession = client.session instanceof StringSession ? client.session.save() : '';
  if (savedSession && !config.telegramSession) {
    mkdirSync(dirname(config.sessionFilePath), { recursive: true });
    writeFileSync(config.sessionFilePath, savedSession, 'utf8');
    chmodSync(config.sessionFilePath, 0o600);
    logger.info('Session Telegram disimpan secara aman di file lokal.', {
      path: config.sessionFilePath,
    });
  }

  return client;
}
