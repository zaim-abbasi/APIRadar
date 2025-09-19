import mongoose, { Schema, Document } from 'mongoose';

export interface IConfiguration extends Document {
  key: string;
  value: any;
  updatedAt: Date;
}

const ConfigurationSchema = new Schema<IConfiguration>({
  key: {
    type: String,
    required: true,
    unique: true,
    // enum: ['repository_age_cutoff', 'scan_state']
    enum: ['scan_state'] // repository_age_cutoff commented out
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
ConfigurationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Configuration = mongoose.model<IConfiguration>('Configuration', ConfigurationSchema); 