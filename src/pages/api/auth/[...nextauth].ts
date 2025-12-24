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
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }: { user: User; account: Account | null }) {
      console.log('SignIn Attempt:', { email: user.email, provider: account?.provider });
      return true;
    },
    async session({ session }: { session: Session }) {
      // Send properties to the client, like an access_token from a provider.
      return session;
    },
  },
};

export default NextAuth(authOptions);
