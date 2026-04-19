import mongoose, {Document, Model, Schema} from 'mongoose';

export interface IUser extends Document {
  name?: string;
  email?: string;
  image?: string;
  password?: string;          // hashed — only set for credentials users
  isCredentialsUser?: boolean; // true for username/password accounts
  username?: string;           // optional display username for credentials users
  expiresAt?: Date;            // optional auto-expiry for temp accounts
  googleApiEnabled?: boolean;
  openAiApiEnabled?: boolean;
  notesEnabled?: boolean;
  secureLoginEnabled?: boolean;
  financeEnabled?: boolean;
  invoiceEnabled?: boolean;
  formFillEnabled?: boolean;
  organizePrompt?: string; // Custom prompt for Note Organize feature
  systemInstruction?: string; // Custom prompt for Chat Interface
  badgeSettings?: {
    thresholds: {
      critical: number;
      urgent: number;
      upcoming: number;
      planned: number;
    };
    colors: {
      critical: string;
      urgent: string;
      upcoming: string;
      planned: string;
      longTerm: string;
    };
    animations: {
      critical: string;
      urgent: string;
    };
  };
  emailVerified?: Date;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: String,
    email: String,
    image: String,
    password: {type: String, select: false}, // never returned in queries unless explicitly selected
    isCredentialsUser: {type: Boolean, default: false},
    username: {type: String},
    expiresAt: {type: Date},
    emailVerified: Date,
    lastLogin: Date,
    googleApiEnabled: {type: Boolean, default: false},
    openAiApiEnabled: {type: Boolean, default: false},
    notesEnabled: {type: Boolean, default: false},
    secureLoginEnabled: {type: Boolean, default: false},
    financeEnabled: {type: Boolean, default: false},
    invoiceEnabled: {type: Boolean, default: false},
    formFillEnabled: {type: Boolean, default: false},
    organizePrompt: {type: String},

    systemInstruction: {type: String},
    badgeSettings: {
      thresholds: {
        critical: {type: Number, default: 3},
        urgent: {type: Number, default: 7},
        upcoming: {type: Number, default: 14},
        planned: {type: Number, default: 21},
      },
      colors: {
        critical: {type: String, default: 'bg-red-500'},
        urgent: {type: String, default: 'bg-red-500'},
        upcoming: {type: String, default: 'bg-orange-500'},
        planned: {type: String, default: 'bg-purple-500'},
        longTerm: {type: String, default: 'bg-green-500'},
      },
      animations: {
        critical: {type: String, default: '1s'},
        urgent: {type: String, default: '3s'},
      },
    },
  },
  {
    timestamps: true,
    collection: 'users', // Matches next-auth default collection
  },
);

export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
