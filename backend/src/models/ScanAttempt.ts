import mongoose, { Schema, Document } from 'mongoose';

export interface IScanAttempt extends Document {
  repo_url: string;
  full_name: string;
  scanned_at: Date;
  leak_found: boolean;
  leak_types: string[];
  query_used: string;
  trufflehog_output?: any;
  status: 'success' | 'error';
  error_message?: string;
}

const ScanAttemptSchema = new Schema<IScanAttempt>({
  repo_url: { type: String, required: true, index: true },
  full_name: { type: String, required: true },
  scanned_at: { type: Date, required: true, default: Date.now },
  leak_found: { type: Boolean, required: true },
  leak_types: { type: [String], default: [] },
  query_used: { type: String, required: true },
  trufflehog_output: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['success', 'error'], required: true },
  error_message: { type: String },
});

export const ScanAttempt = mongoose.model<IScanAttempt>('ScanAttempt', ScanAttemptSchema); 