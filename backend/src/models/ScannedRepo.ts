import mongoose, { Schema, Document } from 'mongoose';

export interface IScannedRepo extends Document {
  fullName: string;
  lastScannedAt: Date;
}

const ScannedRepoSchema = new Schema<IScannedRepo>({
  fullName: { type: String, unique: true, index: true, required: true },
  lastScannedAt: { type: Date, default: Date.now }
});

export const ScannedRepo = mongoose.model<IScannedRepo>('ScannedRepo', ScannedRepoSchema);
