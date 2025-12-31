
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAccessLog extends Document {
    ip: string;
    path: string;
    timestamp: Date;
    userEmail?: string;
    userAgent?: string;
}

const AccessLogSchema: Schema = new Schema(
    {
        ip: {
            type: String,
            required: true,
            index: true,
        },
        path: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
        userEmail: {
            type: String,
            index: true,
        },
        userAgent: {
            type: String,
        },
    },
    {
        timestamps: false, // We use manual timestamp
        collection: 'access_logs', // Explicitly name collection
    },
);

export default (mongoose.models.AccessLog as Model<IAccessLog>) || mongoose.model<IAccessLog>('AccessLog', AccessLogSchema);
