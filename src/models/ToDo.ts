import mongoose, {Document, Model, Schema} from 'mongoose';

import {INotePage} from './NotePage';

export interface IToDo extends Document {
  sourcePageId?: string | INotePage;
  title: string;
  priority: 'High' | 'Medium' | 'Low' | 'None';
  dueDate: Date;
  category?: string;
  notes?: string;
  isCompleted: boolean;
  attachments?: {
    name: string;
    type: string;
    fileId?: string;
    data?: string;
    size: number;
  }[];
  userEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ToDoSchema = new Schema<IToDo>(
  {
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    sourcePageId: {type: Schema.Types.ObjectId, ref: 'NotePage', required: false},
    title: {type: String, required: true},
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'None'],
      default: 'None',
    },
    dueDate: {type: Date, default: Date.now},
    category: {type: String},
    notes: {type: String},
    isCompleted: {type: Boolean, default: false},
    attachments: [
      {
        name: {type: String, required: true},
        type: {type: String, required: true},
        fileId: {type: String, required: false}, // Made optional
        data: {type: String, required: false}, // Added for base64 storage
        size: {type: Number, required: true},
      },
    ],
  },
  {timestamps: true},
);

export default (mongoose.models.ToDo as Model<IToDo>) || mongoose.model<IToDo>('ToDo', ToDoSchema);
