import mongoose, {Document, Model, Schema} from 'mongoose';

import {INotePage} from './NotePage';

export interface IToDo extends Document {
  sourcePageId?: string | INotePage;
  tabId?: string;
  tabName?: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low' | 'None';
  dueDate: Date;
  category?: string;
  notes?: string;
  isCompleted: boolean;
  status?: 'todo' | 'in-progress' | 'action-with-others' | 'escalation-required' | 'parked' | 'done';
  subtasks?: {
    _id?: string;
    title: string;
    isCompleted: boolean;
  }[];
  estimatedTime?: number;
  aiGenerated?: boolean;
  aiContext?: string;
  tags?: string[];
  hasNeonBorder?: boolean;
  attachments?: {
    name: string;
    type: string;
    fileId?: string;
    data?: string;
    webViewLink?: string;
    storageType?: 'local' | 'drive' | 'blob';
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
    tabId: {type: String, required: false}, // ID of the tab within the page
    tabName: {type: String, required: false}, // Name of the tab for display/fallback
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
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'action-with-others', 'escalation-required', 'parked', 'done'],
      default: 'todo',
    },
    hasNeonBorder: {type: Boolean, default: false},
    subtasks: [
      {
        title: {type: String, required: true},
        isCompleted: {type: Boolean, default: false},
      },
    ],
    estimatedTime: {type: Number}, // In minutes
    aiGenerated: {type: Boolean, default: false},
    aiContext: {type: String},
    tags: [{type: String}],
    attachments: [
      {
        name: {type: String, required: true},
        type: {type: String, required: true},
        fileId: {type: String, required: false}, // Made optional
        data: {type: String, required: false}, // Added for base64 storage
        webViewLink: {type: String, required: false}, // Google Drive Link
        storageType: {
          type: String,
          enum: ['local', 'drive', 'blob'],
          default: 'local',
        },
        size: {type: Number, required: true},
      },
    ],
  },
  {timestamps: true},
);

export default (mongoose.models.ToDo as Model<IToDo>) || mongoose.model<IToDo>('ToDo', ToDoSchema);
