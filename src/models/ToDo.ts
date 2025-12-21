import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IToDo extends Document {
    title: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate: Date;
    category?: string;
    sourcePageId?: mongoose.Types.ObjectId;
    isCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ToDoSchema: Schema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a task title'],
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
            default: 'Medium',
        },
        dueDate: {
            type: Date,
            default: Date.now,
        },
        category: {
            type: String,
            default: '',
        },
        sourcePageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NotePage',
            required: false,
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

export default (mongoose.models.ToDo as Model<IToDo>) || mongoose.model<IToDo>('ToDo', ToDoSchema);
