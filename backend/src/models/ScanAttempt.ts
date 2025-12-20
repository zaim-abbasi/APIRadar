import mongoose, { Schema, Document } from 'mongoose';

export interface IScanAttempt extends Document {
  repoUrl: string;
  fullName: string;
  filePath: string;
  commitHash: string;
  scannedAt: Date;
  leakFound: boolean;
  leakTypes: string[];
  queryUsed: string;
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
  versionKey: false,
  _id: true,
  timestamps: false,
  toJSON: {
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
});

ScanAttemptSchema.index({ repoUrl: 1, filePath: 1, commitHash: 1 }, { unique: true });
ScanAttemptSchema.index({ scannedAt: -1 });
ScanAttemptSchema.index({ leakFound: 1, scannedAt: -1 });

export const ScanAttempt = mongoose.model<IScanAttempt>('ScanAttempt', ScanAttemptSchema); 