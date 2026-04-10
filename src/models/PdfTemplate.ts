import mongoose, {Document, Model, Schema} from 'mongoose';

export interface ITemplateField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'date' | 'amount' | 'checkbox' | 'signature' | 'other';
  description: string;
  required: boolean;
  defaultValue: string;
  page: number;
  x: number; // fraction of page width  (0–1)
  y: number; // fraction of page height (0–1, from top)
}

export interface IPdfTemplate extends Document {
  name: string;
  description: string;
  fileName: string;
  pdfBase64: string; // full PDF stored as base64
  pageCount: number;
  fields: ITemplateField[];
  createdAt: Date;
  updatedAt: Date;
}

const TemplateFieldSchema = new Schema<ITemplateField>(
  {
    id: {type: String, required: true},
    name: {type: String, required: true},
    label: {type: String, required: true},
    type: {type: String, enum: ['text', 'date', 'amount', 'checkbox', 'signature', 'other'], default: 'text'},
    description: {type: String, default: ''},
    required: {type: Boolean, default: false},
    defaultValue: {type: String, default: ''},
    page: {type: Number, default: 0},
    x: {type: Number, required: true},
    y: {type: Number, required: true},
  },
  {_id: false},
);

const PdfTemplateSchema = new Schema<IPdfTemplate>(
  {
    name: {type: String, required: true},
    description: {type: String, default: ''},
    fileName: {type: String, required: true},
    pdfBase64: {type: String, required: true},
    pageCount: {type: Number, default: 1},
    fields: {type: [TemplateFieldSchema], default: []},
  },
  {timestamps: true},
);

const PdfTemplate: Model<IPdfTemplate> =
  mongoose.models.PdfTemplate || mongoose.model<IPdfTemplate>('PdfTemplate', PdfTemplateSchema);

export default PdfTemplate;
