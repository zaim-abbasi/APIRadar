import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jwt from "jsonwebtoken";

import clientPromise from "./mongodb";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Background DB update
      clientPromise.then(async (client) => {
        try {
          const db = client.db();
          const now = new Date();
          await db.collection("users").updateOne(
            { email: user.email },
            {
              $set: { name: user.name, updatedAt: now },
              $setOnInsert: { email: user.email, createdAt: now },
            },
            { upsert: true }
          );
        } catch (e) {
          console.error("User upsert failed in background:", e);
        }
      }).catch(e => {
        // Log but don't crash the sign-in flow
        console.error("MongoDB Connection Error during signin:", e.message);
      });
      
      return true;
    },
    // ... rest of callbacks

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