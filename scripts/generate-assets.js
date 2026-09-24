import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateAssets() {
  const publicDir = path.resolve('public');
  const svgPath = path.join(publicDir, 'logo.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Generate 32x32 favicon
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  // 2. Generate standard 64x64 / ico-compatible png
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // Also write as favicon.ico (most browsers and servers support PNG-in-ICO or standard 64px)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  // 3. Generate Apple Touch Icon (180x180) with a clean white background border
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 4. Generate PWA 192x192 & 512x512
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  // 5. Generate 1200x630 OpenGraph / Social Share Preview Image
  // Create an SVG card for social previews
  const ogSvg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#030712" />
          <stop offset="40%" stop-color="#061a12" />
          <stop offset="100%" stop-color="#022818" />
        </linearGradient>
        <radialGradient id="glow" cx="25%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#016836" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#016836" stop-opacity="0" />
        </radialGradient>
      </defs>
      
      <rect width="1200" height="630" fill="url(#bg)" />
      <rect width="1200" height="630" fill="url(#glow)" />
      <rect x="20" y="20" width="1160" height="590" rx="24" fill="none" stroke="#016836" stroke-width="3" stroke-opacity="0.4" />
      
      <!-- Text content -->
      <g transform="translate(480, 190)">
        <rect x="0" y="0" width="220" height="34" rx="17" fill="#016836" fill-opacity="0.3" stroke="#059669" stroke-width="1.5" />
        <text x="110" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#34d399" text-anchor="middle" letter-spacing="1.5">SISTEMA OFICIAL</text>
        
        <text x="0" y="85" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-1">Controle de Marés</text>
        <text x="0" y="140" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="700" fill="#10b981">Areia Branca &amp; Macau - RN</text>
        
        <text x="0" y="210" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500" fill="#94a3b8">
          Monitoramento em Tempo Real • Tábuas DHN 2026 • Line-Up de Navios
        </text>
        <text x="0" y="245" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#38bdf8">
          INTERSAL • Sala de Operação
        </text>
      </g>
    </svg>
  `;

  const ogCardBase = await sharp(Buffer.from(ogSvg)).png().toBuffer();
  const logoResized = await sharp(svgBuffer).resize(340, 340).png().toBuffer();

  await sharp(ogCardBase)
    .composite([
      {
        input: logoResized,
        top: 145,
        left: 90,
      }
    ])
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log('All image assets generated successfully in public/');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
