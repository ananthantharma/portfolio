
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
    name?: string;
    email?: string;
    image?: string;
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
    },
    {
        timestamps: true,
        collection: 'users', // Matches next-auth default collection
    },
);

export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
