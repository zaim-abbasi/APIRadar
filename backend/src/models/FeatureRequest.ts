import mongoose, { Document, Schema } from 'mongoose';

export interface IFeatureRequest extends Document {
  email: string;
  text: string;
  createdAt: Date;
}

const featureRequestSchema = new Schema<IFeatureRequest>({
  email: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

featureRequestSchema.index({ email: 1, createdAt: -1 });

export const FeatureRequest = mongoose.models['FeatureRequest'] || mongoose.model<IFeatureRequest>('FeatureRequest', featureRequestSchema);
