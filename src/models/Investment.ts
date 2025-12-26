import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInvestment {
  userEmail?: string;
  ticker: string;
  quantity: number;
  purchaseDate: Date;
  bookPrice: number;
  category: 'RRSP' | 'TFSA' | 'RESP' | 'CASH';
}

export interface IInvestmentDocument extends IInvestment, Document {
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentSchema = new Schema<IInvestmentDocument>(
  {
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      index: true,
    },
    ticker: {
      type: String,
      required: [true, 'Ticker symbol is required'],
      uppercase: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 0,
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now,
    },
    bookPrice: {
      type: Number,
      required: [true, 'Book price is required'],
      min: 0,
    },
    category: {
      type: String,
      enum: ['RRSP', 'TFSA', 'RESP', 'CASH'],
      required: [true, 'Category is required'],
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate compilation
const Investment: Model<IInvestmentDocument> =
  mongoose.models.Investment || mongoose.model<IInvestmentDocument>('Investment', InvestmentSchema);

export default Investment;
