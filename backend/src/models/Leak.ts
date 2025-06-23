import mongoose, { Schema, Document } from 'mongoose';

export interface ILeak extends Document {
  redactedKey: string;
  provider: string;
  repoName: string;
  repoUrl: string;
  authorName: string;
  authorUrl: string;
  timestamp: Date;
  filePath?: string;
  commitHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeakSchema = new Schema<ILeak>(
  {
    redactedKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: [
        'openai',
        'anthropic',
        'google-ai',
        'cohere',
        'aws',
        'stripe',
        'github',
        'discord',
        'twilio',
        'sendgrid',
        'other',
      ],
      index: true,
    },
    repoName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    authorUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    filePath: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    commitHash: {
      type: String,
      trim: true,
      maxlength: 40,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index to prevent duplicate leaks
LeakSchema.index(
  { repoUrl: 1, redactedKey: 1, provider: 1 },
  { unique: true }
);

// Index for efficient querying
LeakSchema.index({ timestamp: -1 });
LeakSchema.index({ provider: 1, timestamp: -1 });

export const Leak = mongoose.model<ILeak>('Leak', LeakSchema);