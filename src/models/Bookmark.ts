import mongoose, {Document, Model, Schema} from 'mongoose';

export interface IBookmark extends Document {
  userEmail: string;
  url: string;
  description: string;
  notes?: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    userEmail: {type: String, required: true, index: true},
    url: {type: String, required: true},
    description: {type: String, required: true},
    notes: {type: String, default: ''},
    category: {type: String, required: true, default: 'Other'},
  },
  {timestamps: true},
);

// Optional text index for search
BookmarkSchema.index({description: 'text', notes: 'text', url: 'text', category: 'text'});

export default (mongoose.models.Bookmark as Model<IBookmark>) || mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
