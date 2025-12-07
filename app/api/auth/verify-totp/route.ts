import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { authenticator } from "otplib";
import clientPromise from "@/lib/mongodb";

/**
 * TOTP Verification Endpoint
 * Verifies the TOTP code and enables TOTP for the user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in first." },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    if (!code || typeof code !== "string" || code.length !== 6) {
      return NextResponse.json(
        { error: "Invalid code. Please enter a 6-digit code." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const email = session.user.email;

    // Get user and their TOTP secret
    const user = await db.collection("users").findOne({ email });

    if (!user || !user.totpSecret) {
      return NextResponse.json(
        { error: "TOTP not set up. Please set up TOTP first." },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = authenticator.verify({
      token: code,
      secret: user.totpSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 401 }
      );
    }

    // Enable TOTP if it wasn't already enabled
    if (!user.totpEnabled) {
      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            totpEnabled: true,
            totpVerifiedAt: new Date(),
          },
        }
      );
    }

    // Create a session token or update the existing session
    // For now, we'll return success and the user can use this for protected routes
    return NextResponse.json({
      success: true,
      message: "TOTP verified successfully!",
      totpEnabled: true,
    });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify TOTP code" },
      { status: 500 }
    );
  }
}

