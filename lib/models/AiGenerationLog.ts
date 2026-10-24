import mongoose, { Model, Schema } from 'mongoose';

export interface IAiGenerationLog {
  userId?: string;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: 'success' | 'error';
  error?: string;
  createdAt: Date;
}

const AiGenerationLogSchema = new Schema<IAiGenerationLog>({
  userId: { type: String, index: true },
  feature: { type: String, required: true, index: true },
  model: { type: String, required: true, index: true },
  promptTokens: { type: Number, required: true, default: 0 },
  completionTokens: { type: Number, required: true, default: 0 },
  totalTokens: { type: Number, required: true, default: 0 },
  latencyMs: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['success', 'error'], required: true, default: 'success' },
  error: { type: String },
  createdAt: { type: Date, required: true, default: Date.now, index: true },
});

const AiGenerationLog: Model<IAiGenerationLog> =
  (mongoose.models.AiGenerationLog as Model<IAiGenerationLog>) ||
  mongoose.model<IAiGenerationLog>('AiGenerationLog', AiGenerationLogSchema);

export default AiGenerationLog;
