/**
 * Logger utility that only logs in development environment
 * This helps prevent console logs in production which impact performance
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

// Helper to add function name to log messages
const formatMessage = (message: string, fnName?: string): string => {
  return fnName ? `[${fnName}] ${message}` : message;
};

// Performance helper
interface TimerRecord {
  start: number;
  label: string;
}

// Active timers
const timers: Record<string, TimerRecord> = {};

// Logger implementation
const logger = {
  /**
   * Standard log (only in development)
   */
  log: (message: any, ...args: any[]): void => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  },

  /**
   * Info log (only in development)
   */
  info: (message: any, ...args: any[]): void => {
    if (isDevelopment) {
      console.info(message, ...args);
    }
  },

  /**
   * Warning log (only in development)
   */
  warn: (message: any, ...args: any[]): void => {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
  },

  /**
   * Error log (only for critical errors)
   */
  error: (message: any, ...args: any[]): void => {
    // Keeping error logs for critical issues
    console.error(message, ...args);
  },

  /**
   * Debug log (only in development)
   */
  debug: (message: any, ...args: any[]): void => {
    if (isDevelopment) {
      console.debug(message, ...args);
    }
  },

  /**
   * Log with function name context
   */
  fn: (fnName: string) => ({
    log: (message: string, ...args: any[]): void => {
      if (isDevelopment) {
        console.log(formatMessage(message, fnName), ...args);
      }
    },
    info: (message: string, ...args: any[]): void => {
      if (isDevelopment) {
        console.info(formatMessage(message, fnName), ...args);
      }
    },
    warn: (message: string, ...args: any[]): void => {
      if (isDevelopment) {
        console.warn(formatMessage(message, fnName), ...args);
      }
    },
    error: (message: string, ...args: any[]): void => {
      // Keeping error logs for critical issues
      console.error(formatMessage(message, fnName), ...args);
    },
    debug: (message: string, ...args: any[]): void => {
      if (isDevelopment) {
        console.debug(formatMessage(message, fnName), ...args);
      }
    }
  }),

  /**
   * Performance timing helpers
   */
  time: (label: string): void => {
    if (isDevelopment) {
      timers[label] = {
        start: performance.now(),
        label
      };
    }
  },

  timeEnd: (label: string): number | null => {
    if (isDevelopment && timers[label]) {
      const duration = performance.now() - timers[label].start;
      console.log(`${label}: ${duration.toFixed(2)}ms`);
      delete timers[label];
      return duration;
    }
    return null;
  },

  /**
   * Group logs together
   */
  group: (label: string, collapsed = false): void => {
    if (isDevelopment) {
      if (collapsed) {
        console.groupCollapsed(label);
      } else {
        console.group(label);
      }
    }
  },

  groupEnd: (): void => {
    if (isDevelopment) {
      console.groupEnd();
    }
  }
};

export default logger; 