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

export const logger = {
  info: (tagLabel: keyof typeof tag, message: string) => baseLogger.info(format(tagLabel, message)),
  warn: (tagLabel: keyof typeof tag, message: string) => baseLogger.warn(format(tagLabel, message)),
  error: (tagLabel: keyof typeof tag, message: string) => baseLogger.error(format(tagLabel, message)),
  debug: (tagLabel: keyof typeof tag, message: string) => {
    if (NODE_ENV === 'development') baseLogger.debug(format(tagLabel, message));
  },
  raw: baseLogger,
}; 