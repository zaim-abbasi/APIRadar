// Token store and validation for TOTP setup
const tokenStore = new Map<string, { expiresAt: number; used: boolean }>();
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

import crypto from "crypto";

export function generateToken(): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  tokenStore.set(token, { expiresAt, used: false });
  return token;
}

export function validateToken(token: string): boolean {
  const data = tokenStore.get(token);
  if (!data || Date.now() > data.expiresAt || data.used) {
    return false;
  }
  data.used = true; // Mark as used
  return true;
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const rateLimit = rateLimitStore.get(ip);
  
  if (rateLimit && now < rateLimit.resetTime) {
    if (rateLimit.count >= 3) {
      return { allowed: false, remaining: 0 };
    }
    rateLimit.count++;
    return { allowed: true, remaining: 3 - rateLimit.count };
  } else {
    rateLimitStore.set(ip, { count: 1, resetTime: now + 15 * 60 * 1000 });
    return { allowed: true, remaining: 2 };
  }
}

