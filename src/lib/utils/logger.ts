/**
 * Logger utility that only logs in development environment
 * This helps prevent console logs in production which impact performance
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';

// Global debug flag that can be toggled at runtime
let isDebugEnabled = false;

// Toggle for forcing debug logs off, even in development
// Set this to true to disable all non-essential logs
let forceLogsOff = true;

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

// Helper to determine if we should log
const shouldLog = (level: LogLevel): boolean => {
  // Always log errors regardless of settings
  if (level === 'error') return true;
  
  // If force logs off, suppress all non-error logs
  if (forceLogsOff) return false;
  
  // In prod mode, only log if debug is explicitly enabled
  if (!isDevelopment) return isDebugEnabled;
  
  // In dev mode, log based on debug flag
  if (level === 'debug') return isDebugEnabled;
  
  // Otherwise in dev mode, allow logs
  return true;
};

// Logger implementation
const logger = {
  /**
   * Enable or disable debug logging at runtime
   */
  enableDebug: (enable: boolean): void => {
    isDebugEnabled = enable;
    if (enable) {
      console.log('Debug logging enabled');
    }
  },
  
  /**
   * Force logs off/on (even in development)
   */
  setForceLogsOff: (force: boolean): void => {
    forceLogsOff = force;
    if (!force) {
      console.log('Logging forced on');
    }
  },
  
  /**
   * Standard log (only in development)
   */
  log: (message: any, ...args: any[]): void => {
    if (shouldLog('log')) {
      console.log(message, ...args);
    }
  },

  /**
   * Info log (only in development)
   */
  info: (message: any, ...args: any[]): void => {
    if (shouldLog('info')) {
      console.info(message, ...args);
    }
  },

  /**
   * Warning log (only in development)
   */
  warn: (message: any, ...args: any[]): void => {
    if (shouldLog('warn')) {
      console.warn(message, ...args);
    }
  },

  /**
   * Error log (only for critical errors)
   */
  error: (message: any, ...args: any[]): void => {
    // Always log errors, regardless of environment
    console.error(message, ...args);
  },

  /**
   * Debug log (only in development)
   */
  debug: (message: any, ...args: any[]): void => {
    if (shouldLog('debug')) {
      console.debug(message, ...args);
    }
  },

  /**
   * Log with function name context
   */
  fn: (fnName: string) => ({
    log: (message: string, ...args: any[]): void => {
      if (shouldLog('log')) {
        console.log(formatMessage(message, fnName), ...args);
      }
    },
    info: (message: string, ...args: any[]): void => {
      if (shouldLog('info')) {
        console.info(formatMessage(message, fnName), ...args);
      }
    },
    warn: (message: string, ...args: any[]): void => {
      if (shouldLog('warn')) {
        console.warn(formatMessage(message, fnName), ...args);
      }
    },
    error: (message: string, ...args: any[]): void => {
      // Always log errors for critical issues
      console.error(formatMessage(message, fnName), ...args);
    },
    debug: (message: string, ...args: any[]): void => {
      if (shouldLog('debug')) {
        console.debug(formatMessage(message, fnName), ...args);
      }
    }
  }),

  /**
   * Performance timing helpers
   */
  time: (label: string): void => {
    if (shouldLog('debug')) {
      timers[label] = {
        start: performance.now(),
        label
      };
    }
  },

  timeEnd: (label: string): number | null => {
    if (shouldLog('debug') && timers[label]) {
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
    if (shouldLog('log')) {
      if (collapsed) {
        console.groupCollapsed(label);
      } else {
        console.group(label);
      }
    }
  },

  groupEnd: (): void => {
    if (shouldLog('log')) {
      console.groupEnd();
    }
  }
};

export default logger; 