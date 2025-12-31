
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
    name?: string;
    email?: string;
    image?: string;
    googleApiEnabled?: boolean;
    openAiApiEnabled?: boolean;
    notesEnabled?: boolean;
    secureLoginEnabled?: boolean;
    financeEnabled?: boolean;
    invoiceEnabled?: boolean;
    emailVerified?: Date;
    lastLogin?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const UserSchema: Schema = new Schema(
    {
        name: String,
        email: String,
        image: String,
        emailVerified: Date,
        lastLogin: Date,
        googleApiEnabled: { type: Boolean, default: false },
        openAiApiEnabled: { type: Boolean, default: false },
        notesEnabled: { type: Boolean, default: false },
        secureLoginEnabled: { type: Boolean, default: false },
        financeEnabled: { type: Boolean, default: false },
        invoiceEnabled: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        collection: 'users', // Matches next-auth default collection
    },
);

export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
