import mongoose, {Document, Model, Schema} from 'mongoose';

export interface IPromptLibraryItem extends Document {
  userEmail: string;
  title: string;
  description: string;
  content: string;
  category: string;
  favorite: boolean;
  pinned: boolean;
  useCount: number;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PromptLibraryItemSchema = new Schema<IPromptLibraryItem>(
  {
    userEmail: {type: String, required: true, index: true},
    title: {type: String, required: true},
    description: {type: String, default: ''},
    content: {type: String, default: ''},
    category: {type: String, required: true, default: 'General'},
    favorite: {type: Boolean, default: false},
    // Pinned prompts sit at the top of the library
    pinned: {type: Boolean, default: false},
    // How often and how recently it was copied, for "Recent" and "Most used"
    useCount: {type: Number, default: 0},
    lastUsedAt: {type: Date, default: null},
  },
  {timestamps: true},
);

PromptLibraryItemSchema.index({title: 'text', description: 'text', content: 'text', category: 'text'});

export default (mongoose.models.PromptLibraryItem as Model<IPromptLibraryItem>) ||
  mongoose.model<IPromptLibraryItem>('PromptLibraryItem', PromptLibraryItemSchema);
