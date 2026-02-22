import mongoose, {Schema, Document, Model} from 'mongoose';

export interface ISourcingConfig extends Document {
  userId: string;
  facilities: string[];
  activityTypes: string[];
  sourcingStatuses: string[];
  categoryLeads: string[];
  statuses: string[];
  departments: string[];
  renewalTypes: string[];
  spendTypes: string[];
  msaVorOptions: string[];
}

const SourcingConfigSchema = new Schema<ISourcingConfig>({
  userId: {type: String, required: true, unique: true},
  facilities: {type: [String], default: ['Nuclear', 'DNNP', 'Pickering', 'Darlington', 'Renewable Generation']},
  activityTypes: {
    type: [String],
    default: [
      'Benchmark',
      'BPO Management',
      'Category Strategy',
      'Contract Amendment',
      'Contract Extension',
      'Contract Negotiation',
      'Contract Renewal',
      'Contract Strategy',
      'NDA',
      'PO Management',
      'POC (Proof of Concept)',
      'RFI (Request for Information)',
      'RFMI',
      'RFP (Request for Proposal)',
      'RFPQ (Request for Pre-Qualification)',
      'RFQ (Request for Quotation)',
      'SRM (Supplier Relationship Management)',
      'Supplier Qualification',
      'Vendor Scorecard',
    ],
  },
  sourcingStatuses: {
    type: [String],
    default: [
      'Purchase Requisition',
      'PR Approval',
      'Budget Check',
      'Sourcing/RFP',
      'Vendor Selection',
      'Contract Negotiation',
      'Contract Signed',
      'PO Creation',
      'PO Approval',
      'PO Issued',
    ],
  },
  categoryLeads: {
    type: [String],
    default: ['Jermaine Chin', 'Parul Singh', 'Jonathan Cardoso', 'Rohan Segal', 'Ananthan'],
  },
  statuses: {
    type: [String],
    default: ['Active', 'Pending', 'Complete', 'On Hold', 'Cancelled'],
  },
  departments: {
    type: [String],
    default: ['IT', 'HR', 'Finance', 'Operations', 'Legal', 'Marketing'],
  },
  renewalTypes: {
    type: [String],
    default: ['Auto-renew', 'Manual', 'One-time'],
  },
  spendTypes: {
    type: [String],
    default: ['OpEx', 'CapEx'],
  },
  msaVorOptions: {
    // Just for suggestions if needed, though MSA often free text. User asked for options.
    type: [String],
    default: ['MSA', 'VOR', 'SOW'],
  },
});

const SourcingConfig: Model<ISourcingConfig> =
  mongoose.models.SourcingConfig || mongoose.model<ISourcingConfig>('SourcingConfig', SourcingConfigSchema);

export default SourcingConfig;
