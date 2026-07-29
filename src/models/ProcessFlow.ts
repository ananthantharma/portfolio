import mongoose, {Schema, Document, Model} from 'mongoose';

interface IProcessFlow extends Document {
  userId: string;
  name: string;
  data: Record<string, unknown>;
  lastUpdated: Date;
}

const ProcessFlowSchema = new Schema<IProcessFlow>({
  userId: {type: String, required: true},
  name: {type: String, required: true, default: 'Untitled Flow'},
  data: {type: Schema.Types.Mixed, default: {}},
  lastUpdated: {type: Date, default: Date.now},
});

const ProcessFlow: Model<IProcessFlow> =
  mongoose.models.ProcessFlow || mongoose.model<IProcessFlow>('ProcessFlow', ProcessFlowSchema);

export default ProcessFlow;
