export type Logger = {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(level: LogLevel = 'info'): Logger {
  const currentPriority = LEVEL_PRIORITY[level] ?? LEVEL_PRIORITY.info;

  const emit = (entryLevel: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (LEVEL_PRIORITY[entryLevel] < currentPriority) {
      return;
    }

    const timestamp = new Date().toISOString();
    const payload = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] ${entryLevel.toUpperCase()} ${message}${payload}`);
  };

  return {
    debug: (message, meta) => emit('debug', message, meta),
    info: (message, meta) => emit('info', message, meta),
    warn: (message, meta) => emit('warn', message, meta),
    error: (message, meta) => emit('error', message, meta),
  };
}
