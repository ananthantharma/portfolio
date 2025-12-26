import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInvoice extends Document {
    userEmail: string;
    vendorName?: string;
    vendorAddress?: string;
    date?: Date;
    dueDate?: Date;
    amount?: number;
    currency?: string;
    description?: string;
    gstNumber?: string;
    category?: string;
    imageUrl?: string; // Base64 or URL
    status: 'Paid' | 'Pending' | 'Overdue';
    createdAt: Date;
    updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
    {
        userEmail: { type: String, required: true, index: true },
        vendorName: { type: String },
        vendorAddress: { type: String },
        date: { type: Date },
        dueDate: { type: Date },
        amount: { type: Number },
        currency: { type: String, default: 'CAD' },
        description: { type: String },
        gstNumber: { type: String },
        category: { type: String },
        imageUrl: { type: String },
        status: {
            type: String,
            enum: ['Paid', 'Pending', 'Overdue'],
            default: 'Pending'
        },
    },
    { timestamps: true }
);

export default (mongoose.models.Invoice as Model<IInvoice>) || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
