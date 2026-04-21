const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateBranding() {
  console.log("Starting ultimate SVG rendering process...");

  // Exact SVG as provided by user, scaled to 2048x2048
  // #f59e0b is Tailwind's amber-500
  const rawSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"></path>
  <path d="M4 6h.01"></path>
  <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"></path>
  <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"></path>
  <path d="M12 18h.01"></path>
  <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"></path>
  <circle cx="12" cy="12" r="2"></circle>
  <path d="m13.41 10.59 5.66-5.66"></path>
</svg>`;

  const outDir = __dirname;
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  // Generate 1. Absolute Transparent Logo
  await sharp(Buffer.from(rawSvg))
    .png()
    .toFile(path.join(outDir, 'transparent_logo.png'));
  console.log("✓ Generated transparent_logo.png");

  // Generate 1.5. WebP version for site identity (favicon replacement)
  await sharp(Buffer.from(rawSvg))
    .webp({ lossless: true })
    .toFile(path.join(outDir, 'transparent_logo.webp'));
  console.log("✓ Generated transparent_logo.webp");

  // Generate 2. LinkedIn Profile Logo (Obsidian Dark Background)
  await sharp({
    create: {
      width: 2048,
      height: 2048,
      channels: 4,
      background: { r: 34, g: 34, b: 34, alpha: 1 } // Exact app background: hsl(0 0% 13.3%)
    }
  })
    .composite([{ input: Buffer.from(rawSvg), gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'linkedin_profile.png'));
  console.log("✓ Generated linkedin_profile.png");

  // Generate 3. Banner
  // Construct text simply by making an SVG containing text elements, then composite
  const bannerWidth = 4000;
  const bannerHeight = 1200;
  
  const textSvg = `
    <svg width="${bannerWidth}" height="${bannerHeight}">
      {/* Brand Nomenclature - Group total width is ~2200px. Start X = 900 */}
      <text x="1450" y="600" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-weight="600" font-size="280" letter-spacing="-0.05em">
        <tspan fill="#f59e0b">API</tspan><tspan fill="#e5e7eb">Radar</tspan>
      </text>
      {/* Tagline - Centered horizontally below the brand */}
      <text x="2000" y="860" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-weight="400" font-size="80" letter-spacing="0.15em" text-anchor="middle" fill="#9ca3af">
        REAL-TIME EXPOSURE INTELLIGENCE
      </text>
    </svg>`;

  await sharp({
    create: {
      width: bannerWidth,
      height: bannerHeight,
      channels: 4,
      background: { r: 34, g: 34, b: 34, alpha: 1 }
    }
  })
    .composite([
      // Icon: Upscaled to 450x450 and centered horizontally with the group
      { input: await sharp(Buffer.from(rawSvg)).resize(450, 450).toBuffer(), left: 950, top: 275 },
      // composite text
      { input: Buffer.from(textSvg), left: 0, top: 0 }
    ])
    .png()
    .toFile(path.join(outDir, 'branding_banner.png'));
    
  console.log("✓ Generated branding_banner.png");

  // Generate 4. OG Sharing Card (1200x630)
  const ogWidth = 1200;
  const ogHeight = 630;
  
  const ogTextSvg = `
    <svg width="${ogWidth}" height="${ogHeight}">
      {/* Brand Nomenclature - Group total width is ~1000px. Left margin = 100 */}
      <text x="360" y="350" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-weight="600" font-size="180" letter-spacing="-0.05em">
        <tspan fill="#f59e0b">API</tspan><tspan fill="#e5e7eb">Radar</tspan>
      </text>
      {/* Tagline - Centered horizontally relative to the 1200 canvas */}
      <text x="600" y="520" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-weight="400" font-size="52" letter-spacing="0.12em" text-anchor="middle" fill="#9ca3af">
        REAL-TIME EXPOSURE INTELLIGENCE
      </text>
    </svg>`;

  await sharp({
    create: {
      width: ogWidth,
      height: ogHeight,
      channels: 4,
      background: { r: 34, g: 34, b: 34, alpha: 1 }
    }
  })
    .composite([
      // Icon: Positioned to the left of the text. Size: 220x220, Left: 100, Vertically centered at 290
      { input: await sharp(Buffer.from(rawSvg)).resize(220, 220).toBuffer(), left: 100, top: 180 },
      // composite text
      { input: Buffer.from(ogTextSvg), left: 0, top: 0 }
    ])
    .png()
    .toFile(path.join(outDir, 'og-card.png'));
    
  console.log("✓ Generated og-card.png");
}

generateBranding().catch(err => {
    console.error("Error generating branding:", err);
    process.exit(1);
});
