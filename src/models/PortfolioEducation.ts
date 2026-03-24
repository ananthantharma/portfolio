import mongoose, {Document, Schema} from 'mongoose';

export interface IPortfolioEducation extends Document {
  date: string;
  location: string;
  title: string;
  imageKey: string;
  order: number;
}

const schema = new Schema<IPortfolioEducation>(
  {
    date: String,
    location: String,
    title: String,
    imageKey: {type: String, default: ''},
    order: {type: Number, default: 0},
  },
  {timestamps: true},
);

export default mongoose.models.PortfolioEducation ||
  mongoose.model<IPortfolioEducation>('PortfolioEducation', schema);
