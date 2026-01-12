import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISourcingEvent extends Document {
    userId: string;
    sourcePageId?: string;
    commodityCategory?: string;
    subCategory?: string;
    description?: string;
    facility?: string;
    vendors?: string[];
    vendorTier?: string;
    existingVendor?: boolean;
    diversityClassification?: boolean;
    indigenousOpportunity?: boolean;
    activityType?: string;
    sourcingStatus?: string;
    status?: string;
    onTrack?: string; // On Track / Late
    categoryLead?: string;
    department?: string;
    riskLevel?: string;
    vendorPerformance?: number;
    effectiveDate?: Date;
    expirationDate?: Date;
    needDate?: Date;
    renewalType?: string;
    msaVor?: string;
    estimatedContractValue?: number;
    spendType?: string;
    costSavings?: number;
    purchaseOrder?: string;
    eventName?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SourcingEventSchema = new Schema<ISourcingEvent>(
    {
        userId: { type: String, required: true },
        sourcePageId: { type: String },
        eventName: { type: String },
        notes: { type: String },
        commodityCategory: { type: String },
        subCategory: { type: String },
        description: { type: String },
        facility: { type: String },
        vendors: { type: [String], default: [] },
        vendorTier: { type: String },
        existingVendor: { type: Boolean, default: false },
        diversityClassification: { type: Boolean, default: false },
        indigenousOpportunity: { type: Boolean, default: false },
        activityType: { type: String },
        sourcingStatus: { type: String },
        status: { type: String },
        onTrack: { type: String, default: 'On Track' },
        categoryLead: { type: String },
        department: { type: String },
        riskLevel: { type: String },
        vendorPerformance: { type: Number, min: 1, max: 5 },
        effectiveDate: { type: Date },
        expirationDate: { type: Date },
        needDate: { type: Date },
        renewalType: { type: String },
        msaVor: { type: String },
        estimatedContractValue: { type: Number },
        spendType: { type: String },
        costSavings: { type: Number },
        purchaseOrder: { type: String },
    },
    { timestamps: true }
);

const SourcingEvent: Model<ISourcingEvent> =
    mongoose.models.SourcingEvent || mongoose.model<ISourcingEvent>('SourcingEvent', SourcingEventSchema);

export default SourcingEvent;
