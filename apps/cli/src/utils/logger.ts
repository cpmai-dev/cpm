/**
 * Production-grade logger for CPM CLI
 * Provides log levels, quiet mode, and consistent formatting
 */
import { createConsola, type LogLevel } from "consola";

export interface LoggerOptions {
  verbose?: boolean;
  quiet?: boolean;
}

/**
 * Log level mapping
 * quiet: only errors
 * normal: info, warn, error
 * verbose: all including debug
 */
function getLogLevel(options: LoggerOptions): LogLevel {
  if (options.quiet) return 0; // Only fatal/error
  if (options.verbose) return 4; // Debug and above
  return 3; // Info and above (default)
}

/**
 * Create a configured logger instance
 */
function createLogger(options: LoggerOptions = {}) {
  const consola = createConsola({
    level: getLogLevel(options),
    formatOptions: {
      date: false,
      colors: true,
      compact: true,
    },
  });

  return {
    /**
     * Success message
     */
    success: (message: string, ...args: unknown[]) => {
      consola.success(message, ...args);
    },

    /**
     * Warning message
     */
    warn: (message: string, ...args: unknown[]) => {
      consola.warn(message, ...args);
    },

    /**
     * Error message
     */
    error: (message: string, ...args: unknown[]) => {
      consola.error(message, ...args);
    },

    /**
     * Plain output (always shown, no prefix)
     * Use for formatted CLI output like tables, lists
     */
    log: (message: string) => {
      if (!options.quiet) {
        console.log(message);
      }
    },

    /**
     * Output a blank line
     */
    newline: () => {
      if (!options.quiet) {
        console.log();
      }
    },

    /**
     * Check if in quiet mode
     */
    isQuiet: () => options.quiet ?? false,
  };
}

// Default logger instance (can be reconfigured)
let loggerOptions: LoggerOptions = {};
let loggerInstance = createLogger(loggerOptions);

/**
 * Configure the global logger
 */
export function configureLogger(options: LoggerOptions): void {
  loggerOptions = options;
  loggerInstance = createLogger(options);
}

// Export convenience methods that use the global logger
export const logger = {
  success: (message: string, ...args: unknown[]) =>
    loggerInstance.success(message, ...args),
  warn: (message: string, ...args: unknown[]) =>
    loggerInstance.warn(message, ...args),
  error: (message: string, ...args: unknown[]) =>
    loggerInstance.error(message, ...args),
  log: (message: string) => loggerInstance.log(message),
  newline: () => loggerInstance.newline(),
  isQuiet: () => loggerInstance.isQuiet(),
};
