// Generates public/icon-192.png and public/icon-512.png
// Run once: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const TERRA = { r: 194, g: 98, b: 42 };

async function makeIcon(size) {
  const fontSize = Math.round(size * 0.55);
  const cx = size / 2;
  const cy = size / 2 + Math.round(fontSize * 0.1); // slight optical centering

  // SVG with Cormorant Garamond italic K — falls back gracefully if font not embedded
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#C2622A"/>
  <text
    x="${cx}" y="${cy}"
    text-anchor="middle" dominant-baseline="central"
    font-family="Georgia, 'Times New Roman', serif"
    font-style="italic"
    font-weight="400"
    font-size="${fontSize}"
    fill="rgba(255,255,255,0.95)"
    letter-spacing="-2"
  >K</text>
</svg>`.trim();

  const buf = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  return buf;
}

const [buf192, buf512] = await Promise.all([makeIcon(192), makeIcon(512)]);
writeFileSync('public/icon-192.png', buf192);
writeFileSync('public/icon-512.png', buf512);
console.log('✓ public/icon-192.png');
console.log('✓ public/icon-512.png');
