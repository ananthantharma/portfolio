import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INotePage extends Document {
    title: string;
    content: string;
    categoryId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const NotePageSchema: Schema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a page title'],
            maxlength: [100, 'Title cannot be more than 100 characters'],
        },
        content: {
            type: String,
            default: '',
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NoteCategory',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default (mongoose.models.NotePage as Model<INotePage>) ||
    mongoose.model<INotePage>('NotePage', NotePageSchema);
