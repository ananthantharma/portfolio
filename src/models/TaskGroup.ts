import mongoose, {Document, Model, Schema} from 'mongoose';

/** A user-made heading in the task list, for tasks that aren't linked to a project or vendor. */
export interface ITaskGroup extends Document {
  userEmail: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskGroupSchema = new Schema<ITaskGroup>(
  {
    userEmail: {type: String, required: true, index: true},
    name: {type: String, required: true, trim: true, maxlength: 80},
  },
  {timestamps: true},
);

export default (mongoose.models.TaskGroup as Model<ITaskGroup>) || mongoose.model<ITaskGroup>('TaskGroup', TaskGroupSchema);
