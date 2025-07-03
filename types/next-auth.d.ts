import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      plan?: string;
      days_remaining_in_premium?: number;
    };
  }

  interface User {
    id?: string;
    plan?: string;
    days_remaining_in_premium?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
    days_remaining_in_premium?: number;
  }
} 