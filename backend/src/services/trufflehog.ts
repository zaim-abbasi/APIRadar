import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export interface TruffleHogResult {
  redactedKey: string;
  provider: string;
  filePath?: string;
  commitHash?: string;
  raw?: string;
}

export interface ScanResult {
  repoUrl: string;
  results: TruffleHogResult[];
  error?: string;
}

export class TruffleHogService {
  private readonly trufflehogCmd: string;
  private readonly tempDir: string;

  constructor() {
    // Resolve TruffleHog path with fallbacks
    this.trufflehogCmd = this.resolveTruffleHogPath();
    
    // Create custom temp directory to avoid Windows locking issues
    this.tempDir = this.setupTempDirectory();
    
    logger.status('TruffleHog', 'Ready', this.trufflehogCmd);
  }

  private setupTempDirectory(): string {
    const tempDir = path.join(process.cwd(), 'tmp', 'trufflehog');
    
    try {
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Test write permissions
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      return tempDir;
    } catch (error) {
      logger.warn('trufflehog', `Failed to create custom temp directory ${tempDir}, using system temp: ${error instanceof Error ? error.message : String(error)}`);
      return os.tmpdir();
    }
  }

  private resolveTruffleHogPath(): string {
    // First try environment variable
    if (process.env['TRUFFLEHOG_PATH'] && process.env['TRUFFLEHOG_PATH'] !== 'trufflehog') {
      logger.debug('trufflehog', `Using TRUFFLEHOG_PATH from env: ${process.env['TRUFFLEHOG_PATH']}`);
      return process.env['TRUFFLEHOG_PATH'];
    }

    // Fallback to venv paths
    const isWindows = os.platform() === 'win32';
    const currentDir = process.cwd();
    logger.debug('trufflehog', `Current working directory: ${currentDir}`);
    
    const venvPath = isWindows 
      ? path.join(currentDir, 'trufflehog-venv', 'Scripts', 'trufflehog.exe')
      : path.join(currentDir, 'trufflehog-venv', 'bin', 'trufflehog');

    logger.debug('trufflehog', `Checking venv path: ${venvPath}`);

    // Check if venv path exists
    try {
      if (fs.existsSync(venvPath)) {
        const resolvedPath = path.resolve(venvPath);
        logger.debug('trufflehog', `Found TruffleHog at: ${resolvedPath}`);
        return resolvedPath;
      } else {
        logger.warn('trufflehog', `TruffleHog not found at expected path: ${venvPath}`);
      }
    } catch (error) {
      logger.warn('trufflehog', `Error checking venv path: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Try alternative paths
    const alternativePaths = [
      path.join(__dirname, '..', '..', 'trufflehog-venv', 'Scripts', 'trufflehog.exe'),
      path.join(__dirname, '..', '..', 'trufflehog-venv', 'bin', 'trufflehog'),
      './trufflehog-venv/Scripts/trufflehog.exe',
      './trufflehog-venv/bin/trufflehog'
    ];

    for (const altPath of alternativePaths) {
      try {
        const fullPath = path.resolve(altPath);
        logger.debug('trufflehog', `Trying alternative path: ${fullPath}`);
        if (fs.existsSync(fullPath)) {
          logger.debug('trufflehog', `Found TruffleHog at alternative path: ${fullPath}`);
          return fullPath;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    // Final fallback to system PATH
    logger.warn('trufflehog', 'TruffleHog not found in venv, falling back to system PATH');
    return 'trufflehog';
  }

  async scanRepository(repoUrl: string): Promise<ScanResult> {
    return new Promise((resolve) => {
      const results: TruffleHogResult[] = [];
      let errorOutput = '';

      // TruffleHog command arguments - simplified for Python version
      const args = [
        repoUrl,
        '--json'
      ];

      logger.debug('trufflehog', `Executing: ${this.trufflehogCmd} ${args.join(' ')}`);

      const truffleHog = spawn(this.trufflehogCmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Set custom temp directory to avoid Windows locking issues
          ['TEMP']: this.tempDir,
          ['TMP']: this.tempDir,
          ['TMPDIR']: this.tempDir,
          // Ensure we're using the venv's Python if available
          ['PATH']: process.env['PATH'] || ''
        },
        cwd: this.tempDir // Set working directory to temp dir
      });

      let stdout = '';
      let stderr = '';

      truffleHog.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      truffleHog.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      truffleHog.on('close', (code) => {
        if (code !== 0 && code !== null) {
          errorOutput = stderr || `TruffleHog exited with code ${code}`;
          logger.error('trufflehog', `Scan failed for ${repoUrl}: ${errorOutput}`);
        }

        // Parse JSON output
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          for (const line of lines) {
            try {
              const result = JSON.parse(line) as any;
              const processed = this.processResult(result);
              if (processed) {
                results.push(processed);
              }
            } catch (error) {
              // Skip invalid JSON lines
              logger.debug('trufflehog', `Skipping invalid JSON line: ${line.substring(0, 100)}...`);
              continue;
            }
          }
        }

        // Clean up temp files with retry logic for Windows
        this.cleanupTempFiles();

        resolve({
          repoUrl,
          results,
          error: errorOutput || '',
        });
      });

      truffleHog.on('error', (error) => {
        const errorMsg = `Failed to spawn TruffleHog: ${error.message}`;
        logger.error('trufflehog', errorMsg);
        resolve({
          repoUrl,
          results: [],
          error: errorMsg,
        });
      });

      // Set timeout to prevent hanging
      setTimeout(() => {
        truffleHog.kill('SIGTERM');
        const timeoutMsg = 'TruffleHog scan timeout';
        logger.warn('trufflehog', `${timeoutMsg} for ${repoUrl}`);
        resolve({
          repoUrl,
          results: [],
          error: timeoutMsg,
        });
      }, 60000); // 60 seconds timeout
    });
  }

  private cleanupTempFiles(): void {
    try {
      // Clean up any temporary files created by TruffleHog
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            fs.unlinkSync(filePath);
          } else if (stat.isDirectory()) {
            this.removeDirectoryRecursive(filePath);
          }
        } catch (error) {
          // Ignore cleanup errors - files might be locked on Windows
          logger.debug('trufflehog', `Could not clean up temp file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
      logger.debug('trufflehog', `Temp cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private removeDirectoryRecursive(dirPath: string): void {
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          fs.unlinkSync(filePath);
        } else if (stat.isDirectory()) {
          this.removeDirectoryRecursive(filePath);
        }
      }
      fs.rmdirSync(dirPath);
    } catch (error) {
      // Ignore cleanup errors
      logger.debug('trufflehog', `Could not remove directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private processResult(result: any): TruffleHogResult | null {
    try {
      const detectorName = result.DetectorName?.toLowerCase() || '';
      const raw = result.Raw || '';
      
      if (!raw || !detectorName) {
        return null;
      }

      // Map detector names to our provider names
      const provider = this.mapDetectorToProvider(detectorName);
      
      // Redact the key for security
      const redactedKey = this.redactKey(raw, provider);

      return {
        redactedKey,
        provider,
        filePath: result.SourceMetadata?.Data?.Filesystem?.file || undefined,
        commitHash: result.SourceMetadata?.Data?.Git?.commit || undefined,
        raw: '', // Always a string, never undefined
      };
    } catch (error) {
      return null;
    }
  }

  private mapDetectorToProvider(detectorName: string): string {
    const mapping: Record<string, string> = {
      'openai': 'openai',
      'anthropic': 'anthropic',
      'google': 'google-ai',
      'googleai': 'google-ai',
      'cohere': 'cohere',
      'aws': 'aws',
      'stripe': 'stripe',
      'github': 'github',
      'discord': 'discord',
      'twilio': 'twilio',
      'sendgrid': 'sendgrid',
    };

    for (const [key, value] of Object.entries(mapping)) {
      if (detectorName.includes(key)) {
        return value;
      }
    }

    return 'other';
  }

  private redactKey(key: string, provider: string): string {
    if (!key) return '****';

    const keyStr = key.toString().trim();
    
    // Provider-specific redaction patterns
    switch (provider) {
      case 'openai':
        if (keyStr.startsWith('sk-')) {
          return `sk-****${keyStr.slice(-8)}`;
        }
        break;
      case 'anthropic':
        if (keyStr.startsWith('sk-ant-')) {
          return `sk-ant-****${keyStr.slice(-8)}`;
        }
        break;
      case 'google-ai':
        if (keyStr.startsWith('AIzaSy')) {
          return `AIzaSy****${keyStr.slice(-8)}`;
        }
        break;
      default:
        // Generic redaction
        if (keyStr.length > 16) {
          return `****${keyStr.slice(-8)}`;
        }
        break;
    }

    // Fallback redaction
    if (keyStr.length > 8) {
      return `****${keyStr.slice(-4)}`;
    }
    
    return '****';
  }
}

export const truffleHogService = new TruffleHogService();