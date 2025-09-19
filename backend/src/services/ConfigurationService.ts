import { Configuration } from '../models/Configuration';

export class ConfigurationService {
  /**
   * Get configuration value by key
   */
  static async getConfig(key: string): Promise<any> {
    try {
      const config = await Configuration.findOne({ key });
      return config ? config.value : null;
    } catch (error) {
      console.error(`Error getting config for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set configuration value by key
   */
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

  /**
   * Get repository age cutoff date
   */
  /*
  static async getRepositoryAgeCutoff(): Promise<Date | null> {
    const cutoff = await this.getConfig('repository_age_cutoff');
    if (!cutoff) {
      console.log('Repository age cutoff not found in database');
      return null;
    }
    return new Date(cutoff);
  }
  */

  /**
   * Set repository age cutoff date
   */
  /*
  static async setRepositoryAgeCutoff(cutoffDate: Date): Promise<boolean> {
    const success = await this.setConfig('repository_age_cutoff', cutoffDate.toISOString());
    if (success) {
      console.log('Repository age cutoff set successfully:', cutoffDate.toISOString());
    } else {
      console.error('Failed to set repository age cutoff');
    }
    return success;
  }
  */

  /**
   * Get scan state
   */
  static async getScanState(): Promise<any> {
    return await this.getConfig('scan_state');
  }

  /**
   * Set scan state
   */
  static async setScanState(scanState: any): Promise<boolean> {
    const success = await this.setConfig('scan_state', scanState);
    if (!success) {
      console.error('Failed to set scan state');
    }
    return success;
  }

  /**
   * Check if configurations exist and reinitialize if missing
   */
  static async checkAndReinitialize(): Promise<boolean> {
    try {
      console.log('Checking configurations...');
      // Check if both required configurations exist
      // const cutoff = await this.getRepositoryAgeCutoff();
      const scanState = await this.getScanState();
      /*
      console.log('Configuration check results:', {
        cutoff: cutoff ? cutoff.toISOString() : 'null',
        scanState: scanState ? 'exists' : 'null'
      });
      if (!cutoff || !scanState) {
        console.log('Configuration missing detected, reinitializing...');
        await this.forceReinitialize();
        return true; // Reinitialized
      }
      */
      if (!scanState) {
        console.log('Configuration missing detected, reinitializing...');
        await this.forceReinitialize();
        return true; // Reinitialized
      }
      console.log('All configurations exist, no reinitialization needed');
      return false; // No reinitialization needed
    } catch (error) {
      console.error('Error checking configurations:', error);
      return false;
    }
  }

  /**
   * Force reinitialize configurations with fresh defaults
   */
  static async forceReinitialize(): Promise<void> {
    try {
      console.log('Force reinitializing configurations...');
      
      // Set cutoff date to 15 days before today
      const today = new Date();
      const fifteenDaysAgo = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
      const cutoffSuccess = await this.setRepositoryAgeCutoff(fifteenDaysAgo);
      if (!cutoffSuccess) {
        throw new Error('Failed to set repository age cutoff');
      }
      console.log('Reinitialized repository age cutoff to 15 days before today:', fifteenDaysAgo.toISOString());

      // Set scan state to start from beginning
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

  /**
   * Initialize default configuration if not exists
   */
  static async initializeDefaults(): Promise<void> {
    try {
      console.log('Initializing default configurations...');
      // Check if repository_age_cutoff exists, if not set default
      /*
      const cutoff = await this.getRepositoryAgeCutoff();
      if (!cutoff) {
        // Set cutoff date to 15 days before today
        const today = new Date();
        const fifteenDaysAgo = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
        const success = await this.setRepositoryAgeCutoff(fifteenDaysAgo);
        if (success) {
          console.log('Initialized repository age cutoff to 15 days before today:', fifteenDaysAgo.toISOString());
        } else {
          console.error('Failed to initialize repository age cutoff');
        }
      } else {
        console.log('Repository age cutoff already exists:', cutoff.toISOString());
      }
      */
      // Check if scan_state exists, if not set default
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