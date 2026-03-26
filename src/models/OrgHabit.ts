import mongoose, {Document, Model, Schema} from 'mongoose';

export interface IOrgHabit extends Document {
  _id: string;
  userEmail: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  targetDays: number[];
  completions: {date: string; completed: boolean}[];
  streak: number;
  bestStreak: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrgHabitSchema = new Schema<IOrgHabit>(
  {
    userEmail: {type: String, required: true, index: true},
    title: {type: String, required: true},
    description: {type: String},
    icon: {type: String, default: '⚡'},
    color: {type: String, default: '#6366f1'},
    frequency: {
      type: String,
      enum: ['daily', 'weekdays', 'weekends', 'custom'],
      default: 'daily',
    },
    targetDays: [{type: Number}],
    completions: [
      {
        date: {type: String, required: true},
        completed: {type: Boolean, default: false},
      },
    ],
    streak: {type: Number, default: 0},
    bestStreak: {type: Number, default: 0},
    order: {type: Number, default: 0},
  },
  {timestamps: true},
);

export default (mongoose.models.OrgHabit as Model<IOrgHabit>) || mongoose.model<IOrgHabit>('OrgHabit', OrgHabitSchema);
