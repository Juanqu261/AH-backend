enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(
    level: LogLevel,
    message: string,
    meta?: any,
  ): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta
      ? ` | ${
          typeof meta === 'string'
            ? meta
            : JSON.stringify(meta, null, 2)
        }`
      : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  error(message: string, error?: any): void {
    const formatted = this.formatMessage(LogLevel.ERROR, message, error);
    console.error(formatted);
  }

  warn(message: string, meta?: any): void {
    const formatted = this.formatMessage(LogLevel.WARN, message, meta);
    console.warn(formatted);
  }

  info(message: string, meta?: any): void {
    const formatted = this.formatMessage(LogLevel.INFO, message, meta);
    console.log(formatted);
  }

  debug(message: string, meta?: any): void {
    if (this.isDevelopment) {
      const formatted = this.formatMessage(LogLevel.DEBUG, message, meta);
      console.debug(formatted);
    }
  }
}

export const logger = new Logger();
