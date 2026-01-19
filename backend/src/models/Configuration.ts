import mongoose, { Schema, Document } from 'mongoose';

export enum ConfigKey {
  SCAN_STATE = 'scan_state'
}

export interface ScanState {
  currentProviderIndex: number;
  currentQueryIndex: number;
  currentPage: number;
  lastProcessedTime: number;
  providerStates: Record<string, {
    queryIndex: number;
    page: number;
    queryEmptyPages?: Record<string, number>;
  }>;
  scanStatus?: string;
  savedAt?: Date;
}

type TypedConfig =
  | { key: ConfigKey.SCAN_STATE; value: ScanState };

export type IConfiguration = Document & TypedConfig & {
  createdAt: Date;
  updatedAt: Date;
};

const ConfigurationSchema = new Schema<IConfiguration>({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: Object.values(ConfigKey),
    index: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true,
  autoIndex: true
});

export const Configuration = mongoose.model<IConfiguration>('Configuration', ConfigurationSchema);