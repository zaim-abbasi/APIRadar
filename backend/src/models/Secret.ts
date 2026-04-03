import mongoose, { Schema, Document } from 'mongoose';
import { PROVIDER_NAMES } from '../services/RegexRouter';

export interface ISecret extends Document {
  keyHash: string;
  encryptedKey: string;
  provider: string;
  status: 'pending' | 'usable' | 'authenticated' | 'rate_limited' | 'dead';
  leakCount: number;
  lastVerifiedAt?: Date | null;
}

const SecretSchema = new Schema<ISecret>(
  {
    keyHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 256,
    },
    encryptedKey: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: PROVIDER_NAMES,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'usable', 'authenticated', 'rate_limited', 'dead'],
      default: 'pending',
      index: true,
    },
    leakCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Secret = mongoose.model<ISecret>('Secret', SecretSchema);
