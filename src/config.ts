import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type NodeEnv = 'development' | 'production';
export type TelegramMode = 'temporary' | 'live';

export type AppConfig = {
  nodeEnv: NodeEnv;
  telegramMode: TelegramMode;
  apiId?: number;
  apiHash?: string;
  botToken: string;
  sourceChats: string[];
  telegramChatId?: number;
  myMemoryEmail?: string;
  translateOnlyEnglish: boolean;
  enableSourceLink: boolean;
  logLevel: LogLevel;
  telegramSession?: string;
  sessionFilePath: string;
  chatStorePath: string;
};

function readEnv(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

function parseBoolean(value: string, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function readSessionFromFile(filePath: string): string {
  try {
    if (!existsSync(filePath)) {
      return '';
    }

    return readFileSync(filePath, 'utf8').trim();
  } catch {
    return '';
  }
}

function parseNodeEnv(value: string): NodeEnv {
  const normalized = value.toLowerCase();
  if (normalized === 'development' || normalized === 'production') {
    return normalized;
  }

  throw new Error(`NODE_ENV harus bernilai development atau production. Nilai saat ini: ${value || '(kosong)'}`);
}

function parseTelegramMode(value: string): TelegramMode {
  const normalized = value.toLowerCase();
  if (normalized === 'temporary' || normalized === 'live') {
    return normalized;
  }

  throw new Error(`TELEGRAM_MODE harus bernilai temporary atau live. Nilai saat ini: ${value || '(kosong)'}`);
}

function parseSourceChats(rawValue: string): string[] {
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (value.startsWith('@') ? value : `@${value}`));
}

export function loadConfig(): AppConfig {
  const nodeEnv = parseNodeEnv(readEnv('NODE_ENV', 'development'));
  const telegramMode = parseTelegramMode(readEnv('TELEGRAM_MODE', 'temporary'));
  const botToken = readEnv('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN wajib diisi untuk semua mode.');
  }

  const logLevelValue = readEnv('LOG_LEVEL', nodeEnv === 'development' ? 'debug' : 'info').toLowerCase();
  const validLogLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const logLevel = validLogLevels.includes(logLevelValue as LogLevel)
    ? (logLevelValue as LogLevel)
    : (nodeEnv === 'development' ? 'debug' : 'info');

  const sessionFilePath = path.resolve(process.cwd(), 'data', 'telegram-session.txt');
  const chatStorePath = path.resolve(process.cwd(), 'data', 'chat-registration.json');
  const resolvedSession = readEnv('TELEGRAM_SESSION') || readSessionFromFile(sessionFilePath) || undefined;

  const baseConfig: AppConfig = {
    nodeEnv,
    telegramMode,
    botToken,
    sourceChats: parseSourceChats(readEnv('SOURCE_CHATS', '')),
    myMemoryEmail: readEnv('MYMEMORY_EMAIL') || undefined,
    translateOnlyEnglish: parseBoolean(readEnv('TRANSLATE_ONLY_ENGLISH', 'true'), true),
    enableSourceLink: parseBoolean(readEnv('ENABLE_SOURCE_LINK', 'true'), true),
    logLevel,
    telegramSession: resolvedSession,
    sessionFilePath,
    chatStorePath,
  };

  if (telegramMode === 'temporary') {
    return baseConfig;
  }

  const apiIdRaw = readEnv('TELEGRAM_API_ID');
  const apiId = Number(apiIdRaw);
  if (!apiIdRaw || !Number.isInteger(apiId) || apiId <= 0) {
    throw new Error('Mode live membutuhkan TELEGRAM_API_ID numerik valid.');
  }

  const apiHash = readEnv('TELEGRAM_API_HASH');
  if (!apiHash) {
    throw new Error('Mode live membutuhkan TELEGRAM_API_HASH yang valid.');
  }

  const sourceChats = parseSourceChats(readEnv('SOURCE_CHATS'));
  if (sourceChats.length === 0) {
    throw new Error('Mode live membutuhkan SOURCE_CHATS berisi minimal satu username publik seperti @example_channel.');
  }

  const telegramChatIdRaw = readEnv('TELEGRAM_CHAT_ID');
  const telegramChatId = Number(telegramChatIdRaw);
  if (!telegramChatIdRaw || !Number.isInteger(telegramChatId) || telegramChatId === 0) {
    throw new Error('Mode live membutuhkan TELEGRAM_CHAT_ID yang valid untuk pengiriman hasil ke chat pribadi.');
  }

  return {
    ...baseConfig,
    apiId,
    apiHash,
    sourceChats,
    telegramChatId,
  };
}

export function loadBotTokenConfig(): { botToken: string } {
  const botToken = readEnv('TELEGRAM_BOT_TOKEN');

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN belum diisi.');
  }

  return { botToken };
}
