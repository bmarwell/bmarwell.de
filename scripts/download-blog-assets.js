#!/usr/bin/env node
/**
 * Download blog featured images into dist/blog/.
 */
import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import fetch from 'node-fetch';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, '../dist/blog');

const ASSETS = [
  {
    url: 'https://blog.bmarwell.de/2024/05/23/track-railway-railroad-train-travel-transportation-942713-pxhere-1200x630.com-800w.jpg',
    base: 'featured-parallel-maven',
  },
];

async function downloadBlogAssets() {
  console.log('\n📰 Downloading blog assets...');
  await fs.mkdir(BLOG_DIR, {recursive: true});

  for (const asset of ASSETS) {
    const jpegPath = path.join(BLOG_DIR, `${asset.base}.jpg`);
    const webpPath = path.join(BLOG_DIR, `${asset.base}.webp`);

    let buffer;
    try {
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    } catch (err) {
      console.warn(`  ⚠️  Failed to download ${asset.base}: ${err.message}`);
      continue;
    }

    await fs.writeFile(jpegPath, buffer);
    console.log(`  ✓ ${asset.base}.jpg (${buffer.length} bytes)`);

    const webpBuffer = await sharp(buffer).webp({quality: 85}).toBuffer();
    await fs.writeFile(webpPath, webpBuffer);
    const pct = Math.round((1 - webpBuffer.length / buffer.length) * 100);
    console.log(`  ✓ ${asset.base}.webp (${webpBuffer.length} bytes, ${pct >= 0 ? pct + '% smaller' : Math.abs(pct) + '% larger than JPEG'})`);
  }

  console.log('✅ Blog assets ready!\n');
}

downloadBlogAssets().catch((err) => {
  console.error('Failed to download blog assets:', err);
  process.exit(1);
});
