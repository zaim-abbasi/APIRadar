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
      await Configuration.findOneAndUpdate(
        { key },
        { value, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      return true;
    } catch (error) {
      console.error(`Error setting config for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get repository age cutoff date
   */
  static async getRepositoryAgeCutoff(): Promise<Date | null> {
    const cutoff = await this.getConfig('repository_age_cutoff');
    return cutoff ? new Date(cutoff) : null;
  }

  /**
   * Set repository age cutoff date
   */
  static async setRepositoryAgeCutoff(cutoffDate: Date): Promise<boolean> {
    return await this.setConfig('repository_age_cutoff', cutoffDate.toISOString());
  }

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
    return await this.setConfig('scan_state', scanState);
  }

  /**
   * Check if configurations exist and reinitialize if missing
   */
  static async checkAndReinitialize(): Promise<boolean> {
    try {
      // Check if both required configurations exist
      const cutoff = await this.getRepositoryAgeCutoff();
      const scanState = await this.getScanState();
      
      if (!cutoff || !scanState) {
        console.log('Configuration missing detected, reinitializing...');
        await this.forceReinitialize();
        return true; // Reinitialized
      }
      
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
      
      // Set cutoff date to one month before today
      const today = new Date();
      const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      await this.setRepositoryAgeCutoff(oneMonthAgo);
      console.log('Reinitialized repository age cutoff to one month before today:', oneMonthAgo.toISOString());

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
      await this.setScanState(defaultScanState);
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
      // Check if repository_age_cutoff exists, if not set default
      const cutoff = await this.getRepositoryAgeCutoff();
      if (!cutoff) {
        // Set cutoff date to one month before today
        const today = new Date();
        const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        await this.setRepositoryAgeCutoff(oneMonthAgo);
        console.log('Initialized repository age cutoff to one month before today:', oneMonthAgo.toISOString());
      }

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
        await this.setScanState(defaultScanState);
        console.log('Initialized scan state to start from beginning (page 1)');
      }
    } catch (error) {
      console.error('Error initializing default configuration:', error);
    }
  }
} 