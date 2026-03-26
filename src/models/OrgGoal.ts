import mongoose, {Document, Model, Schema} from 'mongoose';

export interface IOrgGoal extends Document {
  _id: string;
  userEmail: string;
  title: string;
  description?: string;
  category: 'Work' | 'Personal' | 'Health' | 'Finance' | 'Learning' | 'Other';
  color: string;
  emoji: string;
  targetDate: Date;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  milestones: {_id?: string; title: string; isCompleted: boolean; dueDate?: Date}[];
  createdAt: Date;
  updatedAt: Date;
}

const OrgGoalSchema = new Schema<IOrgGoal>(
  {
    userEmail: {type: String, required: true, index: true},
    title: {type: String, required: true},
    description: {type: String},
    category: {
      type: String,
      enum: ['Work', 'Personal', 'Health', 'Finance', 'Learning', 'Other'],
      default: 'Work',
    },
    color: {type: String, default: '#6366f1'},
    emoji: {type: String, default: '🎯'},
    targetDate: {type: Date, required: true},
    progress: {type: Number, default: 0, min: 0, max: 100},
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
    },
    milestones: [
      {
        title: {type: String, required: true},
        isCompleted: {type: Boolean, default: false},
        dueDate: {type: Date},
      },
    ],
  },
  {timestamps: true},
);

export default (mongoose.models.OrgGoal as Model<IOrgGoal>) || mongoose.model<IOrgGoal>('OrgGoal', OrgGoalSchema);
