/**
 * Logger Utility
 * Provides standardized logging functionality
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger class for standardized logging
 */
class Logger {
  private context: string;
  private enabled: boolean;
  
  /**
   * Create a new logger
   * @param context - The context for this logger (e.g., component or module name)
   * @param enabled - Whether logging is enabled
   */
  constructor(context: string, enabled: boolean = true) {
    this.context = context;
    this.enabled = enabled;
  }
  
  /**
   * Format a log message with context and timestamp
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data to include
   * @returns Formatted log message
   */
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;
  }
  
  /**
   * Log a debug message
   * @param message - Log message
   * @param data - Optional data to include
   */
  debug(message: string, data?: any): void {
    if (!this.enabled) return;
    
    console.debug(this.formatMessage('debug', message), data || '');
  }
  
  /**
   * Log an info message
   * @param message - Log message
   * @param data - Optional data to include
   */
  info(message: string, data?: any): void {
    if (!this.enabled) return;
    
    console.info(this.formatMessage('info', message), data || '');
  }
  
  /**
   * Log a warning message
   * @param message - Log message
   * @param data - Optional data to include
   */
  warn(message: string, data?: any): void {
    if (!this.enabled) return;
    
    console.warn(this.formatMessage('warn', message), data || '');
  }
  
  /**
   * Log an error message
   * @param message - Log message
   * @param error - Optional error to include
   */
  error(message: string, error?: any): void {
    if (!this.enabled) return;
    
    console.error(this.formatMessage('error', message), error || '');
  }
  
  /**
   * Create a child logger with a sub-context
   * @param subContext - The sub-context for the child logger
   * @returns A new logger with the combined context
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`, this.enabled);
  }
}

// Create loggers for different modules
export const aiLogger = new Logger('AI');
export const toolsLogger = aiLogger.child('Tools');
export const memoryLogger = aiLogger.child('Memory');
export const agentLogger = aiLogger.child('Agent');

/**
 * Create a logger for a specific module
 * @param module - The module name
 * @returns A new logger for the module
 */
export function createLogger(module: string): Logger {
  return new Logger(module);
}
