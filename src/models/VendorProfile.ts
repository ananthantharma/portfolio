import mongoose, {Document, Model, Schema} from 'mongoose';

export const VENDOR_STATUSES = ['Active', 'Onboarding', 'Under review', 'Inactive'] as const;
export const VENDOR_DOC_TYPES = ['MSA', 'DPA', 'SOW', 'NDA', 'Order form', 'Other'] as const;

export interface IVendorKeyContact {
  contactId: mongoose.Types.ObjectId;
  role?: string;
}

export interface IVendorLink {
  _id?: mongoose.Types.ObjectId;
  title: string;
  url: string;
}

export interface IVendorDocument {
  _id?: mongoose.Types.ObjectId;
  title: string;
  docType: (typeof VENDOR_DOC_TYPES)[number];
  signedDate?: Date | null;
  expiryDate?: Date | null;
  // Either an uploaded file or an external link (e.g. SharePoint / Drive for large files)
  fileId?: mongoose.Types.ObjectId | null;
  fileName?: string;
  contentType?: string;
  size?: number;
  url?: string;
  createdAt?: Date;
}

export interface IVendorOrgChart {
  view: 'chart' | 'image';
  imageFileId?: mongoose.Types.ObjectId | null;
  flowData?: Record<string, unknown> | null; // ProcessFlowBuilder state
  flowPngFileId?: mongoose.Types.ObjectId | null; // rendered preview of flowData
  updatedAt?: Date | null;
}

// One profile per vendor section in a vendor notebook
export interface IVendorProfile extends Document {
  userEmail: string;
  sectionId: mongoose.Types.ObjectId;
  summary: string;
  status: (typeof VENDOR_STATUSES)[number];
  website: string;
  orgChart: IVendorOrgChart;
  keyContacts: IVendorKeyContact[];
  links: IVendorLink[];
  documents: IVendorDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const VendorProfileSchema = new Schema<IVendorProfile>(
  {
    userEmail: {type: String, required: true},
    sectionId: {type: Schema.Types.ObjectId, ref: 'NoteSection', required: true},
    summary: {type: String, default: '', maxlength: 200},
    status: {type: String, enum: VENDOR_STATUSES, default: 'Active'},
    website: {type: String, default: ''},
    orgChart: {
      view: {type: String, enum: ['chart', 'image'], default: 'image'},
      imageFileId: {type: Schema.Types.ObjectId, ref: 'VendorFile', default: null},
      flowData: {type: Schema.Types.Mixed, default: null},
      flowPngFileId: {type: Schema.Types.ObjectId, ref: 'VendorFile', default: null},
      updatedAt: {type: Date, default: null},
    },
    keyContacts: [
      {
        _id: false,
        contactId: {type: Schema.Types.ObjectId, ref: 'Contact', required: true},
        role: {type: String, default: ''},
      },
    ],
    links: [
      {
        title: {type: String, required: true, maxlength: 120},
        url: {type: String, required: true},
      },
    ],
    documents: [
      {
        title: {type: String, required: true, maxlength: 160},
        docType: {type: String, enum: VENDOR_DOC_TYPES, default: 'Other'},
        signedDate: {type: Date, default: null},
        expiryDate: {type: Date, default: null},
        fileId: {type: Schema.Types.ObjectId, ref: 'VendorFile', default: null},
        fileName: {type: String, default: ''},
        contentType: {type: String, default: ''},
        size: {type: Number, default: 0},
        url: {type: String, default: ''},
        createdAt: {type: Date, default: Date.now},
      },
    ],
  },
  {timestamps: true},
);

VendorProfileSchema.index({userEmail: 1, sectionId: 1}, {unique: true});

export default (mongoose.models.VendorProfile as Model<IVendorProfile>) ||
  mongoose.model<IVendorProfile>('VendorProfile', VendorProfileSchema);
