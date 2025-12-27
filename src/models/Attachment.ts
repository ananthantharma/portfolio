import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAttachment extends Document {
  filename: string;
  contentType: string;
  data?: Buffer;
  size: number;
  pageId: mongoose.Types.ObjectId;
  createdAt: Date;
  storageType?: 'local' | 'drive';
  fileId?: string;
  webViewLink?: string;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: false }, // Optional for Drive files
    size: { type: Number, required: true },
    pageId: { type: Schema.Types.ObjectId, ref: 'NotePage', required: true },
    storageType: {
      type: String,
      enum: ['local', 'drive'],
      default: 'local',
    },
    fileId: { type: String }, // Google Drive File ID
    webViewLink: { type: String }, // Google Drive View Link
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default (mongoose.models.Attachment as Model<IAttachment>) ||
  mongoose.model<IAttachment>('Attachment', AttachmentSchema);
