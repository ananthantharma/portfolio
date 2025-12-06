import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INotePage extends Document {
  title: string;
  content: string;
  sectionId: mongoose.Types.ObjectId;
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
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NoteSection',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default (mongoose.models.NotePage as Model<INotePage>) || mongoose.model<INotePage>('NotePage', NotePageSchema);
