import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import NextAuth, { Account, Session, User } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import clientPromise from '../../../lib/mongodb';

export const authOptions = {
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
    async signIn({ user, account }: { user: User; account: Account | null }) {
      console.log('SignIn Attempt:', { email: user.email, provider: account?.provider });
      return true;
    },
    async session({ session, user }: { session: Session; user: User }) {
      // Fetch the account to get the access token
      const client = await clientPromise;
      const db = client.db('qt_portfolio');
      const account = await db.collection('accounts').findOne({
        userId: new (await import('mongodb')).ObjectId(user.id),
        provider: 'google',
      });

      if (account) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        (session as any).accessToken = (account as any).access_token;
      }

      return session;
    },
  },
};

export default NextAuth(authOptions);
