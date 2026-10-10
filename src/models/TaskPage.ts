import mongoose, {Document, Model, Schema} from 'mongoose';

/** The private page behind a task: only reachable by opening that task, never listed with notes. */
export interface ITaskPage extends Document {
  userEmail: string;
  taskId: mongoose.Types.ObjectId;
  content: string; // editor HTML
  createdAt: Date;
  updatedAt: Date;
}

const TaskPageSchema = new Schema<ITaskPage>(
  {
    userEmail: {type: String, required: true, index: true},
    taskId: {type: Schema.Types.ObjectId, ref: 'ToDo', required: true, index: true},
    content: {type: String, default: ''},
  },
  {timestamps: true},
);

export default (mongoose.models.TaskPage as Model<ITaskPage>) || mongoose.model<ITaskPage>('TaskPage', TaskPageSchema);
