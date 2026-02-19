import mongoose, { Schema, Document } from 'mongoose';
import { PROVIDER_NAMES } from '../services/RegexRouter';

export interface ILeak extends Document {
  redactedKey: string;
  fullKey: string;
  provider: string;
  repoUrl: string;
  filePath: string;
  leakIntroducedAt: Date;
  leakDetectedAt: Date;
  repoCreatedAt: Date;
}

const LeakSchema = new Schema<ILeak>(
  {
    redactedKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    fullKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
      select: false,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: PROVIDER_NAMES,
      index: true,
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    filePath: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    leakIntroducedAt: {
      type: Date,
      required: true,
      index: true,
    },
    leakDetectedAt: {
      type: Date,
      required: true,
      index: true,
    },
    repoCreatedAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.fullKey;
        return ret;
      },
    },
  }
);

LeakSchema.index(
  { repoUrl: 1, redactedKey: 1, provider: 1, filePath: 1 },
  { unique: true }
);

LeakSchema.index(
  { fullKey: 1 },
  { unique: true }
);

LeakSchema.index({ leakDetectedAt: -1 });
LeakSchema.index({ repoCreatedAt: -1 });
LeakSchema.index({ leakIntroducedAt: -1 });
LeakSchema.index({ provider: 1, leakDetectedAt: -1 });

export const Leak = mongoose.model<ILeak>('Leak', LeakSchema);