import { NewMessage } from 'telegram/events/index.js';
import type { TelegramClient } from 'telegram';
import type { AppConfig } from '../config.js';
import type { Logger } from '../utils/logger.js';

export type SourceMessage = {
  sourceChatId: number;
  sourceName: string;
  sourceUsername: string;
  messageId: number;
  text: string;
};

export class SourceListener {
  constructor(
    private readonly client: TelegramClient,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  async resolveSourceEntities(): Promise<Array<{ username: string; chatId: number; title: string }>> {
    const uniqueSources = Array.from(new Set(this.config.sourceChats));
    const resolved: Array<{ username: string; chatId: number; title: string }> = [];

    for (const source of uniqueSources) {
      try {
        const chat = await this.client.getEntity(source);
        const chatId = Number((chat as any).id ?? 0);

        if (!chatId) {
          throw new Error(`Entity Telegram ${source} tidak valid.`);
        }

        resolved.push({
          username: source,
          chatId,
          title: (chat as any).title ?? (chat as any).username ?? source,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tidak dapat mengakses sumber Telegram ${source}`, { reason });
      }
    }

    return resolved;
  }

  async start(onMessage: (message: SourceMessage) => Promise<void> | void): Promise<void> {
    const sources = await this.resolveSourceEntities();
    const chats = sources.map((source) => source.chatId);

    if (chats.length === 0) {
      this.logger.warn('Tidak ada sumber Telegram yang valid dan dapat diakses.');
      return;
    }

    this.logger.info('Mendengarkan pesan baru dari sumber Telegram', {
      sources: sources.map((source) => source.username),
    });

    this.client.addEventHandler(async (event: any) => {
      const message = event.message;
      if (!message) {
        return;
      }

      const rawText = typeof message.rawText === 'string'
        ? message.rawText
        : typeof message.message === 'string'
          ? message.message
          : typeof message.caption === 'string'
            ? message.caption
            : '';

      if (!rawText.trim()) {
        return;
      }

      const chatId = Number(message.chatId ?? message.chat?.id ?? 0);
      const chatName = message.chat?.title ?? message.chat?.username ?? 'Sumber';
      const userName = message.chat?.username ? `@${message.chat.username}` : chatName;
      const sourceId = Number(message.id ?? 0);

      await onMessage({
        sourceChatId: chatId,
        sourceName: chatName,
        sourceUsername: userName,
        messageId: sourceId,
        text: rawText,
      });
    }, new NewMessage({ chats }));
  }
}
