import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITask {
    id: string;
    name: string;
    start: Date;
    end: Date;
    progress: number;
    category: string;
    parentId?: string;
    type?: 'task' | 'milestone';
}

interface IGanttChart extends Document {
    userId: string;
    name: string;
    tasks: ITask[];
    categoryColors: Record<string, string>;
    lastUpdated: Date;
}

const TaskSchema = new Schema<ITask>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    progress: { type: Number, default: 0 },
    category: { type: String, default: 'default' },
    parentId: { type: String },
    type: { type: String, default: 'task', enum: ['task', 'milestone'] },
});

const GanttChartSchema = new Schema<IGanttChart>({
    userId: { type: String, required: true }, // Removed unique: true to allow multiple charts
    name: { type: String, required: true, default: 'Untitled Project' },
    tasks: [TaskSchema],
    categoryColors: { type: Map, of: String, default: {} },
    lastUpdated: { type: Date, default: Date.now },
});

// Helper to handle Next.js hot reloading
const GanttChart: Model<IGanttChart> = mongoose.models.GanttChart || mongoose.model<IGanttChart>('GanttChart', GanttChartSchema);

export default GanttChart;
