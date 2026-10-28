import type { Logger } from '../utils/logger.js';

export type BotCommandHandler = (chatId: number, text: string) => Promise<void> | void;

export class TelegramBotApi {
  constructor(
    private readonly token: string,
    private readonly logger: Logger,
  ) {}

  private get baseUrl(): string {
    return `https://api.telegram.org/bot${this.token}`;
  }

  async getMe(): Promise<{ id: number; username: string }> {
    const response = await fetch(`${this.baseUrl}/getMe`);
    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok || !payload.ok || typeof payload.result !== 'object' || payload.result === null) {
      throw new Error('Tidak dapat memvalidasi token bot Telegram.');
    }

    const result = payload.result as Record<string, unknown>;
    const username = typeof result.username === 'string' ? result.username : '';
    const id = Number(result.id ?? 0);

    return { id, username };
  }

  async sendMessage(chatId: number, text: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok || payload.ok !== true) {
      const description = typeof payload.description === 'string' ? payload.description : 'Tidak diketahui';
      this.logger.error('Gagal mengirim pesan ke chat Telegram', { chatId, description });
      return false;
    }

    return true;
  }

  async getWebhookInfo(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/getWebhookInfo`);
    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok || payload.ok !== true || typeof payload.result !== 'object' || payload.result === null) {
      return {};
    }

    return payload.result as Record<string, unknown>;
  }

  private sanitizeTelegramDescription(description: string): string {
    return description
      .replace(/https?:\/\/api\.telegram\.org\/bot[^\s"']+/gi, '[TELEGRAM_API_URL_REDACTED]')
      .replace(/\b\d{8,}:[A-Za-z0-9_-]{10,}\b/g, '[TOKEN_REDACTED]')
      .replace(/\b(?:token|auth)[\s:=]+[A-Za-z0-9:_-]{8,}/gi, '[TOKEN_REDACTED]')
      .replace(/https?:\/\/[^\s]+/gi, '[URL_REDACTED]')
      .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[TOKEN_REDACTED]');
  }

  private formatTelegramError(payload: Record<string, unknown>): { error_code?: number; description: string } {
    const errorCode = typeof payload.error_code === 'number' ? payload.error_code : undefined;
    const description = typeof payload.description === 'string'
      ? this.sanitizeTelegramDescription(payload.description)
      : 'Tidak ada deskripsi yang tersedia.';

    return {
      error_code: errorCode,
      description,
    };
  }

  private logTelegramApiError(action: string, payload: Record<string, unknown>): void {
    const error = this.formatTelegramError(payload);

    this.logger.warn(`${action} gagal`, {
      error_code: error.error_code,
      description: error.description,
    });
  }

  async deleteWebhook(): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: true }),
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok || payload.ok !== true) {
      this.logTelegramApiError('deleteWebhook', payload);
      return false;
    }

    return true;
  }

  async startPolling(onCommand: BotCommandHandler): Promise<void> {
    let offset = 0;

    while (true) {
      try {
        const response = await fetch(`${this.baseUrl}/getUpdates?offset=${offset}&timeout=30`);

        if (!response.ok) {
          const payload = (await response.json()) as Record<string, unknown>;

          if (response.status === 409) {
            const error = this.formatTelegramError(payload);

            this.logger.warn('Telegram Bot API getUpdates gagal dengan HTTP 409', {
              error_code: error.error_code,
              description: error.description,
            });

            const webhookInfo = await this.getWebhookInfo();
            const hasActiveWebhook = typeof webhookInfo.url === 'string' && webhookInfo.url.length > 0;

            if (hasActiveWebhook) {
              this.logger.warn('Webhook aktif terdeteksi. Untuk mode temporary yang memakai polling, webhook harus dinonaktifkan sebelum getUpdates bisa berjalan.');
              this.logger.warn('Instruksi: hapus webhook bot di Telegram melalui BotFather atau via API setWebhook dengan url kosong, lalu restart aplikasi.');
            } else {
              this.logger.warn('Kemungkinan ada proses aplikasi lain atau polling ganda yang sedang berjalan. Pastikan hanya ada satu instans getUpdates aktif.');
            }

            await this.wait(3000);
            continue;
          }

          this.logTelegramApiError('getUpdates', payload);
          await this.wait(1000);
          continue;
        }

        const payload = (await response.json()) as Record<string, unknown>;
        if (payload.ok !== true || !Array.isArray(payload.result)) {
          this.logTelegramApiError('getUpdates', payload);
          await this.wait(500);
          continue;
        }

        for (const item of payload.result) {
          const update = item as Record<string, unknown>;
          const message = update.message as Record<string, unknown> | undefined;

          if (!message || typeof message.chat !== 'object' || message.chat === null) {
            continue;
          }

          const updateId = Number(update.update_id ?? 0);
          const chat = message.chat as Record<string, unknown>;
          const chatId = Number(chat.id ?? 0);
          const text = typeof message.text === 'string' ? message.text : '';

          if (!chatId || !text) {
            offset = Math.max(offset, updateId + 1);
            continue;
          }

          if (chat.type !== 'private') {
            offset = Math.max(offset, updateId + 1);
            continue;
          }

          await onCommand(chatId, text.trim());
          offset = Math.max(offset, updateId + 1);
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown network error';
        this.logger.warn('Polling Telegram Bot API gagal sementara', { reason });
        await this.wait(1000);
      }
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
