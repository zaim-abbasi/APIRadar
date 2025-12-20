import { Configuration } from '../models/Configuration';

export class ConfigurationService {
  static async getConfig(key: string): Promise<any> {
    try {
      const config = await Configuration.findOne({ key });
      return config ? config.value : null;
    } catch (error) {
      console.error(`Error getting config for key ${key}:`, error);
      return null;
    }
  }

  static async setConfig(key: string, value: any): Promise<boolean> {
    try {
      const result = await Configuration.findOneAndUpdate(
        { key },
        { value, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      console.log(`Configuration set successfully for key ${key}:`, result ? 'updated' : 'created');
      return true;
    } catch (error) {
      console.error(`Error setting config for key ${key}:`, error);
      return false;
    }
  }

  static async getScanState(): Promise<any> {
    return await this.getConfig('scan_state');
  }

  static async setScanState(scanState: any): Promise<boolean> {
    const success = await this.setConfig('scan_state', scanState);
    if (!success) {
      console.error('Failed to set scan state');
    }
    return success;
  }

  static async checkAndReinitialize(): Promise<boolean> {
    try {
      console.log('Checking configurations...');
      const scanState = await this.getScanState();
      if (!scanState) {
        console.log('Configuration missing detected, reinitializing...');
        await this.forceReinitialize();
        return true;
      }
      console.log('All configurations exist, no reinitialization needed');
      return false;
    } catch (error) {
      console.error('Error checking configurations:', error);
      return false;
    }
  }

  static async forceReinitialize(): Promise<void> {
    try {
      console.log('Force reinitializing configurations...');
      const defaultScanState = {
        currentProviderIndex: 0,
        currentQueryIndex: 0,
        currentPage: 1,
        lastProcessedTime: Date.now(),
        providerStates: {
          openai: { queryIndex: 0, page: 1 },
          google_gemini: { queryIndex: 0, page: 1 },
          anthropic: { queryIndex: 0, page: 1 }
        },
        scanStatus: 'idle'
      };
      const scanStateSuccess = await this.setScanState(defaultScanState);
      if (!scanStateSuccess) {
        throw new Error('Failed to set scan state');
      }
      console.log('Reinitialized scan state to start from beginning (page 1)');
      console.log('Configuration reinitialization completed successfully');
    } catch (error) {
      console.error('Error force reinitializing configuration:', error);
      throw error;
    }
  }

  static async initializeDefaults(): Promise<void> {
    try {
      console.log('Initializing default configurations...');
      const scanState = await this.getScanState();
      if (!scanState) {
        const defaultScanState = {
          currentProviderIndex: 0,
          currentQueryIndex: 0,
          currentPage: 1,
          lastProcessedTime: Date.now(),
          providerStates: {
            openai: { queryIndex: 0, page: 1 },
            google_gemini: { queryIndex: 0, page: 1 },
            anthropic: { queryIndex: 0, page: 1 }
          },
          scanStatus: 'idle'
        };
        const success = await this.setScanState(defaultScanState);
        if (success) {
          console.log('Initialized scan state to start from beginning (page 1)');
        } else {
          console.error('Failed to initialize scan state');
        }
      } else {
        console.log('Scan state already exists');
      }
      console.log('Default configuration initialization completed');
    } catch (error) {
      console.error('Error initializing default configuration:', error);
      throw error;
    }
  }
}
