import mongoose, { Model, Schema } from 'mongoose';

interface IAiUsageBudget {
  key: string;
  count: number;
  expiresAt: Date;
}

const AiUsageBudgetSchema = new Schema<IAiUsageBudget>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});
AiUsageBudgetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AiUsageBudget: Model<IAiUsageBudget> =
  (mongoose.models.AiUsageBudget as Model<IAiUsageBudget>) ||
  mongoose.model<IAiUsageBudget>('AiUsageBudget', AiUsageBudgetSchema);

export default AiUsageBudget;
