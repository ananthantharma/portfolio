import mongoose, {Document, Model, Schema} from 'mongoose';

// Binary files owned by a vendor profile: org chart images, rendered org chart
// previews, and uploaded agreements. Served only to the owning user.
export interface IVendorFile extends Document {
  userEmail: string;
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
}

const VendorFileSchema = new Schema<IVendorFile>(
  {
    userEmail: {type: String, required: true, index: true},
    filename: {type: String, required: true},
    contentType: {type: String, required: true},
    size: {type: Number, required: true},
    data: {type: Buffer, required: true},
  },
  {timestamps: true},
);

export default (mongoose.models.VendorFile as Model<IVendorFile>) ||
  mongoose.model<IVendorFile>('VendorFile', VendorFileSchema);
