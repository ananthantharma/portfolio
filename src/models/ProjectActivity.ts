import mongoose, {Document, Model, Schema} from 'mongoose';

export const ACTIVITY_TYPES = ['note', 'task', 'document', 'decision', 'attention', 'project'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// Automatic history of significant changes on a project page. Written by the server only.
export interface IProjectActivity extends Document {
  userEmail: string;
  sectionId: mongoose.Types.ObjectId;
  type: ActivityType;
  action: string; // e.g. 'created', 'completed', 'added', 'resolved', 'changed'
  label: string; // "Task created", "Risk resolved", "Project health changed"
  title: string; // what it happened to: "SAP EA Analysis", "On Track → At Risk"
  refId?: string | null; // id of the record, for jumping to it later
  createdAt: Date;
}

const ProjectActivitySchema = new Schema<IProjectActivity>(
  {
    userEmail: {type: String, required: true},
    sectionId: {type: Schema.Types.ObjectId, ref: 'NoteSection', required: true},
    type: {type: String, enum: ACTIVITY_TYPES, required: true},
    action: {type: String, required: true, maxlength: 40},
    label: {type: String, required: true, maxlength: 80},
    title: {type: String, default: '', maxlength: 240},
    refId: {type: String, default: null},
  },
  {timestamps: {createdAt: true, updatedAt: false}},
);

ProjectActivitySchema.index({userEmail: 1, sectionId: 1, createdAt: -1});

export default (mongoose.models.ProjectActivity as Model<IProjectActivity>) ||
  mongoose.model<IProjectActivity>('ProjectActivity', ProjectActivitySchema);
