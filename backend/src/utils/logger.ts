import pino from 'pino';

const tag = {
  init: '[INIT]',
  leak: '[LEAK]',
  farm: '[FARM]',
  discovery: '[DISCOVERY]',
  github: '[GITHUB]',
  db: '[DB]',
  error: '[ERROR]',
  warn: '[WARN]',
  info: '[INFO]',
  trufflehog: '[TRUFFLEHOG]',
};

// Get NODE_ENV without importing config to avoid circular dependency
const NODE_ENV = process.env['NODE_ENV'] || 'development';

const baseLogger = pino({
  level: NODE_ENV === 'development' ? 'debug' : 'info',
  ...(NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

function format(tagLabel: keyof typeof tag, message: string) {
  return `${tag[tagLabel]} ${message}`;
}

// Helper function for aligned status messages (no emoji)
function alignStatus(service: string, status: string, details?: string) {
  const padding = Math.max(0, 20 - service.length);
  const dots = '.'.repeat(padding);
  const detailsStr = details ? ` ${details}` : '';
  return `${service} ${dots} ${status}${detailsStr}`;
}

export const logger = {
  info: (tagLabel: keyof typeof tag, message: string) => baseLogger.info(format(tagLabel, message)),
  warn: (tagLabel: keyof typeof tag, message: string) => baseLogger.warn(format(tagLabel, message)),
  error: (tagLabel: keyof typeof tag, message: string) => baseLogger.error(format(tagLabel, message)),
  debug: (tagLabel: keyof typeof tag, message: string) => {
    if (NODE_ENV === 'development') baseLogger.debug(format(tagLabel, message));
  },
  status: (service: string, status: string, details?: string) => {
    baseLogger.info(format('init', alignStatus(service, status, details)));
  },
  rateLimit: (waitTime: number, resetTime: Date) => {
    const minutes = Math.floor(waitTime / 60000);
    const seconds = Math.floor((waitTime % 60000) / 1000);
    const resetTimeStr = resetTime.toISOString().substring(11, 19);
    baseLogger.warn(format('github', `GitHub Rate Limit Reached - Pausing scans for ${minutes}m ${seconds}s (resets at ${resetTimeStr} UTC)`));
  },
  rateLimitReset: () => {
    baseLogger.info(format('github', 'GitHub Rate Limit Reset — Resuming scans...'));
  },
  raw: baseLogger,
}; 