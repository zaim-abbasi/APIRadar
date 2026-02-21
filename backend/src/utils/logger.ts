import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const LOG = path.join(process.cwd(), 'logs', 'logs.txt');
const COLORS: Record<string, any> = { INIT: chalk.hex('#B24BF3'), SCAN: chalk.hex('#39FF14'), LEAK: chalk.hex('#00F3FF').bold, WARN: chalk.hex('#FFD700'), ERROR: chalk.hex('#FF0055'), FARM: chalk.hex('#FF8C00'), EVENTS: chalk.hex('#00CED1') };

class TitanLogger {
  private buf: string[] = [];
  private stream: fs.WriteStream;
  private lastReset = 0;
  private _active = false;

  constructor() {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    this.stream = fs.createWriteStream(LOG, { flags: 'w' });
    setInterval(() => this.flush(), 2000).unref();
    ['exit', 'SIGINT', 'SIGTERM'].forEach(e => process.on(e, () => { this.flush(true); if (e !== 'exit') process.exit(0); }));
  }

  get hasActivity() { return this._active; }

  private flush(sync = false) {
    if (!this.buf.length) return;
    const d = this.buf.join('\n') + '\n';
    sync ? fs.appendFileSync(LOG, d) : this.stream.write(d);
    this.buf = [];
  }

  private log(tag: string, msg: string, consoleOut = true) {
    const txt = /^\[.+?\]/.test(msg) ? msg : `[${tag}] ${msg}`;
    this.buf.push(`[${new Date().toISOString()}] ${txt.replace(/\x1b\[[0-9;]*m/g, '')}`);
    if (consoleOut) console.log((COLORS[tag] ?? chalk.white)(txt));
  }

  init(m: string) { this.log('INIT', m); }
  scan(repo: string, file: string) { this._active = true; this.log('SCAN', `repo: ${repo} | file: ${file}`, process.env['NODE_ENV'] !== 'production'); }
  leak(prov: string, repo: string) { this._active = true; this.log('LEAK', `Provider: ${prov}, Repo: ${repo}`); }
  farm(m: string) { this.log('FARM', `[FARM] ${m}`); }
  events(m: string) { this.log('EVENTS', `[EVENTS] ${m}`); }
  warn(m: string) { this.log('WARN', m); }
  error(m: string) { this.log('ERROR', m); }
  debug(t: string, m: string) { if (process.env['NODE_ENV'] === 'development') this.log('INFO', `[${t.toUpperCase()}] ${m}`); }
  status(svc: string, st: string, det?: string) { this.log('INIT', `${svc} ${'.'.repeat(Math.max(0, 24 - svc.length))} ${st}${det ? ` ${det}` : ''}`); }

  rateLimit(wait: number, reset: Date) {
    if (this.lastReset === reset.getTime()) return;
    this.log('WARN', `Rate Limit - Pausing ${Math.floor(wait / 60000)}m ${Math.floor((wait % 60000) / 1000)}s (until ${reset.toISOString().substring(11, 19)} UTC)`);
    this.lastReset = reset.getTime();
  }
  rateLimitReset() { this.log('INIT', 'Rate Limit Reset — Resuming...'); }
}

export const logger = new TitanLogger();