import mongoose, {Document, Model, Schema} from 'mongoose';

export interface INotePage extends Document {
  title: string;
  content: string;
  color?: string;
  icon?: string;
  sectionId: mongoose.Types.ObjectId;
  isFlagged: boolean;
  isImportant: boolean;
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
    color: {
      type: String,
      default: '#000000',
    },
    icon: {
      type: String,
      default: 'FileText',
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NoteSection',
      required: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    isImportant: {
      type: Boolean,
      default: false,
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

export default (mongoose.models.NotePage as Model<INotePage>) || mongoose.model<INotePage>('NotePage', NotePageSchema);
