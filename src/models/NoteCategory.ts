import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INoteCategory extends Document {
  name: string;
  color?: string;
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
    color: {
      type: String,
      default: '#000000', // Default to black/transparent equivalent
    },
  },
  {
    timestamps: true,
  },
);

export default (mongoose.models.NoteCategory as Model<INoteCategory>) ||
  mongoose.model<INoteCategory>('NoteCategory', NoteCategorySchema);
