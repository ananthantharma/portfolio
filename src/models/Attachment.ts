import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAttachment extends Document {
    filename: string;
    contentType: string;
    data: Buffer;
    size: number;
    pageId: mongoose.Types.ObjectId;
    createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
    {
        filename: { type: String, required: true },
        contentType: { type: String, required: true },
        data: { type: Buffer, required: true },
        size: { type: Number, required: true },
        pageId: { type: Schema.Types.ObjectId, ref: 'NotePage', required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

export default (mongoose.models.Attachment as Model<IAttachment>) ||
    mongoose.model<IAttachment>('Attachment', AttachmentSchema);
