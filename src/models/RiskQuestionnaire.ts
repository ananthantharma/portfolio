import mongoose, {Document, Model, Schema} from 'mongoose';

export type QuestionnaireStatus = 'Pending' | 'Sent' | 'In Progress' | 'Completed' | 'Overdue';

export interface IAnswer {
  questionId: string;
  question: string;
  answer: string;
  score?: number; // 0-100 contribution to risk
}

export interface IRiskQuestionnaire extends Document {
  userEmail: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  status: QuestionnaireStatus;
  answers: IAnswer[];
  completedAt?: Date;
  dueDate?: Date;
  calculatedRiskScore?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: {type: String, required: true},
    question: {type: String, required: true},
    answer: {type: String, default: ''},
    score: {type: Number},
  },
  {_id: false},
);

const RiskQuestionnaireSchema = new Schema<IRiskQuestionnaire>(
  {
    userEmail: {type: String, required: true, index: true},
    supplierId: {type: Schema.Types.ObjectId, ref: 'Supplier', required: true},
    supplierName: {type: String, required: true},
    status: {
      type: String,
      enum: ['Pending', 'Sent', 'In Progress', 'Completed', 'Overdue'],
      default: 'Pending',
    },
    answers: [AnswerSchema],
    completedAt: {type: Date},
    dueDate: {type: Date},
    calculatedRiskScore: {type: Number},
    notes: {type: String},
  },
  {timestamps: true},
);

const RiskQuestionnaire: Model<IRiskQuestionnaire> =
  mongoose.models.RiskQuestionnaire ||
  mongoose.model<IRiskQuestionnaire>('RiskQuestionnaire', RiskQuestionnaireSchema);

export default RiskQuestionnaire;
