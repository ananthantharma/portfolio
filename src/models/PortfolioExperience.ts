import mongoose, {Document, Schema} from 'mongoose';

export interface IPortfolioExperience extends Document {
  date: string;
  location: string;
  title: string;
  content: string;
  imageKey: string;
  order: number;
  showInHeroTimeline: boolean;
}

const schema = new Schema<IPortfolioExperience>(
  {
    date: String,
    location: String,
    title: String,
    content: {type: String, default: ''},
    imageKey: {type: String, default: ''},
    order: {type: Number, default: 0},
    showInHeroTimeline: {type: Boolean, default: true},
  },
  {timestamps: true},
);

export default mongoose.models.PortfolioExperience ||
  mongoose.model<IPortfolioExperience>('PortfolioExperience', schema);
