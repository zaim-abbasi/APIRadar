import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const NODE_ENV = process.env['NODE_ENV'] || 'development';
const LOG_FILE = path.join(process.cwd(), 'logs', 'logs.txt');

const colors: Record<string, chalk.Chalk> = {
  INIT: chalk.hex('#B24BF3'),
  SCAN: chalk.hex('#39FF14'),
  LEAK: chalk.hex('#00F3FF').bold,
  WARN: chalk.hex('#FFD700'),
  ERROR: chalk.hex('#FF0055'),
};

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

class TitanLogger {
  private buffer: string[] = [];
  private logStream: fs.WriteStream;
  private lastRateLimitResetTime = 0;
  private _hasActivity = false;

  constructor() {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    this.logStream = fs.createWriteStream(LOG_FILE, { flags: 'w' });
    setInterval(() => this.flush(), 2000).unref();
    process.on('exit', () => this.syncFlush());
    process.on('SIGINT', () => { this.syncFlush(); process.exit(0); });
    process.on('SIGTERM', () => { this.syncFlush(); process.exit(0); });
  }

  get hasActivity() { return this._hasActivity; }

  private flush() {
    if (!this.buffer.length) return;
    this.logStream.write(this.buffer.join('\n') + '\n');
    this.buffer = [];
  }

  private syncFlush() {
    if (!this.buffer.length) return;
    try { fs.appendFileSync(LOG_FILE, this.buffer.join('\n') + '\n'); } catch { }
    this.buffer = [];
  }

  private format(tag: string, message: string): string {
    return /^\[.+?\]/.test(message) ? message : `[${tag}] ${message}`;
  }

  private log(tag: string, message: string, toConsole = true) {
    const msg = this.format(tag, message);
    this.buffer.push(`[${new Date().toISOString()}] ${stripAnsi(msg)}`);
    if (toConsole) console.log((colors[tag] ?? chalk.white)(msg));
  }

  init(message: string) { this.log('INIT', message); }

  scan(repo: string, filePath: string) {
    this._hasActivity = true;
    this.log('SCAN', `repo: ${repo} | file: ${filePath}`, NODE_ENV !== 'production');
  }

  leak(provider: string, repo: string) {
    this._hasActivity = true;
    this.log('LEAK', `Provider: ${provider}, Repo: ${repo}`);
  }

  warn(message: string) { this.log('WARN', message); }
  error(message: string) { this.log('ERROR', message); }

  debug(type: string, message: string) {
    if (NODE_ENV === 'development') this.log('INFO', this.format(type.toUpperCase(), message));
  }

  status(service: string, status: string, details?: string) {
    const padding = '.'.repeat(Math.max(0, 24 - service.length));
    this.log('INIT', `${service} ${padding} ${status}${details ? ` ${details}` : ''}`);
  }

  rateLimit(waitTime: number, resetTime: Date) {
    if (this.lastRateLimitResetTime === resetTime.getTime()) return;
    const m = Math.floor(waitTime / 60000);
    const s = Math.floor((waitTime % 60000) / 1000);
    this.log('WARN', `GitHub Rate Limit Reached - Pausing scans for ${m}m ${s}s (resets at ${resetTime.toISOString().substring(11, 19)} UTC)`);
    this.lastRateLimitResetTime = resetTime.getTime();
  }

  rateLimitReset() { this.log('INIT', 'GitHub Rate Limit Reset — Resuming scans...'); }
}

export const logger = new TitanLogger();