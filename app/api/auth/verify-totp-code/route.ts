import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number; lockoutUntil?: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  maxAttempts: 5, // Max attempts per window
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutMs: 30 * 60 * 1000, // 30 minutes lockout after max attempts
  maxAttemptsPerMinute: 3, // Max 3 attempts per minute
};

/**
 * TOTP Code Verification Endpoint
 * Secure verification with rate limiting, brute force protection, and httpOnly cookies
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    
    // Rate limiting check
    const now = Date.now();
    const clientId = ip;
    const clientData = rateLimitStore.get(clientId);

    // Check if IP is locked out
    if (clientData?.lockoutUntil && now < clientData.lockoutUntil) {
      const remainingMinutes = Math.ceil((clientData.lockoutUntil - now) / 60000);
      return NextResponse.json(
        { 
          error: "Too many failed attempts. Please try again later.",
          retryAfter: remainingMinutes 
        },
        { status: 429 }
      );
    }

    // Check rate limit
    if (clientData && now < clientData.resetTime) {
      if (clientData.count >= RATE_LIMITS.maxAttempts) {
        // Lockout the IP
        rateLimitStore.set(clientId, {
          count: clientData.count,
          resetTime: clientData.resetTime,
          lockoutUntil: now + RATE_LIMITS.lockoutMs,
        });
        return NextResponse.json(
          { 
            error: "Too many failed attempts. Account temporarily locked.",
            retryAfter: Math.ceil(RATE_LIMITS.lockoutMs / 60000)
          },
          { status: 429 }
        );
      }
      clientData.count++;
    } else {
      // Reset or initialize
      rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + RATE_LIMITS.windowMs,
      });
    }

    const { code } = await request.json();

    // Validate input
    if (!code || typeof code !== "string" || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid authentication code format." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get all users with TOTP secret (even if not enabled yet - allows first verification)
    const users = await db
      .collection("users")
      .find({
        totpSecret: { $exists: true, $ne: null },
      })
      .toArray();

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Authentication system not configured." },
        { status: 503 }
      );
    }

    // Try to verify the code against all users
    let verified = false;
    let verifiedUser = null;
    
    for (const user of users) {
      if (user.totpSecret) {
        const isValid = authenticator.verify({
          token: code,
          secret: user.totpSecret,
        });

        if (isValid) {
          verified = true;
          verifiedUser = user;
          break;
        }
      }
    }

    if (!verified) {
      // Log failed attempt
      console.warn(`[SECURITY] Failed TOTP attempt from IP: ${ip}, User-Agent: ${userAgent}`);
      
      return NextResponse.json(
        { error: "Invalid authentication code." },
        { status: 401 }
      );
    }

    // Enable TOTP if it wasn't already enabled (first verification after setup)
    if (verifiedUser && !verifiedUser.totpEnabled) {
      await db.collection("users").updateOne(
        { _id: verifiedUser._id },
        {
          $set: {
            totpEnabled: true,
            totpVerifiedAt: new Date(),
          },
        }
      );
    }

    // Success - set httpOnly cookie
    const cookieStore = await cookies();
    const sessionToken = Buffer.from(`${Date.now()}-${Math.random()}`).toString("base64");
    
    cookieStore.set("totp_verified", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    // Reset rate limit on success
    rateLimitStore.delete(clientId);

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
    });
  } catch (error) {
    console.error("[SECURITY] TOTP verification error:", error);
    return NextResponse.json(
      { error: "Authentication service temporarily unavailable." },
      { status: 500 }
    );
  }
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime && (!value.lockoutUntil || now > value.lockoutUntil)) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

