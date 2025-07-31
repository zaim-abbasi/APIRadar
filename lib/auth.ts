import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import clientPromise from "./mongodb";

// Helper function to build user documents with consistent field order
function buildUserDoc(email: string, name: string, additionalFields: Record<string, any> = {}) {
  const now = new Date();
  return {
    createdAt: now,
    email,
    name,
    plan: 'basic',
    pro_days_remaining: 0,
    requestedTrial: false,
    updatedAt: now,
    lastProDayUpdate: null,
    ...additionalFields // Any additional fields will be appended at the end
  };
}

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
          
          const userData = buildUserDoc(
            user.email!,
            user.name!
          );

          // Optimized upsert with better error handling
          await db.collection("users").updateOne(
            { email: userData.email },
            { 
              $setOnInsert: {
                createdAt: userData.createdAt,
                plan: userData.plan,
                pro_days_remaining: userData.pro_days_remaining,
                requestedTrial: userData.requestedTrial,
                lastProDayUpdate: userData.lastProDayUpdate
              },
              $set: {
                name: userData.name,
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
        
        // Pass downgrade flag to frontend
        if (token.planDowngraded) {
          session.user.planDowngraded = true;
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Optimized JWT callback with caching
      if (account?.provider === "google") {
        try {
          const client = await clientPromise;
          const db = client.db();
          
          let userDoc = await db.collection("users").findOne({
            email: user?.email
          });

          // If not found, create the user using the helper function
          if (!userDoc && user) {
            const userData = buildUserDoc(
              user.email!,
              user.name!
            );

            const result = await db.collection("users").insertOne(userData);
            userDoc = { ...userData, _id: result.insertedId };
          }
          
          if (userDoc) {
            // Enhanced pro days decrementing logic
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
                console.log(`User ${userDoc.email}: Reduced ${daysDiff} days, now ${daysRemaining} days remaining`);
              }
            }

            // Determine plan based on days remaining
            const wasPro = plan === 'pro';
            if (daysRemaining > 0) {
              plan = 'pro';
            } else {
              plan = 'basic';
            }

            // Check if user was downgraded from pro to basic
            const wasDowngraded = wasPro && plan === 'basic';

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

            // If user was downgraded, add a flag to trigger frontend refresh
            if (wasDowngraded) {
              token.planDowngraded = true;
            }

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
            // Enhanced pro days decrementing logic for existing sessions
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
                console.log(`User ${userDoc.email}: Reduced ${daysDiff} days, now ${daysRemaining} days remaining`);
              }
            }

            // Determine plan based on days remaining
            const wasPro = plan === 'pro';
            if (daysRemaining > 0) {
              plan = 'pro';
            } else {
              plan = 'basic';
            }

            // Check if user was downgraded from pro to basic
            const wasDowngraded = wasPro && plan === 'basic';

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

            // If user was downgraded, add a flag to trigger frontend refresh
            if (wasDowngraded) {
              token.planDowngraded = true;
            }

            token.plan = plan;
            token.pro_days_remaining = daysRemaining;
            token.requestedTrial = userDoc.requestedTrial || false;
          }
        } catch (error) {
          console.error("Error refreshing user data for JWT:", error);
          // Keep existing token values if database fails
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