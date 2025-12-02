import mongoose, {Document, Model, Schema} from 'mongoose';

import {BUDGET_CATEGORIES, INCOME_CATEGORIES} from '@/lib/categories';

// Data Transfer Object (DTO) for creating/updating items
export interface IBudgetItemData {
  name: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  subcategory: string;
  propertyTag: string;
  isVariable: boolean;
}

// Mongoose Document Interface
export interface IBudgetItem extends IBudgetItemData, Document {}

const BudgetItemSchema: Schema = new Schema(
  {
    name: {required: true, type: String},
    amount: {required: true, type: Number},
    type: {enum: ['Income', 'Expense'], required: true, type: String},
    category: {
      required: true,
      type: String,
      validate: {
        validator: function (v: string) {
          // Allow "Income" as a category for Income items
          if (v === 'Income') return true;
          // Otherwise must be a key in BUDGET_CATEGORIES
          return Object.keys(BUDGET_CATEGORIES).includes(v);
        },
        message: (props: {value: string}) => `${props.value} is not a valid category!`,
      },
    },
    subcategory: {
      required: true,
      type: String,
      validate: {
        validator: function (this: IBudgetItem, v: string) {
          if (this.type === 'Income') {
            return INCOME_CATEGORIES.includes(v);
          }
          const validSubcategories = BUDGET_CATEGORIES[this.category as keyof typeof BUDGET_CATEGORIES];
          return validSubcategories && validSubcategories.includes(v);
        },
        message: (props: {value: string}) => `${props.value} is not a valid subcategory!`,
      },
    },
    propertyTag: {default: 'General', type: String},
    isVariable: {default: false, type: Boolean},
  },
  {timestamps: true},
);

const BudgetItem: Model<IBudgetItem> =
  mongoose.models.BudgetItem || mongoose.model<IBudgetItem>('BudgetItem', BudgetItemSchema);

export default BudgetItem;
