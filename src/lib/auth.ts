import {MongoDBAdapter} from '@next-auth/mongodb-adapter';
import {AuthOptions} from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';

import clientPromise from './mongodb';

/** Emails that always receive full access — no manual admin approval needed.
 *  Add Google verification accounts here, or set the TRUSTED_EMAILS env var
 *  as a comma-separated list (e.g. TRUSTED_EMAILS=foo@gmail.com,bar@gmail.com).
 */
const ADMIN_EMAIL = 'lankanprinze@gmail.com';

const TRUSTED_EMAILS: Set<string> = new Set([
  ADMIN_EMAIL,
  // Google OAuth verification team test accounts
  'davincii.040823@gmail.com',
  // Add more trusted emails here, or use the env var below
  ...(process.env.TRUSTED_EMAILS ? process.env.TRUSTED_EMAILS.split(',').map(e => e.trim().toLowerCase()) : []),
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

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: 'qt_portfolio',
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar',
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

        // Look up by email OR by the username field, and explicitly include the password hash
        const user = await db
          .collection('users')
          .findOne(
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

        // Check expiry
        if (user.expiresAt && new Date() > new Date(user.expiresAt)) {
          console.log('CredentialsProvider: Account expired for', credentials.email);
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        // Update last login
        await db.collection('users').updateOne({_id: user._id}, {$set: {lastLogin: new Date()}});

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({user, account}) {
      const email = user.email?.toLowerCase() ?? '';
      console.log('SignIn Attempt:', {email, provider: account?.provider});

      if (account?.provider === 'google' && email) {
        try {
          const client = await clientPromise;
          const db = client.db('qt_portfolio');

          const dbUser = await db.collection('users').findOne({email: user.email});

          if (dbUser) {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const tokenUpdate: any = {
              access_token: account.access_token,
              expires_at: account.expires_at,
              scope: account.scope,
              token_type: account.token_type,
              id_token: account.id_token,
            };
            if (account.refresh_token) {
              tokenUpdate.refresh_token = account.refresh_token;
            }

            await db.collection('accounts').updateOne(
              {provider: 'google', userId: dbUser._id},
              {$set: tokenUpdate},
              {upsert: true},
            );

            // Auto-provision trusted emails with full permissions if they
            // don't have them yet (e.g. first sign-in of a Google verifier).
            const isTrusted = TRUSTED_EMAILS.has(email);
            const hasNoPermissions = !dbUser.secureLoginEnabled && !dbUser.notesEnabled;

            if (isTrusted && hasNoPermissions) {
              await db.collection('users').updateOne(
                {_id: dbUser._id},
                {$set: {...ALL_PERMISSIONS, lastLogin: new Date()}},
              );
              console.log('SignIn: Auto-provisioned full permissions for trusted email', email);
            } else {
              await db.collection('users').updateOne({_id: dbUser._id}, {$set: {lastLogin: new Date()}});
            }
          } else {
            console.log('SignIn: User not found in DB yet (first login), skipping token update.');
          }
        } catch (error) {
          console.error('SignIn: Failed to update tokens/permissions', error);
        }
      }
      return true;
    },

    async session({session, user}: {session: any; user: any}) {
      const client = await clientPromise;
      const db = client.db('qt_portfolio');

      const userId = user?.id;
      if (!userId) return session;

      // Google users: refresh access token if expired
      const account = await db.collection('accounts').findOne({
        userId: new (await import('mongodb')).ObjectId(userId),
        provider: 'google',
      });

      if (account) {
        const now = Date.now() / 1000;
        let accessToken = account.access_token;

        if (account.expires_at && now > account.expires_at) {
          console.log('NextAuth Session: Access Token Expired, attempting to refresh...');
          try {
            const url =
              'https://oauth2.googleapis.com/token?' +
              new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID as string,
                client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
                grant_type: 'refresh_token',
                refresh_token: account.refresh_token,
              });

            const response = await fetch(url, {
              headers: {'Content-Type': 'application/x-www-form-urlencoded'},
              method: 'POST',
            });

            const refreshedTokens = await response.json();

            if (!response.ok) throw refreshedTokens;

            const newExpiresAt = Math.floor(Date.now() / 1000 + refreshedTokens.expires_in);

            await db.collection('accounts').updateOne(
              {_id: account._id},
              {
                $set: {
                  access_token: refreshedTokens.access_token,
                  expires_at: newExpiresAt,
                  refresh_token: refreshedTokens.refresh_token ?? account.refresh_token,
                },
              },
            );

            accessToken = refreshedTokens.access_token;
            account.refresh_token = refreshedTokens.refresh_token ?? account.refresh_token;
            session.error = null;
          } catch (error) {
            console.error('NextAuth Session: Error refreshing access token', error);
            session.error = 'RefreshAccessTokenError';
          }
        }

        session.accessToken = accessToken;
        session.refreshToken = account.refresh_token;
      }

      // Fetch user permissions
      const dbUser = await db.collection('users').findOne({
        _id: new (await import('mongodb')).ObjectId(userId),
      });

      if (dbUser) {
        const email = dbUser.email?.toLowerCase() ?? '';
        const isTrusted = TRUSTED_EMAILS.has(email);

        // Trusted emails always get full access, regardless of DB flags.
        // This is the safety net in case the signIn auto-provision hasn't
        // run yet (e.g. the user doc was created by the adapter but the
        // signIn callback fired before finding it).
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
};
