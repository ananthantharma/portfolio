import mongoose, { Document, Model, Schema } from 'mongoose';

import { INotePage } from './NotePage';

export interface IToDo extends Document {
    sourcePageId: string | INotePage;
    title: string;
    priority: 'High' | 'Medium' | 'Low' | 'None';
    dueDate: Date;
    category?: string;
    notes?: string;
    isCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ToDoSchema = new Schema<IToDo>(
    {
        sourcePageId: { type: Schema.Types.ObjectId, ref: 'NotePage', required: true },
        title: { type: String, required: true },
        priority: {
            type: String,
            enum: ['High', 'Medium', 'Low', 'None'],
            default: 'None',
        },
        dueDate: { type: Date, default: Date.now },
        category: { type: String },
        notes: { type: String },
        isCompleted: { type: Boolean, default: false },
    },
    { timestamps: true },
);

export default (mongoose.models.ToDo as Model<IToDo>) || mongoose.model<IToDo>('ToDo', ToDoSchema);
