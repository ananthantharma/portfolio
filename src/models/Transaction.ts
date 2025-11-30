import mongoose, {model, models, Schema} from 'mongoose';

export interface ITransaction {
  _id: string;
  date: Date | string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  property?: mongoose.Types.ObjectId | { _id: string; name: string; type: string };
  isRecurring: boolean;
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
      enum: ['Income', 'Expense'],
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
  },
  {timestamps: true},
);

const Transaction = models.Transaction || model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
