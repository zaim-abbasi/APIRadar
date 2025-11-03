import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import clientPromise from "./mongodb";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const client = await clientPromise;
          const db = client.db();
          const now = new Date();

          // Simple upsert - just create/update user with basic fields
          await db.collection("users").updateOne(
            { email: user.email! },
            { 
              $setOnInsert: {
                createdAt: now,
                email: user.email!,
              },
              $set: {
                name: user.name || '',
                updatedAt: now
              }
            },
            { upsert: true }
          );
        } catch (error) {
          console.error("Error creating/updating user:", error);
          // Don't block sign-in on database errors
          return true;
        }
      }
      return true;
    },

    async session({ session, token }) {
      if (session.user) {
        // Just pass the user ID
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        try {
          const client = await clientPromise;
          const db = client.db();
          
          let userDoc = await db.collection("users").findOne({
            email: user.email
          });

          // If not found, create the user
          if (!userDoc) {
            const now = new Date();
            const userData = {
              email: user.email,
              name: user.name || '',
              createdAt: now,
              updatedAt: now
            };

            const result = await db.collection("users").insertOne(userData);
            userDoc = { ...userData, _id: result.insertedId };
          }
          
          if (userDoc) {
            token.id = userDoc._id.toString();
          }
        } catch (error) {
          console.error("Error fetching user data for JWT:", error);
        }
      } else if (token.id) {
        // For existing sessions, just verify user still exists
        try {
          const client = await clientPromise;
          const db = client.db();
          
          const userDoc = await db.collection("users").findOne({
            _id: token.id as any
          });
          
          if (!userDoc) {
            // User deleted? Clear token
            token.id = undefined;
          }
        } catch (error) {
          console.error("Error refreshing user data for JWT:", error);
        }
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