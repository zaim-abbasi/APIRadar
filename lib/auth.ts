import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jwt from "jsonwebtoken";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },

    async session({ session, token }) {
      if (session.user) {
        // Just pass the user ID
        session.user.id = token.id as string;
        session.backendToken = jwt.sign(
          {
            id: token.id,
            email: token.email,
          },
          process.env.NEXTAUTH_SECRET as string,
          { expiresIn: "30d" }
        );
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        token.id = user.email;
        token.email = user.email;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 