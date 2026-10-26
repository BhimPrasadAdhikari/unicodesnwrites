import mongoose, { Schema, Document, Model } from 'mongoose';

// Delivered provider webhook events, recorded after their DB changes commit so
// a redelivery of the same event id is skipped but a failed one can retry.
export interface IWebhookEvent extends Document {
  provider: 'razorpay';
  eventId: string;
  event: string;
  processedAt: Date;
}

const WebhookEventSchema: Schema = new Schema({
  provider: { type: String, enum: ['razorpay'], required: true },
  eventId: { type: String, required: true },
  event: { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
});

WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
WebhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

export default WebhookEvent;
