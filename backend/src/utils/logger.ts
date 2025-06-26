import pino from 'pino';
import chalk from 'chalk';

function sanitizeLog(str: string): string {
  // Remove non-printable and non-ASCII characters
  return str.replace(/[^\x20-\x7E]+/g, '');
}

const tag = {
  init: 'INIT',
  scan: 'SCAN',
  leak: 'LEAK',
  farm: 'FARM',
  discovery: 'DISCOVERY',
  github: 'GITHUB',
  db: 'DB',
  error: 'ERROR',
  warn: 'WARN',
  info: 'INFO',
} as const;

const colorMap: Record<string, chalk.Chalk> = {
  INIT: chalk.hex('#a259f7'), // purple
  SCAN: chalk.green,
  LEAK: chalk.blue,
  WARN: chalk.hex('#ff9900'), // orange
  ERROR: chalk.red,
  GITHUB: chalk.cyan,
  DB: chalk.magenta,
  INFO: chalk.white,
};

// Get NODE_ENV without importing config to avoid circular dependency
const NODE_ENV = process.env['NODE_ENV'] || 'development';

// Setup pino for console only
const loggerOptions: any = {
  level: NODE_ENV === 'development' ? 'debug' : 'info',
};
if (NODE_ENV === 'development') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname,time,translateTime',
    },
  };
}
const baseLogger = pino(loggerOptions);

function format(type: keyof typeof tag, message: string) {
  const label = `[${tag[type]}]`;
  return `${label} ${sanitizeLog(message)}`;
}

// Helper function for aligned status messages (no emoji)
function alignStatus(service: string, status: string, details?: string) {
  const padding = Math.max(0, 20 - service.length);
  const dots = '.'.repeat(padding);
  const detailsStr = details ? ` ${details}` : '';
  return `${service} ${dots} ${status}${detailsStr}`;
}

export const logger = {
  init: (message: string) => {
    const msg = format('init', message);
    (colorMap['INIT'] ?? chalk.white)(msg) && console.log((colorMap['INIT'] ?? chalk.white)(msg));
  },
  scan: (repo: string, filePath: string) => {
    (globalThis as any).__activitySinceStartup = true;
    const msg = format('scan', `repo: ${sanitizeLog(repo)} | file: ${sanitizeLog(filePath)}`);
    (colorMap['SCAN'] ?? chalk.white)(msg) && console.log((colorMap['SCAN'] ?? chalk.white)(msg));
  },
  leak: (provider: string, repo: string) => {
    (globalThis as any).__activitySinceStartup = true;
    const msg = format('leak', `Provider: ${sanitizeLog(provider)}, Repo: ${sanitizeLog(repo)}`);
    (colorMap['LEAK'] ?? chalk.white)(msg) && console.log((colorMap['LEAK'] ?? chalk.white)(msg));
  },
  warn: (message: string) => {
    const msg = format('warn', message);
    (colorMap['WARN'] ?? chalk.white)(msg) && console.log((colorMap['WARN'] ?? chalk.white)(msg));
  },
  error: (message: string) => {
    const msg = format('error', message);
    (colorMap['ERROR'] ?? chalk.white)(msg) && console.log((colorMap['ERROR'] ?? chalk.white)(msg));
  },
  debug: (type: keyof typeof tag, message: string) => {
    if (process.env['NODE_ENV'] === 'development') {
      const msg = format(type, message);
      (colorMap['INFO'] ?? chalk.white)(msg) && console.log((colorMap['INFO'] ?? chalk.white)(msg));
    }
  },
  status: (service: string, status: string, details?: string) => {
    const msg = format('init', alignStatus(service, status, details));
    (colorMap['INIT'] ?? chalk.white)(msg) && console.log((colorMap['INIT'] ?? chalk.white)(msg));
  },
  rateLimit: (waitTime: number, resetTime: Date) => {
    if (!(globalThis as any).__lastRateLimitResetTime) (globalThis as any).__lastRateLimitResetTime = 0;
    const minutes = Math.floor(waitTime / 60000);
    const seconds = Math.floor((waitTime % 60000) / 1000);
    const resetTimeStr = resetTime.toISOString().substring(11, 19);
    if ((globalThis as any).__lastRateLimitResetTime !== resetTime.getTime()) {
      const msg = format('warn', `GitHub Rate Limit Reached - Pausing scans for ${minutes}m ${seconds}s (resets at ${resetTimeStr} UTC)`);
      (colorMap['WARN'] ?? chalk.white)(msg) && console.log((colorMap['WARN'] ?? chalk.white)(msg));
      (globalThis as any).__lastRateLimitResetTime = resetTime.getTime();
    }
  },
  rateLimitReset: () => {
    const msg = format('init', 'GitHub Rate Limit Reset — Resuming scans...');
    (colorMap['INIT'] ?? chalk.white)(msg) && console.log((colorMap['INIT'] ?? chalk.white)(msg));
  },
  raw: baseLogger,
}; 