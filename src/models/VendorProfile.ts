import mongoose, {Document, Model, Schema} from 'mongoose';

// Vendor and project pages share this profile (keyed by section); statuses cover both
export const VENDOR_STATUSES = ['Active', 'Onboarding', 'Under review', 'Inactive', 'Planning', 'On hold', 'Complete'] as const;
// Vendor agreement types plus the project document categories
export const VENDOR_DOC_TYPES = [
  'MSA',
  'DPA',
  'SOW',
  'NDA',
  'Order form',
  'Agreement',
  'Contract',
  'Presentation',
  'Report',
  'Analysis',
  'Requirements',
  'Architecture',
  'Commercial',
  'Other',
] as const;

export const PROJECT_HEALTH = ['On Track', 'At Risk', 'Critical', 'Complete'] as const;
export const PROJECT_PHASES = ['Initiation', 'Planning', 'Design', 'Execution', 'Testing', 'Deployment', 'Closure'] as const;
export const DECISION_STATUSES = ['Active', 'Superseded', 'Reversed'] as const;
export const ATTENTION_TYPES = ['Risk', 'Issue', 'Blocker', 'Dependency'] as const;
export const ATTENTION_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ATTENTION_STATUSES = ['Open', 'Monitoring', 'Resolved'] as const;

export interface IVendorKeyContact {
  contactId: mongoose.Types.ObjectId;
  role?: string;
  note?: string; // what this person does on this vendor / project
}

export interface IVendorLink {
  _id?: mongoose.Types.ObjectId;
  title: string;
  url: string;
  pinned?: boolean;
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
  notes?: string; // shown on the page so you know what it is without opening it
  pinned?: boolean;
  createdAt?: Date;
}

export interface IVendorOrgChart {
  view: 'chart' | 'image';
  imageFileId?: mongoose.Types.ObjectId | null;
  flowData?: Record<string, unknown> | null; // ProcessFlowBuilder state
  flowPngFileId?: mongoose.Types.ObjectId | null; // rendered preview of flowData
  updatedAt?: Date | null;
}

export interface IProjectDecision {
  _id?: mongoose.Types.ObjectId;
  title: string;
  details: string;
  decisionDate?: Date | null;
  reason: string;
  status: (typeof DECISION_STATUSES)[number];
  noteId?: string | null; // related note (NotePage id)
  documentId?: string | null; // related document (documents subdocument id)
  pinned?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProjectAttention {
  _id?: mongoose.Types.ObjectId;
  title: string;
  type: (typeof ATTENTION_TYPES)[number];
  description: string;
  severity: (typeof ATTENTION_SEVERITIES)[number];
  status: (typeof ATTENTION_STATUSES)[number];
  dueDate?: Date | null;
  resolution: string;
  createdAt?: Date;
  updatedAt?: Date;
  resolvedAt?: Date | null;
}

// Hand-written for now; `source` leaves room for an AI-generated brief later
export interface IProjectBrief {
  text: string;
  source: 'manual' | 'ai';
  updatedAt?: Date | null;
}

// One profile per vendor or project section
export interface IVendorProfile extends Document {
  userEmail: string;
  sectionId: mongoose.Types.ObjectId;
  summary: string;
  status: (typeof VENDOR_STATUSES)[number];
  website: string;
  orgChart: IVendorOrgChart;
  keyContacts: IVendorKeyContact[];
  // People in your own organization who work with this vendor
  internalContacts: IVendorKeyContact[];
  links: IVendorLink[];
  documents: IVendorDocument[];
  // Project fields
  phase: string;
  health: (typeof PROJECT_HEALTH)[number];
  startDate?: Date | null;
  targetDate?: Date | null;
  owner: string;
  currentFocus: string;
  brief: IProjectBrief;
  decisions: IProjectDecision[];
  attention: IProjectAttention[];
  lastVisitedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const contactLink = {
  _id: false,
  contactId: {type: Schema.Types.ObjectId, ref: 'Contact', required: true},
  role: {type: String, default: ''},
  note: {type: String, default: '', maxlength: 2000},
};

const VendorProfileSchema = new Schema<IVendorProfile>(
  {
    userEmail: {type: String, required: true},
    sectionId: {type: Schema.Types.ObjectId, ref: 'NoteSection', required: true},
    summary: {type: String, default: '', maxlength: 400},
    status: {type: String, enum: VENDOR_STATUSES, default: 'Active'},
    website: {type: String, default: ''},
    orgChart: {
      view: {type: String, enum: ['chart', 'image'], default: 'image'},
      imageFileId: {type: Schema.Types.ObjectId, ref: 'VendorFile', default: null},
      flowData: {type: Schema.Types.Mixed, default: null},
      flowPngFileId: {type: Schema.Types.ObjectId, ref: 'VendorFile', default: null},
      updatedAt: {type: Date, default: null},
    },
    keyContacts: [contactLink],
    internalContacts: [contactLink],
    links: [
      {
        title: {type: String, required: true, maxlength: 120},
        url: {type: String, required: true},
        pinned: {type: Boolean, default: false},
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
        notes: {type: String, default: '', maxlength: 4000},
        pinned: {type: Boolean, default: false},
        createdAt: {type: Date, default: Date.now},
      },
    ],
    phase: {type: String, default: '', maxlength: 40},
    health: {type: String, enum: PROJECT_HEALTH, default: 'On Track'},
    startDate: {type: Date, default: null},
    targetDate: {type: Date, default: null},
    owner: {type: String, default: '', maxlength: 80},
    currentFocus: {type: String, default: '', maxlength: 240},
    brief: {
      text: {type: String, default: '', maxlength: 3000},
      source: {type: String, enum: ['manual', 'ai'], default: 'manual'},
      updatedAt: {type: Date, default: null},
    },
    decisions: [
      {
        title: {type: String, required: true, maxlength: 200},
        details: {type: String, default: '', maxlength: 6000},
        decisionDate: {type: Date, default: null},
        reason: {type: String, default: '', maxlength: 4000},
        status: {type: String, enum: DECISION_STATUSES, default: 'Active'},
        noteId: {type: String, default: null},
        documentId: {type: String, default: null},
        pinned: {type: Boolean, default: false},
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now},
      },
    ],
    attention: [
      {
        title: {type: String, required: true, maxlength: 200},
        type: {type: String, enum: ATTENTION_TYPES, default: 'Risk'},
        description: {type: String, default: '', maxlength: 4000},
        severity: {type: String, enum: ATTENTION_SEVERITIES, default: 'Medium'},
        status: {type: String, enum: ATTENTION_STATUSES, default: 'Open'},
        dueDate: {type: Date, default: null},
        resolution: {type: String, default: '', maxlength: 4000},
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now},
        resolvedAt: {type: Date, default: null},
      },
    ],
    lastVisitedAt: {type: Date, default: null},
  },
  {timestamps: true},
);

VendorProfileSchema.index({userEmail: 1, sectionId: 1}, {unique: true});

export default (mongoose.models.VendorProfile as Model<IVendorProfile>) ||
  mongoose.model<IVendorProfile>('VendorProfile', VendorProfileSchema);
