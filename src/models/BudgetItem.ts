import mongoose, {Document, Model, Schema} from 'mongoose';

export interface IBudgetItemData {
    name: string;
    amount: number;
    type: 'Income' | 'Expense';
    category: string;
    propertyTag: string;
    isVariable: boolean;
}

export interface IBudgetItem extends IBudgetItemData, Document {
    createdAt: Date;
    updatedAt: Date;
}

const BudgetItemSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name for this item.'],
            maxlength: [60, 'Name cannot be more than 60 characters'],
        },
        amount: {
            type: Number,
            required: [true, 'Please provide a monthly amount.'],
        },
        type: {
            type: String,
            enum: ['Income', 'Expense'],
            required: [true, 'Please specify if this is an Income or Expense.'],
        },
        category: {
            type: String,
            required: [true, 'Please specify a category.'],
        },
        propertyTag: {
            type: String,
            default: 'General',
        },
        isVariable: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const BudgetItem: Model<IBudgetItem> =
    mongoose.models.BudgetItem || mongoose.model<IBudgetItem>('BudgetItem', BudgetItemSchema);

export default BudgetItem;
