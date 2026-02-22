import mongoose, {Schema, Document} from 'mongoose';

export interface ITableDoc extends Document {
  name: string;
  columns: any[];
  rows: any[]; // The hierarchical data
  createdAt: Date;
  updatedAt: Date;
}

const TableDocSchema: Schema = new Schema(
  {
    name: {type: String, required: true},
    columns: {type: Array, default: []},
    rows: {type: Array, default: []},
  },
  {timestamps: true},
);

// Prevent overwrite on hot reload
export default mongoose.models.TableDoc || mongoose.model<ITableDoc>('TableDoc', TableDocSchema);
