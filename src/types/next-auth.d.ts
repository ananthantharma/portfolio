import NextAuth, {DefaultSession} from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
    user: {
      id?: string;
      isTrusted?: boolean;
      isCredentialsUser?: boolean;
      googleApiEnabled?: boolean;
      openAiApiEnabled?: boolean;
      notesEnabled?: boolean;
      secureLoginEnabled?: boolean;
      financeEnabled?: boolean;
      invoiceEnabled?: boolean;
      formFillEnabled?: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    provider?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
