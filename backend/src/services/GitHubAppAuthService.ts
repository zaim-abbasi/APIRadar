import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

interface InstallationToken {
  token: string;
  expiresAt: number;
}

export class GitHubAppAuthService {
  private appId: string;
  private privateKey: string | null = null;
  private cachedInstallationToken: InstallationToken | null = null;
  private installationId: number | null = null;

  constructor() {
    this.appId = process.env['GITHUB_APP_ID'] || config.GITHUB_APP_ID || '';
    this.loadPrivateKey();
  }

  private loadPrivateKey(): void {
    const envKey = process.env['GITHUB_APP_PRIVATE_KEY'] || config.GITHUB_APP_PRIVATE_KEY;
    if (envKey) {
      this.privateKey = envKey.replace(/\\n/g, '\n');
      logger.init('[GITHUB-APP] Loaded private key from GITHUB_APP_PRIVATE_KEY env variable');
      return;
    }

    const candidatePaths = [
      process.env['GITHUB_APP_PRIVATE_KEY_PATH'] || config.GITHUB_APP_PRIVATE_KEY_PATH,
      path.join(process.cwd(), 'keys', 'github-app.private-key.pem'),
      path.join(process.cwd(), '..', 'keys', 'github-app.private-key.pem'),
      path.join(process.cwd(), 'github-app.private-key.pem'),
    ].filter((p): p is string => Boolean(p));

    for (const keyPath of candidatePaths) {
      try {
        if (fs.existsSync(keyPath)) {
          this.privateKey = fs.readFileSync(keyPath, 'utf8');
          logger.init(`[GITHUB-APP] Loaded private key from ${keyPath}`);
          return;
        }
      } catch {
        // ignore file read error
      }
    }
  }

  private generateAppJwt(): string {
    if (!this.privateKey) {
      throw new Error('GitHub App Private Key is missing');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + (10 * 60),
      iss: this.appId,
    };

    return jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }

  private async fetchInstallationId(appJwt: string): Promise<number> {
    if (this.installationId !== null) return this.installationId;

    const res = await axios.get('https://api.github.com/app/installations', {
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
      throw new Error('No GitHub App installations found for this account');
    }

    const foundId = Number(res.data[0].id);
    this.installationId = foundId;
    logger.init(`[GITHUB-APP] Discovered Installation ID: ${this.installationId}`);
    return foundId;
  }

  async getValidToken(): Promise<string> {
    const now = Date.now();
    
    if (this.cachedInstallationToken && (this.cachedInstallationToken.expiresAt - now > 5 * 60 * 1000)) {
      return this.cachedInstallationToken.token;
    }

    try {
      const appJwt = this.generateAppJwt();
      const installId = await this.fetchInstallationId(appJwt);

      const res = await axios.post(
        `https://api.github.com/app/installations/${installId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      const token = String(res.data.token);
      const expiresAt = new Date(res.data.expires_at).getTime();

      this.cachedInstallationToken = { token, expiresAt };
      logger.init(`[GITHUB-APP] Successfully minted GitHub App Installation Access Token (valid for 60m)`);

      return token;
    } catch (err: any) {
      logger.warn(`[GITHUB-APP] Failed to mint installation token: ${err.message}`);
      if (this.cachedInstallationToken) return this.cachedInstallationToken.token;
      throw err;
    }
  }

  async getAuthHeader(): Promise<Record<string, string>> {
    try {
      const token = await this.getValidToken();
      return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' };
    } catch {
      return { Accept: 'application/vnd.github.v3+json' };
    }
  }
}

export const gitHubAppAuthService = new GitHubAppAuthService();
