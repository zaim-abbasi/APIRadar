import mongoose, { Schema, Document } from 'mongoose';

export interface IScanAttempt extends Document {
  repoUrl: string;         // Full GitHub repo URL
  fullName: string;        // owner/repo
  filePath: string;        // Relative file path
  commitHash: string;      // Latest commit hash for the file
  scannedAt: Date;         // When the scan was performed
  leakFound: boolean;      // Whether any leak was found
  leakTypes: string[];     // Array of provider types (e.g., openai, cohere)
  queryUsed: string;       // The GitHub Code Search query used
}

const ScanAttemptSchema = new Schema<IScanAttempt>({
  repoUrl: { type: String, required: true, trim: true },
  fullName: { type: String, required: true, trim: true },
  filePath: { type: String, required: true, trim: true },
  commitHash: { type: String, required: true, trim: true },
  scannedAt: { type: Date, required: true },
  leakFound: { type: Boolean, required: true },
  leakTypes: { type: [String], default: [] },
  queryUsed: { type: String, required: true, trim: true },
}, {
  versionKey: false, // No __v
  _id: true,         // Keep _id for MongoDB
  timestamps: false, // No automatic timestamps
  toJSON: {
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
});

// Compound index for efficient duplicate checking
ScanAttemptSchema.index({ repoUrl: 1, filePath: 1, commitHash: 1 }, { unique: true });
ScanAttemptSchema.index({ scannedAt: -1 });
ScanAttemptSchema.index({ leakFound: 1, scannedAt: -1 });

export const ScanAttempt = mongoose.model<IScanAttempt>('ScanAttempt', ScanAttemptSchema); 