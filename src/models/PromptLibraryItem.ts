import mongoose, {Document, Model, Schema} from 'mongoose';

export interface IPromptLibraryItem extends Document {
  userEmail: string;
  title: string;
  description: string;
  content: string;
  category: string;
  favorite: boolean;
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
  },
  {timestamps: true},
);

PromptLibraryItemSchema.index({title: 'text', description: 'text', content: 'text', category: 'text'});

export default (mongoose.models.PromptLibraryItem as Model<IPromptLibraryItem>) ||
  mongoose.model<IPromptLibraryItem>('PromptLibraryItem', PromptLibraryItemSchema);
