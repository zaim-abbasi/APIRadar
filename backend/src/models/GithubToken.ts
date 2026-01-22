import mongoose, { Schema, Document } from 'mongoose';

export interface IGithubToken extends Document {
  token: string;
}

const GithubTokenSchema = new Schema<IGithubToken>(
  {
    token: { type: String, required: true, unique: true, index: true }
  },
  { timestamps: false, versionKey: false }
);

export const GithubToken = mongoose.model<IGithubToken>('GithubToken', GithubTokenSchema);
