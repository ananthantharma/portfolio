import mongoose, {Document, Model, Schema} from 'mongoose';

export interface INoteSection extends Document {
  name: string;
  color?: string;
  icon?: string;
  image?: string | null;
  order: number;
  categoryId: mongoose.Types.ObjectId;
  userEmail?: string;
  importantCount?: number;
  flaggedCount?: number;
  todoCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSectionSchema: Schema = new Schema(
  {
    userEmail: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a section name'],
      maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    color: {
      type: String,
      default: '#000000',
    },
    icon: {
      type: String,
      default: 'Folder',
    },
    image: {
      type: String,
      default: null,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NoteCategory',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for the access patterns used in every query
NoteSectionSchema.index({userEmail: 1, categoryId: 1}); // sections by category (primary query)
NoteSectionSchema.index({userEmail: 1, order: 1});      // sorted list

export default (mongoose.models.NoteSection as Model<INoteSection>) ||
  mongoose.model<INoteSection>('NoteSection', NoteSectionSchema);
