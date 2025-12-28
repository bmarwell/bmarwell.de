#!/usr/bin/env node
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import opentype from 'opentype.js';
import imagemin from 'imagemin';
import imageminOptipng from 'imagemin-optipng';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '../dist');
const FIRA_CODE_PATH = path.join(__dirname, '../node_modules/firacode/distr/ttf/FiraCode-Bold.ttf');

const BACKGROUND = '#336699';
const TEXT_COLOR = '#ffffff';

async function createFaviconSVG() {
  const font = await opentype.load(FIRA_CODE_PATH);
  
  const glyphB = font.charToGlyph('B');
  const glyphM = font.charToGlyph('M');
  
  const fontSize = 280;
  const scale = fontSize / font.unitsPerEm;
  
  const pathB = glyphB.getPath(0, 0, fontSize);
  const pathM = glyphM.getPath(0, 0, fontSize);
  
  const glyphWidth = glyphB.advanceWidth * scale;
  const spacing = 10;
  const totalWidth = (glyphB.advanceWidth + glyphM.advanceWidth) * scale + spacing;
  
  const startX = (512 - totalWidth) / 2;
  const baseY = 340;
  
  const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BACKGROUND};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4477aa;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#grad)"/>
  <g transform="translate(${startX}, ${baseY})">
    <path d="${pathB.toPathData()}" fill="${TEXT_COLOR}"/>
    <path d="${pathM.toPathData()}" transform="translate(${glyphWidth + spacing}, 0)" fill="${TEXT_COLOR}"/>
  </g>
</svg>`.trim();

  return Buffer.from(svg);
}

async function generateFavicons() {
  console.log('\n🎨 Generating favicons...');
  
  const svgBuffer = await createFaviconSVG();
  
  // Generate different sizes
  const sizes = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 48, name: 'favicon-48x48.png' },
    { size: 180, name: 'apple-touch-icon.png' }, // Apple iOS
    { size: 192, name: 'android-chrome-192x192.png' }, // Android
    { size: 512, name: 'android-chrome-512x512.png' }  // Android HD
  ];
  
  for (const { size, name } of sizes) {
    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    
    await fs.writeFile(path.join(DIST_DIR, name), pngBuffer);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }
  
  const ico32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();
  
  await fs.writeFile(path.join(DIST_DIR, 'favicon.ico'), ico32);
  console.log(`  ✓ favicon.ico (32x32)`);
  
  await fs.writeFile(path.join(DIST_DIR, 'favicon.svg'), svgBuffer);
  console.log(`  ✓ favicon.svg (scalable)`);
  
  console.log('\n🗜️  Optimizing PNGs with optipng...');
  const pngFiles = [
    'favicon-16x16.png',
    'favicon-32x32.png', 
    'favicon-48x48.png',
    'apple-touch-icon.png',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png'
  ];
  
  for (const file of pngFiles) {
    const filePath = path.join(DIST_DIR, file);
    const optimized = await imagemin([filePath], {
      plugins: [
        imageminOptipng({ optimizationLevel: 7 })
      ]
    });
    await fs.writeFile(filePath, optimized[0].data);
    console.log(`  ✓ Optimized ${file}`);
  }
  
  // Generate site.webmanifest for PWA
  const manifest = {
    name: "Benjamin Marwell",
    short_name: "BM",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ],
    theme_color: "#336699",
    background_color: "#ffffff",
    display: "standalone"
  };
  
  await fs.writeFile(
    path.join(DIST_DIR, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`  ✓ site.webmanifest`);
  
  console.log('✅ Favicons generated!\n');
}

generateFavicons().catch((error) => {
  console.error('❌ Favicon generation failed:', error.message);
  process.exit(1);
});
