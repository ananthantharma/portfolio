import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INoteCategory extends Document {
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const NoteCategorySchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a category name'],
            maxlength: [60, 'Name cannot be more than 60 characters'],
        },
    },
    {
        timestamps: true,
    }
);

export default (mongoose.models.NoteCategory as Model<INoteCategory>) ||
    mongoose.model<INoteCategory>('NoteCategory', NoteCategorySchema);
