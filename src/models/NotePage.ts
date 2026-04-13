import mongoose, {Document, Model, Schema} from 'mongoose';

export interface INoteTab {
  _id?: string;
  title: string;
  content: string;
  color?: string;
  isImportant?: boolean;
  isFlagged?: boolean;
  order: number;
}

export interface INotePage extends Document {
  title: string;
  content: string; // Deprecated but kept for migration
  tabs: INoteTab[];
  color?: string;
  icon?: string;
  image?: string | null;
  sectionId: mongoose.Types.ObjectId;
  parentPageId?: mongoose.Types.ObjectId | string | null;
  isInactive?: boolean;
  isFlagged: boolean;
  isImportant: boolean;
  todoCount?: number;
  userEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotePageSchema: Schema = new Schema(
  {
    userEmail: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a page title'],
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    content: {
      type: String,
      default: '',
    },
    tabs: [
      {
        title: {type: String, required: true},
        content: {type: String, default: ''},
        color: {type: String, default: '#ffffff'},
        isImportant: {type: Boolean, default: false},
        isFlagged: {type: Boolean, default: false},
        order: {type: Number, default: 0},
      },
    ],
    color: {
      type: String,
      default: '#000000',
    },
    icon: {
      type: String,
      default: 'FileText',
    },
    image: {
      type: String,
      default: null,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NoteSection',
      required: true,
    },
    parentPageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotePage',
      default: null,
    },
    isInactive: {
      type: Boolean,
      default: false,
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

// Compound indexes for the access patterns used in every request
NotePageSchema.index({userEmail: 1, sectionId: 1, order: 1}); // sidebar page list (primary query)
NotePageSchema.index({userEmail: 1, isImportant: 1});          // badge counting: important
NotePageSchema.index({userEmail: 1, isFlagged: 1});            // badge counting: flagged

export default (mongoose.models.NotePage as Model<INotePage>) || mongoose.model<INotePage>('NotePage', NotePageSchema);
