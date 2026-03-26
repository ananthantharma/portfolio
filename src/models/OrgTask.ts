import mongoose, {Document, Model, Schema} from 'mongoose';

export interface IOrgTask extends Document {
  _id: string;
  userEmail: string;
  title: string;
  description?: string;
  priority: 'High' | 'Medium' | 'Low' | 'None';
  status: 'backlog' | 'this-week' | 'in-progress' | 'review' | 'done';
  dueDate: Date;
  category?: string;
  subtasks?: {_id?: string; title: string; isCompleted: boolean}[];
  isCompleted: boolean;
  isMinimized?: boolean;
  order?: number;
  neonColor?: 'red' | 'blue' | 'green' | null;
  estimatedMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrgTaskSchema = new Schema<IOrgTask>(
  {
    userEmail: {type: String, required: true, index: true},
    title: {type: String, required: true},
    description: {type: String},
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'None'],
      default: 'None',
    },
    status: {
      type: String,
      enum: ['backlog', 'this-week', 'in-progress', 'review', 'done'],
      default: 'backlog',
    },
    dueDate: {type: Date, default: Date.now},
    category: {type: String},
    subtasks: [
      {
        title: {type: String, required: true},
        isCompleted: {type: Boolean, default: false},
      },
    ],
    isCompleted: {type: Boolean, default: false},
    isMinimized: {type: Boolean, default: true},
    order: {type: Number, default: 0},
    neonColor: {
      type: String,
      enum: ['red', 'blue', 'green', null],
      default: null,
    },
    estimatedMinutes: {type: Number},
  },
  {timestamps: true},
);

export default (mongoose.models.OrgTask as Model<IOrgTask>) || mongoose.model<IOrgTask>('OrgTask', OrgTaskSchema);
