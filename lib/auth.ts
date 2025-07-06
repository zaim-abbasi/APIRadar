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
            githubId: (profile as any)?.id || user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            plan: 'basic',
            pro_days_remaining: 0,
            createdAt: new Date(),
            requestedTrial: false,
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
        session.user.pro_days_remaining = token.pro_days_remaining as number;
        session.user.requestedTrial = token.requestedTrial as boolean;
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
            pro_days_remaining: 0,
            createdAt: new Date(),
            requestedTrial: false,
            };

            const result = await db.collection("users").insertOne(userData);
            userDoc = { ...userData, _id: result.insertedId };
          }
          
          if (userDoc) {
            // Check if user is pro based on days remaining and reduce days daily
            let plan = userDoc.plan || 'basic';
            let daysRemaining = userDoc.pro_days_remaining || 0;
            let lastUpdated = userDoc.lastProDayUpdate || null;
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today

            // Check if we need to reduce days (once per day)
            if (daysRemaining > 0 && lastUpdated) {
              const lastUpdateDate = new Date(lastUpdated);
              lastUpdateDate.setHours(0, 0, 0, 0);
              
              // If last update was before today, reduce days
              if (lastUpdateDate < today) {
                const daysDiff = Math.floor((today.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
                daysRemaining = Math.max(0, daysRemaining - daysDiff);
              }
            }

            // If user has days remaining in premium, they are pro
            if (daysRemaining > 0) {
              plan = 'pro';
            } else {
              plan = 'basic';
            }

            // Update the user's plan and days in the database
            await db.collection("users").updateOne(
              { _id: userDoc._id },
              { 
                $set: { 
                  plan: plan,
                  pro_days_remaining: daysRemaining,
                  lastProDayUpdate: today,
                  updatedAt: new Date()
                }
              }
            );

            token.id = userDoc._id.toString();
            token.plan = plan;
            token.pro_days_remaining = daysRemaining;
            token.requestedTrial = userDoc.requestedTrial || false;
          }
        } catch (error) {
          console.error("Error fetching user data for JWT:", error);
          // Set default values if database fails
          token.plan = 'basic';
          token.pro_days_remaining = 0;
        }
      } else if (token.id) {
        // For existing sessions, refresh the plan data
        try {
          const client = await clientPromise;
          const db = client.db();
          
          const userDoc = await db.collection("users").findOne({
            _id: token.id as any
          });
          
          if (userDoc) {
            // Check if user is pro based on days remaining and reduce days daily
            let plan = userDoc.plan || 'basic';
            let daysRemaining = userDoc.pro_days_remaining || 0;
            let lastUpdated = userDoc.lastProDayUpdate || null;
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today

            // Check if we need to reduce days (once per day)
            if (daysRemaining > 0 && lastUpdated) {
              const lastUpdateDate = new Date(lastUpdated);
              lastUpdateDate.setHours(0, 0, 0, 0);
              
              // If last update was before today, reduce days
              if (lastUpdateDate < today) {
                const daysDiff = Math.floor((today.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
                daysRemaining = Math.max(0, daysRemaining - daysDiff);
              }
            }

            // If user has days remaining in premium, they are pro
            if (daysRemaining > 0) {
              plan = 'pro';
            } else {
              plan = 'basic';
            }

            // Update the user's plan and days in the database
            await db.collection("users").updateOne(
              { _id: userDoc._id },
              { 
                $set: { 
                  plan: plan,
                  pro_days_remaining: daysRemaining,
                  lastProDayUpdate: today,
                  updatedAt: new Date()
                }
              }
            );

            token.plan = plan;
            token.pro_days_remaining = daysRemaining;
            token.requestedTrial = userDoc.requestedTrial || false;
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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}; 