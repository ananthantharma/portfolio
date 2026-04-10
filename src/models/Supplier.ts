import mongoose, {Document, Model, Schema} from 'mongoose';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IRiskDimension {
  score: number; // 0-100
  notes?: string;
}

export interface ISupplier extends Document {
  userEmail: string;
  name: string;
  country: string;
  category: string; // e.g. "Electronics", "Raw Materials", "Logistics"
  contactName?: string;
  contactEmail?: string;
  website?: string;
  annualSpend?: number;
  currency: string;
  status: 'Active' | 'Onboarding' | 'Under Review' | 'Suspended' | 'Inactive';
  riskLevel: RiskLevel;
  overallScore: number; // 0-100, higher = more risky
  financialRisk: IRiskDimension;
  operationalRisk: IRiskDimension;
  complianceRisk: IRiskDimension;
  esgRisk: IRiskDimension;
  lastAssessed?: Date;
  mitigationPlan?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RiskDimensionSchema = new Schema<IRiskDimension>(
  {
    score: {type: Number, required: true, min: 0, max: 100, default: 0},
    notes: {type: String},
  },
  {_id: false},
);

const SupplierSchema = new Schema<ISupplier>(
  {
    userEmail: {type: String, required: true, index: true},
    name: {type: String, required: true},
    country: {type: String, required: true},
    category: {type: String, required: true},
    contactName: {type: String},
    contactEmail: {type: String},
    website: {type: String},
    annualSpend: {type: Number},
    currency: {type: String, default: 'USD'},
    status: {
      type: String,
      enum: ['Active', 'Onboarding', 'Under Review', 'Suspended', 'Inactive'],
      default: 'Active',
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Low',
    },
    overallScore: {type: Number, default: 0, min: 0, max: 100},
    financialRisk: {type: RiskDimensionSchema, default: () => ({score: 0})},
    operationalRisk: {type: RiskDimensionSchema, default: () => ({score: 0})},
    complianceRisk: {type: RiskDimensionSchema, default: () => ({score: 0})},
    esgRisk: {type: RiskDimensionSchema, default: () => ({score: 0})},
    lastAssessed: {type: Date},
    mitigationPlan: {type: String},
    tags: [{type: String}],
  },
  {timestamps: true},
);

// Compute overall score & risk level before saving
SupplierSchema.pre('save', function (next) {
  const weights = {financial: 0.35, operational: 0.3, compliance: 0.2, esg: 0.15};
  this.overallScore = Math.round(
    this.financialRisk.score * weights.financial +
      this.operationalRisk.score * weights.operational +
      this.complianceRisk.score * weights.compliance +
      this.esgRisk.score * weights.esg,
  );
  if (this.overallScore <= 30) this.riskLevel = 'Low';
  else if (this.overallScore <= 60) this.riskLevel = 'Medium';
  else if (this.overallScore <= 80) this.riskLevel = 'High';
  else this.riskLevel = 'Critical';
  next();
});

const Supplier: Model<ISupplier> = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);

export default Supplier;
