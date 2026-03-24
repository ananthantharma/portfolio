import mongoose, {Document, Schema} from 'mongoose';

interface ISkill {
  name: string;
  level: number;
}

export interface IPortfolioSkillGroup extends Document {
  name: string;
  skills: ISkill[];
  order: number;
}

const schema = new Schema<IPortfolioSkillGroup>(
  {
    name: String,
    skills: [{name: String, level: Number}],
    order: {type: Number, default: 0},
  },
  {timestamps: true},
);

export default mongoose.models.PortfolioSkillGroup ||
  mongoose.model<IPortfolioSkillGroup>('PortfolioSkillGroup', schema);
