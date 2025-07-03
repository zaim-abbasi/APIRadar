import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import clientPromise from "./mongodb";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github") {
        try {
          const client = await clientPromise;
          const db = client.db();
          
          const userData = {
            githubId: profile?.id || user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            plan: 'basic',
            days_remaining_in_premium: 0,
            createdAt: new Date()
          };

          // Optimized upsert with better error handling
          await db.collection("users").updateOne(
            { githubId: userData.githubId },
            { 
              $setOnInsert: userData,
              $set: {
                email: userData.email,
                name: userData.name,
                image: userData.image,
                updatedAt: new Date()
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
        // Use JWT token data for better performance
        session.user.id = token.id as string;
        session.user.plan = token.plan as string;
        session.user.days_remaining_in_premium = token.days_remaining_in_premium as number;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Optimized JWT callback with caching
      if (account?.provider === "github") {
        try {
          const client = await clientPromise;
          const db = client.db();
          
          // Try to find user by githubId first, then by email as fallback
          let userDoc = await db.collection("users").findOne({
            githubId: account.providerAccountId
          });

          if (!userDoc && user?.email) {
            userDoc = await db.collection("users").findOne({
              email: user.email
            });
          }

          // If still not found, create the user as fallback
          if (!userDoc && user) {
            const userData = {
              githubId: account.providerAccountId,
              email: user.email,
              name: user.name,
              image: user.image,
              plan: 'basic',
              days_remaining_in_premium: 0,
              createdAt: new Date()
            };

            const result = await db.collection("users").insertOne(userData);
            userDoc = { ...userData, _id: result.insertedId };
          }
          
          if (userDoc) {
            token.id = userDoc._id.toString();
            token.plan = userDoc.plan;
            token.days_remaining_in_premium = userDoc.days_remaining_in_premium;
          }
        } catch (error) {
          console.error("Error fetching user data for JWT:", error);
          // Set default values if database fails
          token.plan = 'basic';
          token.days_remaining_in_premium = 0;
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}; 