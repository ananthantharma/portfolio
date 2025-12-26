import mongoose, { Document, Model, Schema } from 'mongoose';

import { CONTACT_DEPARTMENTS, CONTACT_POSITIONS, CONTACT_TYPES, IContactBase } from '@/lib/contact-constants';

export interface IContact extends Document, Omit<IContactBase, '_id'> {
  // Mongoose Document already has _id
  userEmail?: string;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    company: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    userEmail: { type: String, index: true },
    notes: { type: String },
    position: { type: String, enum: CONTACT_POSITIONS },
    department: { type: String, enum: CONTACT_DEPARTMENTS },
    type: { type: String, enum: CONTACT_TYPES, default: 'External' },
    image: { type: String },
  },
  { timestamps: true },
);

export default (mongoose.models.Contact as Model<IContact>) || mongoose.model<IContact>('Contact', ContactSchema);
