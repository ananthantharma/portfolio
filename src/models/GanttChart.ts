import mongoose, {Schema, Document, Model} from 'mongoose';

export interface ITask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  category: string;
  parentId?: string;
  type?: 'task' | 'milestone';
  /** Ids of tasks that must finish before this one starts (finish-to-start) */
  dependencies?: string[];
  assignee?: string;
  notes?: string;
  /** Phase rows folded shut in the view */
  collapsed?: boolean;
}

interface IGanttChart extends Document {
  userId: string;
  name: string;
  description?: string;
  tasks: ITask[];
  categoryColors: Record<string, string>;
  lastUpdated: Date;
}

const TaskSchema = new Schema<ITask>({
  id: {type: String, required: true},
  name: {type: String, required: true},
  start: {type: Date, required: true},
  end: {type: Date, required: true},
  progress: {type: Number, default: 0},
  category: {type: String, default: 'default'},
  parentId: {type: String},
  type: {type: String, default: 'task', enum: ['task', 'milestone']},
  dependencies: {type: [String], default: []},
  assignee: {type: String, default: ''},
  notes: {type: String, default: ''},
  collapsed: {type: Boolean, default: false},
});

const GanttChartSchema = new Schema<IGanttChart>({
  userId: {type: String, required: true}, // Removed unique: true to allow multiple charts
  name: {type: String, required: true, default: 'Untitled Project'},
  description: {type: String, default: ''},
  tasks: [TaskSchema],
  categoryColors: {type: Map, of: String, default: {}},
  lastUpdated: {type: Date, default: Date.now},
});

// Helper to handle Next.js hot reloading
const GanttChart: Model<IGanttChart> =
  mongoose.models.GanttChart || mongoose.model<IGanttChart>('GanttChart', GanttChartSchema);

export default GanttChart;
