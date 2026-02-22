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

      if (account?.provider === 'google' && user.email) {
        try {
          const client = await clientPromise;
          const db = client.db('qt_portfolio');

          // Find the user in the database by email to get the correct ObjectId
          const dbUser = await db.collection('users').findOne({email: user.email});

          if (dbUser) {
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

            // Upsert the account linked to this user
            // We use upsert because sometimes the account document might be missing even if user exists
            await db.collection('accounts').updateOne(
              {
                provider: 'google',
                userId: dbUser._id,
              },
              {$set: updateData},
              {upsert: true},
            );

            // Update user last login
            await db.collection('users').updateOne({_id: dbUser._id}, {$set: {lastLogin: new Date()}});

            console.log('SignIn: Updated account tokens for', user.email);
          } else {
            console.log('SignIn: User not found in DB yet (first login?), skipping token update.');
          }
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
        const now = Date.now() / 1000;
        let accessToken = account.access_token;

        // Has the access token expired?
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

            if (!response.ok) {
              throw refreshedTokens;
            }

            console.log('NextAuth Session: Refresh successful, updating DB');
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
