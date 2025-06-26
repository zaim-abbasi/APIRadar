import pino from 'pino';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

function sanitizeLog(str: string): string {
  // Remove non-printable and non-ASCII characters
  return str.replace(/[^\x20-\x7E]+/g, '');
}

const tag = {
  init: '[INIT]',
  scan: '[SCAN]',
  leak: '[LEAK]',
  farm: '[FARM]',
  discovery: '[DISCOVERY]',
  github: '[GITHUB]',
  db: '[DB]',
  error: '[ERROR]',
  warn: '[WARN]',
  info: '[INFO]',
};

// Get NODE_ENV without importing config to avoid circular dependency
const NODE_ENV = process.env['NODE_ENV'] || 'development';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'backend.log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
// Clear the log file on every backend start
fs.writeFileSync(logFile, '');

// Setup pino multistream for console and file
const streams = [
  // Pretty console in development
  ...(NODE_ENV === 'development'
    ? [{
        stream: pino.transport({
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
          },
        })
      }]
    : []),
  // Always log to file
  { stream: fs.createWriteStream(logFile, { flags: 'a' }) },
];

const loggerOptions: any = {
  level: NODE_ENV === 'development' ? 'debug' : 'info',
};
if (NODE_ENV === 'development') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
}

const baseLogger = pino(loggerOptions, pino.multistream(streams));

function format(tagLabel: keyof typeof tag, message: string) {
  return `${tag[tagLabel]} ${sanitizeLog(message)}`;
}

// Helper function for aligned status messages (no emoji)
function alignStatus(service: string, status: string, details?: string) {
  const padding = Math.max(0, 20 - service.length);
  const dots = '.'.repeat(padding);
  const detailsStr = details ? ` ${details}` : '';
  return `${service} ${dots} ${status}${detailsStr}`;
}

export const logger = {
  init: (message: string) => baseLogger.info(format('init', message)),
  scan: (repo: string, filePath: string) => {
    (globalThis as any).__activitySinceStartup = true;
    baseLogger.info(format('scan', `repo: ${sanitizeLog(repo)} | file: ${sanitizeLog(filePath)}`));
  },
  leak: (provider: string, repo: string) => {
    (globalThis as any).__activitySinceStartup = true;
    // Blue color for leaks, always print to console
    const msg = format('leak', `provider: ${sanitizeLog(provider)} | repo: ${sanitizeLog(repo)}`);
    // eslint-disable-next-line no-console
    console.log(chalk.blue(msg));
    baseLogger.info(msg);
  },
  warn: (message: string) => baseLogger.warn(format('warn', message)),
  error: (message: string) => baseLogger.error(format('error', message)),
  debug: (tagLabel: keyof typeof tag, message: string) => {
    if (NODE_ENV === 'development') baseLogger.debug(format(tagLabel, message));
  },
  status: (service: string, status: string, details?: string) => {
    baseLogger.info(format('init', alignStatus(service, status, details)));
  },
  rateLimit: (waitTime: number, resetTime: Date) => {
    // Only log once per reset window
    if (!(globalThis as any).__lastRateLimitResetTime) (globalThis as any).__lastRateLimitResetTime = 0;
    const minutes = Math.floor(waitTime / 60000);
    const seconds = Math.floor((waitTime % 60000) / 1000);
    const resetTimeStr = resetTime.toISOString().substring(11, 19);
    if ((globalThis as any).__lastRateLimitResetTime !== resetTime.getTime()) {
      baseLogger.warn(format('github', `GitHub Rate Limit Reached - Pausing scans for ${minutes}m ${seconds}s (resets at ${resetTimeStr} UTC)`));
      (globalThis as any).__lastRateLimitResetTime = resetTime.getTime();
    }
  },
  rateLimitReset: () => {
    baseLogger.info(format('github', 'GitHub Rate Limit Reset — Resuming scans...'));
  },
  raw: baseLogger,
}; 