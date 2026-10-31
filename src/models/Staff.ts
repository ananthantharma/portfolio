import mongoose, {Document, Model, Schema} from 'mongoose';

/** Someone you hand work to; kept so the Assign work window remembers them. People pages link one each. */
export interface IStaff extends Document {
  userEmail: string;
  name: string;
  email?: string;
  role?: string;
  sectionId?: mongoose.Types.ObjectId | null; // their page in a People notebook, if they have one
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    userEmail: {type: String, required: true, index: true},
    name: {type: String, required: true, trim: true, maxlength: 120},
    email: {type: String, default: '', trim: true, maxlength: 200},
    role: {type: String, default: '', trim: true, maxlength: 120},
    sectionId: {type: Schema.Types.ObjectId, ref: 'NoteSection', default: null},
  },
  {timestamps: true},
);

export default (mongoose.models.Staff as Model<IStaff>) || mongoose.model<IStaff>('Staff', StaffSchema);
