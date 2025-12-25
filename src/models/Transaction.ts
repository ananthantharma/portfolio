import mongoose, { model, models, Schema } from 'mongoose';

export interface ITransaction {
  _id: string;
  date: Date | string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense' | 'Transfer';
  category: string;
  property?: mongoose.Types.ObjectId | { _id: string; name: string; type: string };
  isRecurring: boolean;
  cardLast4?: string;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['Income', 'Expense', 'Transfer'],
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: false,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    cardLast4: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

const Transaction = models.Transaction || model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
