import { Configuration } from '../models/Configuration';
import { logger } from '../utils/logger';

const DEFAULT_SCAN_STATE = {
  currentProviderIndex: 0,
  currentQueryIndex: 0,
  currentPage: 1,
  providerStates: {},
  scanStatus: 'idle'
};

export class ConfigurationService {
  static async getConfig(key: string): Promise<any> {
    const config = await Configuration.findOne({ key });
    return config ? config.value : null;
  }

  static async setConfig(key: string, value: any): Promise<boolean> {
    try {
      await Configuration.findOneAndUpdate(
        { key },
        { value, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      return true;
    } catch (error) {
      logger.error(`[CONFIG] Error setting config for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  static async getScanState(): Promise<any> {
    return this.getConfig('scan_state');
  }

  static async setScanState(scanState: any): Promise<boolean> {
    return this.setConfig('scan_state', scanState);
  }

  static async checkAndReinitialize(): Promise<boolean> {
    const scanState = await this.getScanState();
    if (!scanState) {
      await this.initializeDefaults();
      return true;
    }
    return false;
  }

  static async initializeDefaults(): Promise<void> {
    const success = await this.setScanState({ ...DEFAULT_SCAN_STATE, lastProcessedTime: Date.now() });
    if (!success) {
      throw new Error('Failed to initialize scan state');
    }
    logger.warn('[CONFIG] Scan state initialized to defaults');
  }
}
