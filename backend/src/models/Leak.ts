import mongoose, { Schema, Document } from 'mongoose';

export interface ILeak extends Document {
  redactedKey: string;         // Safe, redacted version of the API key
  fullKey: string;             // Full API key (for internal use only)
  provider: string;            // Provider name (openai, cohere, etc.)
  repoUrl: string;             // Full GitHub repo URL (e.g. https://github.com/user/repo)
  filePath: string;            // Relative path to the file that contains the leak
  leakIntroducedAt: Date;      // When the secret was added to the repo (via file commit date)
  leakDetectedAt: Date;        // When the leak was found by our system
  repoCreatedAt: Date;         // Repository creation timestamp (to filter old repos)
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
      enum: [
        'openai',
        'google_gemini',
        'anthropic',
        'mistral-ai',
        'cohere',
        'huggingface',
      ],
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

// Compound unique index to prevent duplicate leaks
LeakSchema.index(
  { repoUrl: 1, redactedKey: 1, provider: 1, filePath: 1 },
  { unique: true }
);

// Unique index on fullKey to prevent duplicate API keys across all repositories
LeakSchema.index(
  { fullKey: 1 },
  { unique: true }
);

// Indexes for efficient querying
LeakSchema.index({ leakDetectedAt: -1 });
LeakSchema.index({ repoCreatedAt: -1 });
LeakSchema.index({ leakIntroducedAt: -1 });
LeakSchema.index({ provider: 1, leakDetectedAt: -1 });

export const Leak = mongoose.model<ILeak>('Leak', LeakSchema);