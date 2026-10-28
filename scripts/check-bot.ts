import { loadBotTokenConfig } from '../src/config.js';
import { TelegramBotApi } from '../src/telegram/bot-api.js';
import { createLogger } from '../src/utils/logger.js';

async function main(): Promise<void> {
  const { botToken } = loadBotTokenConfig();
  const logger = createLogger('info');
  const bot = new TelegramBotApi(botToken, logger);
  const profile = await bot.getMe();
  console.log(`Bot username: @${profile.username || 'unknown'}`);
}

main().catch((error) => {
  console.error('Validasi bot gagal:', error);
  process.exit(1);
});
