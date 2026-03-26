import mongoose, {Document, Model, Schema} from 'mongoose';

export type AlertSeverity = 'Info' | 'Warning' | 'High' | 'Critical';
export type AlertCategory = 'Financial' | 'Operational' | 'Compliance' | 'ESG' | 'News' | 'System';

export interface IRiskAlert extends Document {
  userEmail: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  source?: string; // e.g. "Reuters", "Government DB", "Internal"
  isRead: boolean;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RiskAlertSchema = new Schema<IRiskAlert>(
  {
    userEmail: {type: String, required: true, index: true},
    supplierId: {type: Schema.Types.ObjectId, ref: 'Supplier', required: true},
    supplierName: {type: String, required: true},
    severity: {
      type: String,
      enum: ['Info', 'Warning', 'High', 'Critical'],
      required: true,
    },
    category: {
      type: String,
      enum: ['Financial', 'Operational', 'Compliance', 'ESG', 'News', 'System'],
      required: true,
    },
    title: {type: String, required: true},
    description: {type: String, required: true},
    source: {type: String},
    isRead: {type: Boolean, default: false},
    isResolved: {type: Boolean, default: false},
    resolvedAt: {type: Date},
    resolvedBy: {type: String},
  },
  {timestamps: true},
);

const RiskAlert: Model<IRiskAlert> =
  mongoose.models.RiskAlert || mongoose.model<IRiskAlert>('RiskAlert', RiskAlertSchema);

export default RiskAlert;
