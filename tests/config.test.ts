import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function setBaseEnvironment(overrides: Record<string, string> = {}): void {
  process.env.NODE_ENV = 'development';
  process.env.TELEGRAM_MODE = 'temporary';
  process.env.TELEGRAM_BOT_TOKEN = '123456:ABCDEF';
  process.env.TELEGRAM_API_ID = '';
  process.env.TELEGRAM_API_HASH = '';
  process.env.TELEGRAM_SESSION = '';
  process.env.TELEGRAM_CHAT_ID = '';
  process.env.SOURCE_CHATS = '@example_channel';
  process.env.MYMEMORY_EMAIL = '';
  process.env.TRANSLATE_ONLY_ENGLISH = 'true';
  process.env.ENABLE_SOURCE_LINK = 'true';
  process.env.LOG_LEVEL = '';

  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
}

describe('loadConfig', () => {
  it('mengizinkan development + temporary', () => {
    setBaseEnvironment({
      NODE_ENV: 'development',
      TELEGRAM_MODE: 'temporary',
    });

    const config = loadConfig();

    expect(config.nodeEnv).toBe('development');
    expect(config.telegramMode).toBe('temporary');
    expect(config.botToken).toBe('123456:ABCDEF');
    expect(config.apiId).toBeUndefined();
    expect(config.apiHash).toBeUndefined();
  });

  it('mengizinkan production + temporary', () => {
    setBaseEnvironment({
      NODE_ENV: 'production',
      TELEGRAM_MODE: 'temporary',
    });

    const config = loadConfig();

    expect(config.nodeEnv).toBe('production');
    expect(config.telegramMode).toBe('temporary');
    expect(config.logLevel).toBe('info');
  });

  it('mengizinkan development + live ketika semua konfigurasi valid', () => {
    setBaseEnvironment({
      NODE_ENV: 'development',
      TELEGRAM_MODE: 'live',
      TELEGRAM_API_ID: '123456',
      TELEGRAM_API_HASH: 'test_hash',
      TELEGRAM_SESSION: 'test_session',
      TELEGRAM_CHAT_ID: '987654321',
    });

    const config = loadConfig();

    expect(config.nodeEnv).toBe('development');
    expect(config.telegramMode).toBe('live');
    expect(config.apiId).toBe(123456);
    expect(config.apiHash).toBe('test_hash');
    expect(config.telegramChatId).toBe(987654321);
  });

  it('mengizinkan production + live ketika semua konfigurasi valid', () => {
    setBaseEnvironment({
      NODE_ENV: 'production',
      TELEGRAM_MODE: 'live',
      TELEGRAM_API_ID: '123456',
      TELEGRAM_API_HASH: 'test_hash',
      TELEGRAM_SESSION: 'test_session',
      TELEGRAM_CHAT_ID: '987654321',
      LOG_LEVEL: 'info',
    });

    const config = loadConfig();

    expect(config.nodeEnv).toBe('production');
    expect(config.telegramMode).toBe('live');
    expect(config.logLevel).toBe('info');
  });

  it('gagal pada live dengan API ID atau hash yang hilang', () => {
    setBaseEnvironment({
      NODE_ENV: 'production',
      TELEGRAM_MODE: 'live',
      TELEGRAM_API_ID: '',
      TELEGRAM_API_HASH: '',
      TELEGRAM_SESSION: 'test_session',
      TELEGRAM_CHAT_ID: '987654321',
    });

    expect(() => loadConfig()).toThrow(/TELEGRAM_API_ID|TELEGRAM_API_HASH/);
  });
});
