import { Configuration } from '../models/Configuration';
import { logger } from '../utils/logger';

const DEFAULT_SCAN_STATE = {
  currentProviderIndex: 0,
  currentQueryIndex: 0,
  currentPage: 1,
  lastProcessedTime: Date.now(),
  providerStates: {},
  scanStatus: 'idle'
};

export class ConfigurationService {
  static async getConfig(key: string): Promise<any> {
    try {
      const config = await Configuration.findOne({ key });
      return config ? config.value : null;
    } catch (error) {
      logger.error(`[CONFIG] Error getting config for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
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
    try {
      const scanState = await this.getScanState();
      if (!scanState) {
        await this.forceReinitialize();
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`[CONFIG] Error checking configurations: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  static async forceReinitialize(): Promise<void> {
    const success = await this.setScanState({ ...DEFAULT_SCAN_STATE, lastProcessedTime: Date.now() });
    if (!success) {
      throw new Error('Failed to set scan state');
    }
    logger.warn('[CONFIG] Scan state reinitialized to defaults');
  }

  static async initializeDefaults(): Promise<void> {
    const scanState = await this.getScanState();
    if (!scanState) {
      const success = await this.setScanState({ ...DEFAULT_SCAN_STATE, lastProcessedTime: Date.now() });
      if (!success) {
        throw new Error('Failed to initialize scan state');
      }
      logger.warn('[CONFIG] Initialized scan state to defaults');
    }
  }
}
