import mongoose, {Document, Schema} from 'mongoose';

interface IContactItem {
  type: string;
  text: string;
  href?: string;
}

interface ISocialLink {
  label: string;
  iconKey: string;
  href: string;
  order: number;
}

export interface IPortfolioProfile extends Document {
  name: string;
  metaTitle: string;
  metaDescription: string;
  heroDescription1: string;
  heroDescription2: string;
  contactHeaderText: string;
  contactDescription: string;
  contactItems: IContactItem[];
  socialLinks: ISocialLink[];
}

const schema = new Schema<IPortfolioProfile>(
  {
    name: String,
    metaTitle: String,
    metaDescription: String,
    heroDescription1: String,
    heroDescription2: String,
    contactHeaderText: String,
    contactDescription: String,
    contactItems: [{type: {type: String}, text: String, href: String}],
    socialLinks: [{label: String, iconKey: String, href: String, order: {type: Number, default: 0}}],
  },
  {timestamps: true},
);

export default mongoose.models.PortfolioProfile ||
  mongoose.model<IPortfolioProfile>('PortfolioProfile', schema);
