import {model, models, Schema} from 'mongoose';

export interface IProperty {
  name: string;
  address: string;
  type: 'Primary Residence' | 'Rental';
}

const PropertySchema = new Schema<IProperty>(
  {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Primary Residence', 'Rental'],
      required: true,
    },
  },
  {timestamps: true},
);

const Property = models.Property || model<IProperty>('Property', PropertySchema);

export default Property;
