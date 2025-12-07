import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import clientPromise from "@/lib/mongodb";
import { validateToken } from "@/lib/totp-token";

/**
 * TOTP Setup Endpoint
 * Generates a TOTP secret and QR code for a user
 * Requires valid token from POST to /api/auth/setup-token
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Validate token from query parameter
    const token = request.nextUrl.searchParams.get("token");
    if (!token || !validateToken(token)) {
      return new NextResponse("Not Found", { status: 404 });
    }
    // Start database connection and session check in parallel
    const [client, session] = await Promise.all([
      clientPromise,
      getServerSession(authOptions),
    ]);
    
    const db = client.db();
    
    // Try to get email from session for database lookup only
    // We don't use email in the TOTP account name
    const email = session?.user?.email || "totp@apiradar.local";

    // Check if user exists, create if doesn't
    let user = await db.collection("users").findOne({ email });

    if (!user) {
      // Create user if doesn't exist
      const now = new Date();
      const result = await db.collection("users").insertOne({
        email,
        name: email.split("@")[0],
        createdAt: now,
        updatedAt: now,
      });
      user = { _id: result.insertedId, email, name: email.split("@")[0] };
    }

    // Generate a new TOTP secret if user doesn't have one, or if they want to reset
    const reset = request.nextUrl.searchParams.get("reset") === "true";
    let totpSecret = user.totpSecret;

    if (!totpSecret || reset) {
      // Generate a new secret
      totpSecret = authenticator.generateSecret();
      
      // Save the secret to the user document
      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            totpSecret,
            totpEnabled: false, // Will be enabled after first successful verification
            totpSetupAt: new Date(),
          },
        }
      );
    }

    // Create the OTP Auth URL - no email, just service name
    const serviceName = "API Radar";
    const accountName = "API Radar"; // Use service name instead of email
    const otpAuthUrl = authenticator.keyuri(accountName, serviceName, totpSecret);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 300,
      margin: 1,
    });

    // Return HTML page with QR code - matching API Radar design
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en" class="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TOTP Setup - API Radar</title>
  <link rel="icon" href="/logo/logo-webp.webp" type="image/webp" sizes="446x446" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    :root {
      --background: 0 0% 100%;
      --foreground: 0 0% 3.9%;
      --card: 0 0% 100%;
      --card-foreground: 0 0% 3.9%;
      --primary: 0 0% 9%;
      --primary-foreground: 0 0% 98%;
      --secondary: 0 0% 96.1%;
      --secondary-foreground: 0 0% 9%;
      --muted: 0 0% 96.1%;
      --muted-foreground: 0 0% 45.1%;
      --border: 0 0% 89.8%;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)) 0%, rgba(255, 255, 255, 0.9) 50%, hsl(var(--muted) / 0.6) 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: hsl(var(--foreground));
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .container {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: 0.5rem;
      padding: 2rem;
      max-width: 900px;
      width: 100%;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }
    .header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .logo-text {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin-bottom: 0.75rem;
    }
    .logo-text .api {
      color: #dc2626;
    }
    .logo-text .radar {
      color: hsl(var(--foreground));
    }
    h1 {
      color: hsl(var(--foreground));
      margin-bottom: 0.25rem;
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.025em;
    }
    .subtitle {
      color: hsl(var(--muted-foreground));
      font-size: 0.875rem;
    }
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      align-items: start;
    }
    .left-column {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .qr-container {
      background: hsl(var(--muted));
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid hsl(var(--border));
      display: inline-block;
    }
    .qr-code {
      border-radius: 0.5rem;
      display: block;
      width: 220px;
      height: 220px;
    }
    .right-column {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .secret-key {
      background: hsl(var(--secondary));
      padding: 0.875rem;
      border-radius: 0.5rem;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      word-break: break-all;
      color: hsl(var(--foreground));
      border: 1px solid hsl(var(--border));
    }
    .secret-key strong {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      font-weight: 600;
    }
    .instructions {
      background: hsl(var(--muted));
      border: 1px solid hsl(var(--border));
      padding: 1rem;
      border-radius: 0.5rem;
    }
    .instructions h3 {
      color: hsl(var(--foreground));
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .instructions ol {
      margin-left: 1.25rem;
      color: hsl(var(--muted-foreground));
      line-height: 1.6;
      font-size: 0.8125rem;
    }
    .instructions li {
      margin-bottom: 0.25rem;
    }
    .warning {
      background: hsl(var(--muted));
      border: 1px solid hsl(var(--border));
      padding: 0.875rem;
      border-radius: 0.5rem;
      color: hsl(var(--muted-foreground));
      font-size: 0.8125rem;
    }
    .warning strong {
      color: hsl(var(--foreground));
      font-weight: 600;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      margin-top: 0.5rem;
      color: hsl(var(--foreground));
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      transition: color 0.15s ease-in-out;
      gap: 0.25rem;
    }
    .back-link:hover {
      color: #dc2626;
    }
    @media (max-width: 768px) {
      .content-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      .left-column {
        order: 1;
      }
      .right-column {
        order: 2;
      }
      .qr-code {
        width: 200px;
        height: 200px;
      }
    }
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .container {
      animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">
        <span class="api">API</span>
        <span class="radar"> Radar</span>
      </div>
      <h1>TOTP Setup</h1>
      <p class="subtitle">Scan this QR code with Google Authenticator</p>
    </div>
    
    <div class="content-grid">
      <div class="left-column">
        <div class="qr-container">
          <img src="${qrCodeDataUrl}" alt="TOTP QR Code" class="qr-code" />
        </div>
      </div>
      
      <div class="right-column">
        <div class="instructions">
          <h3>Setup Instructions:</h3>
          <ol>
            <li>Open Google Authenticator (or any TOTP app)</li>
            <li>Tap the "+" button to add a new account</li>
            <li>Scan the QR code, or enter the key manually</li>
            <li>Enter the 6-digit code to verify</li>
          </ol>
        </div>

        <div class="secret-key">
          <strong>Manual Entry Key:</strong>
          ${totpSecret.match(/.{1,4}/g)?.join(" ") || totpSecret}
        </div>

        <div class="warning">
          <strong>Important:</strong> Keep this secret key safe. After scanning, you'll be able to access the platform using the code from your authenticator app.
        </div>

        <a href="/" class="back-link">
          ← Back to Home
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "Failed to generate TOTP setup" },
      { status: 500 }
    );
  }
}

