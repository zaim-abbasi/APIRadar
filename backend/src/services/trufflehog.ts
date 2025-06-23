import { spawn } from 'child_process';
import { config } from '../config/environment';

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
  private readonly truffleHogPath: string;

  constructor() {
    this.truffleHogPath = config.TRUFFLEHOG_PATH;
  }

  async scanRepository(repoUrl: string): Promise<ScanResult> {
    return new Promise((resolve) => {
      const results: TruffleHogResult[] = [];
      let errorOutput = '';

      // TruffleHog command arguments
      const args = [
        'git',
        repoUrl,
        '--json',
        '--no-verification',
        '--max-depth=10',
      ];

      const truffleHog = spawn(this.truffleHogPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
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
              continue;
            }
          }
        }

        resolve({
          repoUrl,
          results,
          error: errorOutput || '',
        });
      });

      truffleHog.on('error', (error) => {
        resolve({
          repoUrl,
          results: [],
          error: `Failed to spawn TruffleHog: ${error.message}`,
        });
      });

      // Set timeout to prevent hanging
      setTimeout(() => {
        truffleHog.kill('SIGTERM');
        resolve({
          repoUrl,
          results: [],
          error: 'TruffleHog scan timeout',
        });
      }, 60000); // 60 seconds timeout
    });
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