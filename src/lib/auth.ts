import {MongoDBAdapter} from '@next-auth/mongodb-adapter';
import {AuthOptions} from 'next-auth'; // Use AuthOptions type
import GoogleProvider from 'next-auth/providers/google';

import clientPromise from './mongodb';

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
          scope: 'openid email profile https://www.googleapis.com/auth/drive',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({user, account}) {
      console.log('SignIn Attempt:', {email: user.email, provider: account?.provider});
      console.log('SignIn Tokens Received:', {
        hasAccess: !!account?.access_token,
        hasRefresh: !!account?.refresh_token,
        expiresAt: account?.expires_at,
      });

      if (account?.provider === 'google') {
        try {
          const client = await clientPromise;
          const db = client.db('qt_portfolio');

          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const updateData: any = {
            access_token: account.access_token,
            expires_at: account.expires_at,
            scope: account.scope,
            token_type: account.token_type,
            id_token: account.id_token,
          };

          if (account.refresh_token) {
            updateData.refresh_token = account.refresh_token;
          }

          await db.collection('accounts').updateOne(
            {
              provider: 'google',
              userId: new (await import('mongodb')).ObjectId(user.id),
            },
            {$set: updateData},
          );

          // Update user last login
          await db
            .collection('users')
            .updateOne({_id: new (await import('mongodb')).ObjectId(user.id)}, {$set: {lastLogin: new Date()}});

          console.log('SignIn: Updated account tokens', {hasRefresh: !!account.refresh_token});
        } catch (error) {
          console.error('SignIn: Failed to update tokens', error);
        }
      }
      return true;
    },
    async session({session, user}: {session: any; user: any}) {
      // Fetch the account to get the access token
      const client = await clientPromise;
      const db = client.db('qt_portfolio');
      const account = await db.collection('accounts').findOne({
        userId: new (await import('mongodb')).ObjectId(user.id),
        provider: 'google',
      });

      if (account) {
        console.log('NextAuth Session: Account found for user', user.id);
        console.log('NextAuth Session: Token expires at', (account as any).expires_at);
        console.log('NextAuth Session: Refresh Token exists?', !!(account as any).refresh_token);
        session.accessToken = (account as any).access_token;
        session.refreshToken = (account as any).refresh_token;
        session.error = Date.now() / 1000 > (account as any).expires_at ? 'RefreshAccessTokenError' : null;
      } else {
        console.log('NextAuth Session: No Google account found for user', user.id);
      }

      // Fetch User Permissions
      const dbUser = await db.collection('users').findOne({
        _id: new (await import('mongodb')).ObjectId(user.id),
      });

      if (dbUser) {
        // Default Permissions for Admin (lankanprinze@gmail.com)
        const isAdmin = dbUser.email?.toLowerCase() === 'lankanprinze@gmail.com';

        session.user = {
          ...session.user,
          googleApiEnabled: isAdmin ? true : dbUser.googleApiEnabled || false,
          openAiApiEnabled: isAdmin ? true : dbUser.openAiApiEnabled || false,
          notesEnabled: isAdmin ? true : dbUser.notesEnabled || false,
          secureLoginEnabled: isAdmin ? true : dbUser.secureLoginEnabled || false, // Vault
          financeEnabled: isAdmin ? true : dbUser.financeEnabled || false,
          invoiceEnabled: isAdmin ? true : dbUser.invoiceEnabled || false,
          id: user.id,
        };
      }

      return session;
    },
  },
};
