const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateBranding() {
  console.log("Starting ultimate SVG rendering process...");

  // Geometrically balanced & mathematically aligned vector SVG logo
  // #f59e0b is Tailwind's amber-500
  const rawSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="2048" height="2048">
  <g fill="#f59e0b">
    <!-- Left Semi-circle with center circular notch cutout -->
    <path d="M 50 10 A 40 40 0 0 0 50 90 L 50 56 A 6 6 0 0 1 50 44 Z" />
    
    <!-- Right Horizontal Rectangle Bar -->
    <rect x="63" y="47" width="27" height="14" rx="0" />
    
    <!-- 3 Top-Right Concentric Arcs -->
    <path d="M 55.263 32.787 A 18 18 0 0 1 67.213 44.737" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-linecap="butt" />
    <path d="M 58.479 22.267 A 29 29 0 0 1 77.733 41.521" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-linecap="butt" />
    <path d="M 61.695 11.748 A 40 40 0 0 1 88.252 38.305" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-linecap="butt" />
  </g>
</svg>`;

  const logoIconBannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="220" height="220">
  <g fill="#f59e0b">
    <path d="M 50 10 A 40 40 0 0 0 50 90 L 50 56 A 6 6 0 0 1 50 44 Z" />
    <rect x="63" y="47" width="27" height="14" rx="0" />
    <path d="M 55.263 32.787 A 18 18 0 0 1 67.213 44.737" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-linecap="butt" />
    <path d="M 58.479 22.267 A 29 29 0 0 1 77.733 41.521" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-linecap="butt" />
    <path d="M 61.695 11.748 A 40 40 0 0 1 88.252 38.305" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-linecap="butt" />
  </g>
</svg>`;

  const logoIconOgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="130" height="130">
  <g fill="#f59e0b">
    <path d="M 50 10 A 40 40 0 0 0 50 90 L 50 56 A 6 6 0 0 1 50 44 Z" />
    <rect x="63" y="47" width="27" height="14" rx="0" />
    <path d="M 55.263 32.787 A 18 18 0 0 1 67.213 44.737" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-linecap="butt" />
    <path d="M 58.479 22.267 A 29 29 0 0 1 77.733 41.521" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-linecap="butt" />
    <path d="M 61.695 11.748 A 40 40 0 0 1 88.252 38.305" fill="none" stroke="#f59e0b" stroke-width="4.4" stroke-linecap="butt" />
  </g>
</svg>`;

  const outDir = __dirname;
  const iconsDir = path.join(outDir, 'icons');
  const socialDir = path.join(outDir, 'social');
  const publicLogoDir = path.join(__dirname, '..', 'public', 'logo');
  const publicDir = path.join(__dirname, '..', 'public');

  // Create organized subdirectories
  [outDir, iconsDir, socialDir, publicLogoDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // CATEGORY 1: ICONS & BRAND LOGOS
  // 1. Transparent PNG Logo
  await sharp(Buffer.from(rawSvg))
    .png()
    .toFile(path.join(iconsDir, 'transparent_logo.png'));
  console.log("✓ Generated icons/transparent_logo.png");

  // 2. Transparent WebP Logo
  const webpPath = path.join(iconsDir, 'transparent_logo.webp');
  await sharp(Buffer.from(rawSvg))
    .webp({ lossless: true })
    .toFile(webpPath);
  console.log("✓ Generated icons/transparent_logo.webp");

  // Copy webp to public site asset folder
  fs.copyFileSync(webpPath, path.join(publicLogoDir, 'transparent_logo.webp'));
  console.log("✓ Copied transparent_logo.webp to public/logo/");

  // CATEGORY 2: SOCIAL MEDIA & BRANDING ASSETS
  // 1. LinkedIn Profile Picture (Flat Obsidian Dark Background, Icon reduced by ~15% to 1740x1740)
  const profilePath = path.join(socialDir, 'linkedin_profile.png');
  const profileIconBuffer = await sharp(Buffer.from(rawSvg))
    .resize(1740, 1740)
    .toBuffer();

  await sharp({
    create: {
      width: 2048,
      height: 2048,
      channels: 4,
      background: { r: 34, g: 34, b: 34, alpha: 1 } // #222222
    }
  })
    .composite([{ input: profileIconBuffer, gravity: 'center' }])
    .png()
    .toFile(profilePath);
  console.log("✓ Generated social/linkedin_profile.png (icon scaled to 85%)");

  // 2. LinkedIn Banner (Flat, solid #222222, 4000x1000)
  const bannerWidth = 4000;
  const bannerHeight = 1000;
  
  const bannerSvg = `
<svg width="${bannerWidth}" height="${bannerHeight}" viewBox="0 0 ${bannerWidth} ${bannerHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="cleanTechPattern" width="280" height="280" patternUnits="userSpaceOnUse">
      <polygon points="140,20 250,80 250,200 140,260 30,200 30,80" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.04" />
      <polygon points="140,60 210,100 210,180 140,220 70,180 70,100" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.03" />
      <polygon points="140,35 215,165 65,165" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.025" />
      
      <circle cx="140" cy="20" r="4" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="250" cy="80" r="4" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="250" cy="200" r="4" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="140" cy="260" r="4" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="30" cy="200" r="4" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="30" cy="80" r="4" fill="#ffffff" fill-opacity="0.05" />
      
      <circle cx="140" cy="140" r="16" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.035" />
      <rect x="134" y="134" width="12" height="12" fill="#ffffff" fill-opacity="0.03" />
    </pattern>
  </defs>

  <rect width="${bannerWidth}" height="${bannerHeight}" fill="#222222" />
  <rect width="${bannerWidth}" height="${bannerHeight}" fill="url(#cleanTechPattern)" />

  <g transform="translate(300, 390)">
    <g transform="translate(0, 0)">
      ${logoIconBannerSvg}
    </g>
    <text x="255" y="165" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="195" letter-spacing="-0.04em">
      <tspan fill="#f59e0b">API</tspan><tspan fill="#ffffff">Radar</tspan>
    </text>
  </g>

  <g text-anchor="end">
    <text x="3700" y="450" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="96" letter-spacing="-0.01em" fill="#ffffff">
      Real-Time Threat Intelligence &amp;
    </text>
    <text x="3700" y="575" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="96" letter-spacing="-0.01em" fill="#ffffff">
      Credential Scanning.
    </text>
  </g>
</svg>`;

  const bannerPath = path.join(socialDir, 'linkedin_banner.png');
  await sharp(Buffer.from(bannerSvg))
    .png()
    .toFile(bannerPath);
  console.log("✓ Generated social/linkedin_banner.png");

  // 3. OpenGraph Sharing Card (1200x630, Perfectly Centered & Padded for Twitter/X)
  const ogWidth = 1200;
  const ogHeight = 630;
  
  const ogSvg = `
<svg width="${ogWidth}" height="${ogHeight}" viewBox="0 0 ${ogWidth} ${ogHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="cleanTechPatternOg" width="200" height="200" patternUnits="userSpaceOnUse">
      <polygon points="100,15 180,60 180,150 100,195 20,150 20,60" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.04" />
      <polygon points="100,45 150,75 150,135 100,165 50,135 50,75" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.03" />
      
      <circle cx="100" cy="15" r="3" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="180" cy="60" r="3" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="180" cy="150" r="3" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="100" cy="195" r="3" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="20" cy="150" r="3" fill="#ffffff" fill-opacity="0.05" />
      <circle cx="20" cy="60" r="3" fill="#ffffff" fill-opacity="0.05" />
      
      <circle cx="100" cy="105" r="12" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.03" />
    </pattern>
  </defs>

  <rect width="${ogWidth}" height="${ogHeight}" fill="#222222" />
  <rect width="${ogWidth}" height="${ogHeight}" fill="url(#cleanTechPatternOg)" />

  <g transform="translate(280, 190)">
    <g transform="translate(0, 0)">
      ${logoIconOgSvg}
    </g>
    <text x="155" y="102" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="120" letter-spacing="-0.04em">
      <tspan fill="#f59e0b">API</tspan><tspan fill="#ffffff">Radar</tspan>
    </text>
  </g>

  <g text-anchor="middle">
    <text x="600" y="420" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="40" letter-spacing="-0.01em" fill="#ffffff">
      Real-Time Threat Intelligence &amp;
    </text>
    <text x="600" y="475" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="40" letter-spacing="-0.01em" fill="#ffffff">
      Credential Scanning.
    </text>
  </g>
</svg>`;

  const ogPath = path.join(socialDir, 'og_card.png');
  await sharp(Buffer.from(ogSvg))
    .png()
    .toFile(ogPath);
    
  console.log("✓ Generated social/og_card.png");

  // Copy og_card.png to public/og-image.png
  fs.copyFileSync(ogPath, path.join(publicDir, 'og-image.png'));
  console.log("✓ Copied og_card.png to public/og-image.png");
}

generateBranding().catch(err => {
    console.error("Error generating branding:", err);
    process.exit(1);
});
