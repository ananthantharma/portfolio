import {MongoDBAdapter} from '@next-auth/mongodb-adapter';
import {AuthOptions} from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';

import clientPromise from './mongodb';

export const ADMIN_EMAIL = 'lankanprinze@gmail.com';

/**
 * Emails that always receive full access with no manual approval needed.
 * Add Google verification / tester accounts here, or set TRUSTED_EMAILS
 * env var as a comma-separated list.
 */
const TRUSTED_EMAILS: Set<string> = new Set([
  ADMIN_EMAIL,
  'davincii.040823@gmail.com',
  ...(process.env.TRUSTED_EMAILS
    ? process.env.TRUSTED_EMAILS.split(',').map(e => e.trim().toLowerCase())
    : []),
]);

const ALL_PERMISSIONS = {
  googleApiEnabled: true,
  openAiApiEnabled: true,
  notesEnabled: true,
  secureLoginEnabled: true,
  financeEnabled: true,
  invoiceEnabled: true,
  formFillEnabled: true,
};

async function fetchPermissions(userId: string) {
  const {ObjectId} = await import('mongodb');
  const client = await clientPromise;
  const db = client.db('qt_portfolio');
  return db.collection('users').findOne({_id: new ObjectId(userId)});
}

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise, {databaseName: 'qt_portfolio'}),

  // JWT strategy is required when using CredentialsProvider alongside MongoDBAdapter.
  // OAuth providers (Google) still store users/accounts in DB; only sessions are JWT-based.
  session: {strategy: 'jwt'},

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    CredentialsProvider({
      name: 'Username & Password',
      credentials: {
        email: {label: 'Email / Username', type: 'text'},
        password: {label: 'Password', type: 'password'},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const client = await clientPromise;
        const db = client.db('qt_portfolio');

        const user = await db.collection('users').findOne(
          {
            isCredentialsUser: true,
            $or: [
              {email: credentials.email.toLowerCase()},
              {username: credentials.email.toLowerCase()},
            ],
          },
          {projection: {password: 1, name: 1, email: 1, image: 1, expiresAt: 1}},
        );

        if (!user) return null;

        if (user.expiresAt && new Date() > new Date(user.expiresAt)) {
          console.log('CredentialsProvider: Account expired for', credentials.email);
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        await db.collection('users').updateOne({_id: user._id}, {$set: {lastLogin: new Date()}});

        return {
          id: user._id.toString(),
          name: user.name ?? credentials.email,
          email: user.email,
          image: user.image ?? null,
        };
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    /**
     * JWT callback — runs on every sign-in and every session access.
     * We store the DB user id, provider, and Google tokens here so the
     * session callback doesn't need extra DB round-trips for token data.
     */
    async jwt({token, user, account}) {
      // First sign-in: persist user id and provider into the token
      if (user) {
        token.uid = user.id;
      }
      if (account) {
        token.provider = account.provider;
        if (account.provider === 'google') {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at; // Unix seconds
        }
      }

      // Refresh Google access token if it has expired
      if (
        token.provider === 'google' &&
        token.expiresAt &&
        typeof token.expiresAt === 'number' &&
        Date.now() / 1000 > token.expiresAt
      ) {
        try {
          const url =
            'https://oauth2.googleapis.com/token?' +
            new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID as string,
              client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
            });

          const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          });
          const refreshed = await response.json();

          if (!response.ok) throw refreshed;

          token.accessToken = refreshed.access_token;
          token.refreshToken = refreshed.refresh_token ?? token.refreshToken;
          token.expiresAt = Math.floor(Date.now() / 1000 + refreshed.expires_in);
          token.error = undefined;

          // Persist refreshed tokens back to the accounts collection
          if (token.uid) {
            const {ObjectId} = await import('mongodb');
            const client = await clientPromise;
            const db = client.db('qt_portfolio');
            await db.collection('accounts').updateOne(
              {provider: 'google', userId: new ObjectId(token.uid as string)},
              {
                $set: {
                  access_token: token.accessToken,
                  refresh_token: token.refreshToken,
                  expires_at: token.expiresAt,
                },
              },
            );
          }
        } catch (err) {
          console.error('JWT: Failed to refresh Google access token', err);
          token.error = 'RefreshAccessTokenError';
        }
      }

      // On first Google sign-in: auto-provision trusted emails
      if (account?.provider === 'google' && user?.email) {
        const email = user.email.toLowerCase();
        const isTrusted = TRUSTED_EMAILS.has(email);
        if (isTrusted) {
          const dbUser = await fetchPermissions(user.id);
          if (dbUser && !dbUser.secureLoginEnabled) {
            const {ObjectId} = await import('mongodb');
            const client = await clientPromise;
            const db = client.db('qt_portfolio');
            await db
              .collection('users')
              .updateOne({_id: new ObjectId(user.id)}, {$set: {...ALL_PERMISSIONS, lastLogin: new Date()}});
          }
        }
      }

      return token;
    },

    /**
     * Session callback — shape the session object that the client receives.
     * With JWT strategy, `token` holds everything; `user` is always undefined here.
     */
    async session({session, token}) {
      const userId = token.uid as string | undefined;
      if (!userId) return session;

      // Attach tokens for Google API calls
      if (token.provider === 'google') {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        if (token.error) session.error = token.error;
      }

      // Fetch current permissions from DB (cheap single query)
      const dbUser = await fetchPermissions(userId);

      if (dbUser) {
        const email = (dbUser.email ?? '').toLowerCase();
        const isTrusted = TRUSTED_EMAILS.has(email);

        const permissions = isTrusted
          ? ALL_PERMISSIONS
          : {
              googleApiEnabled: dbUser.googleApiEnabled || false,
              openAiApiEnabled: dbUser.openAiApiEnabled || false,
              notesEnabled: dbUser.notesEnabled || false,
              secureLoginEnabled: dbUser.secureLoginEnabled || false,
              financeEnabled: dbUser.financeEnabled || false,
              invoiceEnabled: dbUser.invoiceEnabled || false,
              formFillEnabled: dbUser.formFillEnabled || false,
            };

        session.user = {
          ...session.user,
          ...permissions,
          id: userId,
          isTrusted,
          isCredentialsUser: dbUser.isCredentialsUser || false,
        };
      }

      return session;
    },
  },

  pages: {
    signIn: '/login',
  },
};
