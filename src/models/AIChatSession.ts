import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAIChatMessage {
    role: 'user' | 'assistant' | 'model';
    content: string;
    timestamp: number;
}

export interface IAIChatSession extends Document {
    title: string;
    provider: 'gemini' | 'openai';
    model: string;
    messages: IAIChatMessage[];
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

const AIChatMessageSchema = new Schema<IAIChatMessage>(
    {
        role: { type: String, enum: ['user', 'assistant', 'model'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Number, required: true },
    },
    { _id: false },
);

const AIChatSessionSchema = new Schema<IAIChatSession>(
    {
        title: { type: String, required: true, default: 'New Chat' },
        provider: { type: String, enum: ['gemini', 'openai'], required: true },
        model: { type: String, required: true },
        messages: { type: [AIChatMessageSchema], default: [] },
        userId: { type: String, required: true, index: true },
    },
    {
        timestamps: true,
    },
);

// Compound index for efficient querying
AIChatSessionSchema.index({ userId: 1, updatedAt: -1 });

const AIChatSession: Model<IAIChatSession> =
    mongoose.models.AIChatSession || mongoose.model<IAIChatSession>('AIChatSession', AIChatSessionSchema);

export default AIChatSession;
