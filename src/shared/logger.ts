
// Production-safe logging utility
// Replaces console.log statements with configurable logger

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogConfig {
  level: LogLevel;
  production: boolean;
  persist: boolean;
  maxLogs: number;
}

class Logger {
  private config: LogConfig;
  private logs: Array<{timestamp: Date; level: LogLevel; message: string; data?: any}> = [];

  constructor() {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG,
      production: process.env.NODE_ENV === 'production',
      persist: false,
      maxLogs: 1000
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private addToHistory(level: LogLevel, message: string, data?: any) {
    if (this.logs.length >= this.config.maxLogs) {
      this.logs.shift();
    }
    this.logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });
  }

  error(message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      if (!this.config.production) {
        console.error(`[ERROR] ${message}`, error);
      }
      this.addToHistory(LogLevel.ERROR, message, error);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      if (!this.config.production) {
        console.warn(`[WARN] ${message}`, data);
      }
      this.addToHistory(LogLevel.WARN, message, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      if (!this.config.production) {
        console.info(`[INFO] ${message}`, data);
      }
      this.addToHistory(LogLevel.INFO, message, data);
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      if (!this.config.production) {
        console.log(`[DEBUG] ${message}`, data);
      }
      this.addToHistory(LogLevel.DEBUG, message, data);
    }
  }

  // Get recent logs for debugging
  getRecentLogs(count = 100): Array<any> {
    return this.logs.slice(-count);
  }

  // Clear log history
  clearLogs(): void {
    this.logs = [];
  }

  // Update configuration
  setConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Export logs for analysis
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
export const logger = new Logger();

// For backward compatibility during migration
export const log = logger.debug.bind(logger);
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logInfo = logger.info.bind(logger);
