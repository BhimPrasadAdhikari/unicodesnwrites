import mongoose, { Model, Schema } from 'mongoose';

export interface IComment {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  authorName: string;
  body: string;
  /** Hidden until an admin approves it */
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

CommentSchema.index({ post: 1, approved: 1, createdAt: 1 });
CommentSchema.index({ approved: 1, createdAt: -1 });

export const Comment: Model<IComment> = (mongoose.models.Comment as Model<IComment>) || mongoose.model<IComment>('Comment', CommentSchema);
export default Comment;
