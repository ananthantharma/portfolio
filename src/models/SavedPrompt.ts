import mongoose from 'mongoose';

const SavedPromptSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    promptType: {
        type: String, // e.g., 'organize', 'rewrite' 
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
});

// Compound index to ensure one prompt type per user
SavedPromptSchema.index({ userId: 1, promptType: 1 }, { unique: true });

export default mongoose.models.SavedPrompt || mongoose.model('SavedPrompt', SavedPromptSchema);
