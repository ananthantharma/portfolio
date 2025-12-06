import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INoteSection extends Document {
    name: string;
    categoryId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const NoteSectionSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a section name'],
            maxlength: [60, 'Name cannot be more than 60 characters'],
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NoteCategory',
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

export default (mongoose.models.NoteSection as Model<INoteSection>) ||
    mongoose.model<INoteSection>('NoteSection', NoteSectionSchema);
