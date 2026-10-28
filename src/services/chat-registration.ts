import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class ChatRegistrationStore {
  constructor(private readonly filePath: string) {}

  load(): number | null {
    if (!existsSync(this.filePath)) {
      return null;
    }

    const rawValue = readFileSync(this.filePath, 'utf8').trim();
    const parsed = Number(rawValue);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  save(chatId: number): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, String(chatId), 'utf8');
    chmodSync(this.filePath, 0o600);
  }

  clear(): void {
    if (existsSync(this.filePath)) {
      unlinkSync(this.filePath);
    }
  }
}
