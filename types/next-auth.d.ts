import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      plan?: string;
      pro_days_remaining?: number;
      requestedTrial?: boolean;
      planDowngraded?: boolean;
    };
  }

  interface User {
    id?: string;
    plan?: string;
    pro_days_remaining?: number;
    requestedTrial?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
    pro_days_remaining?: number;
    requestedTrial?: boolean;
    planDowngraded?: boolean;
  }
} 