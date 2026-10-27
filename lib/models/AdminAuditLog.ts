import mongoose, { Model, Schema, Types } from 'mongoose';

// One row per admin change (deletes, role changes, sends, imports). Kept for a
// year so "who did this?" has an answer without growing forever.
export interface IAdminAuditLog {
  actor?: Types.ObjectId;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  summary?: string;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>({
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  actorEmail: { type: String, required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true, index: true },
  targetId: { type: String },
  summary: { type: String, maxlength: 500 },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 365 },
});

AdminAuditLogSchema.index({ createdAt: -1 });

const AdminAuditLog: Model<IAdminAuditLog> =
  (mongoose.models.AdminAuditLog as Model<IAdminAuditLog>) ||
  mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);

export default AdminAuditLog;
