import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INoteCategory extends Document {
  name: string;
  color?: string;
  icon?: string;
  image?: string | null;
  userEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteCategorySchema: Schema = new Schema(
  {
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    color: {
      type: String,
      default: '#000000', // Default to black/transparent equivalent
    },
    icon: {
      type: String, // e.g. "Folder", "Work"
      default: 'Folder', // Default icon
    },
    image: {
      type: String, // Brandfetch domain (e.g. "google.com")
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default (mongoose.models.NoteCategory as Model<INoteCategory>) ||
  mongoose.model<INoteCategory>('NoteCategory', NoteCategorySchema);
