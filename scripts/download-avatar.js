#!/usr/bin/env node
/**
 * Download avatar from GitHub, optimize it, and optionally pre-compress.
 * Falls back to external URL if download fails.
 */
import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import https from 'https';
import imagemin from 'imagemin';
import imageminOptipng from 'imagemin-optipng';
import imageminMozjpeg from 'imagemin-mozjpeg';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_URL = 'https://github.com/bmarwell.png';
const AVATAR_DEST_DIR = path.join(__dirname, '../dist');
const HTML_FILE = path.join(__dirname, '../dist/index.html');

let AVATAR_FILENAME = 'avatar.png'; // Will be updated based on actual format
let AVATAR_WEBP_FILENAME = 'avatar.webp'; // WebP version
let AVATAR_DEST = path.join(AVATAR_DEST_DIR, AVATAR_FILENAME);

async function downloadAvatar() {
  console.log('\n🖼️  Downloading avatar from GitHub...');

  return new Promise((resolve, reject) => {
    const download = (url) => {
      https.get(url, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          console.log(`  → Following redirect to ${redirectUrl}`);
          download(redirectUrl);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(
              `HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
      }).on('error', reject);
    };

    download(AVATAR_URL);
  });
}

async function optimizeImage(filePath) {
  console.log('\n🎨 Optimizing image...');

  const originalBuffer = await fs.readFile(filePath);
  const originalSize = originalBuffer.length;

  // Detect if PNG or JPEG
  const isPNG = originalBuffer[0] === 0x89 && originalBuffer[1] === 0x50;
  const isJPEG = originalBuffer[0] === 0xFF && originalBuffer[1] === 0xD8;

  let format = 'unknown';
  let extension = '.png';
  if (isPNG) {
    format = 'PNG';
    extension = '.png';
  }
  if (isJPEG) {
    format = 'JPEG';
    extension = '.jpg';
  }

  console.log(`  Format detected: ${format}`);

  // Rename file with correct extension if needed
  const correctPath = filePath.replace(/\.(png|jpg|jpeg)$/, extension);
  if (correctPath !== filePath) {
    await fs.rename(filePath, correctPath);
    console.log(
        `  ✓ Renamed to correct extension: ${path.basename(correctPath)}`);
    // Update global
    AVATAR_FILENAME = path.basename(correctPath);
    AVATAR_DEST = correctPath;
  }

  // Optimize with imagemin
  const plugins = isPNG
      ? [imageminOptipng({optimizationLevel: 7})]
      : [imageminMozjpeg({quality: 85, progressive: true})];

  const optimized = await imagemin.buffer(originalBuffer, {plugins});

  // Only keep if optimization actually helps
  if (optimized.length < originalSize) {
    await fs.writeFile(correctPath, optimized);
    const savings = originalSize - optimized.length;
    const ratio = ((1 - optimized.length / originalSize) * 100).toFixed(2);
    console.log(
        `  ✓ Optimized: ${originalSize} → ${optimized.length} bytes (saved ${savings} bytes, ${ratio}%)`);
  } else {
    console.log(
        `  ℹ️  Already optimal: ${originalSize} bytes (GitHub's version is well-optimized)`);
  }

  // Create WebP version
  await createWebP(correctPath, originalSize);
}

async function createWebP(sourcePath, originalSize) {
  console.log('\n🖼️  Creating WebP version...');

  const webpPath = sourcePath.replace(/\.(jpg|jpeg|png)$/, '.webp');

  // Try different quality levels to find one smaller than original
  const qualities = [80, 75, 70, 65, 60];

  for (const quality of qualities) {
    try {
      const webpBuffer = await sharp(sourcePath)
      .webp({quality, effort: 6})
      .toBuffer();

      if (webpBuffer.length < originalSize) {
        await fs.writeFile(webpPath, webpBuffer);
        const savings = originalSize - webpBuffer.length;
        const ratio = ((1 - webpBuffer.length / originalSize) * 100).toFixed(2);
        console.log(
            `  ✓ WebP created: ${originalSize} → ${webpBuffer.length} bytes (saved ${savings}, ${ratio}% at quality ${quality})`);

        // Update global to include webp
        AVATAR_WEBP_FILENAME = path.basename(webpPath);
        return;
      }
    } catch (error) {
      console.log(`  ⚠️  WebP quality ${quality} failed: ${error.message}`);
    }
  }

  console.log(
      `  ⚠️  Could not create WebP smaller than original ${originalSize} bytes`);
}

async function updateHTMLReferences() {
  console.log('📝 Updating HTML to use local avatar...');

  let html = await fs.readFile(HTML_FILE, 'utf-8');

  // Determine the avatar paths
  const avatarPath = `/${AVATAR_FILENAME}`;
  const avatarWebpPath = AVATAR_WEBP_FILENAME ? `/${AVATAR_WEBP_FILENAME}`
      : null;
  const avatarFullUrl = `https://bmarwell.de${avatarPath}`;

  console.log(
      `  Using: ${avatarPath}${avatarWebpPath ? ' (with WebP: ' + avatarWebpPath
          + ')' : ''}`);

  // Replace picture element srcset and img src
  if (avatarWebpPath) {
    // Update source srcset for WebP
    html = html.replace(
        /srcset="https:\/\/github\.com\/bmarwell\.png"/g,
        `srcset="${avatarWebpPath}"`
    );
  }

  // Update img src (fallback)
  html = html.replace(
      /src="https:\/\/github\.com\/bmarwell\.png"/g,
      `src="${avatarPath}"`
  );

  // Replace meta tags (use JPEG for social media - better compatibility)
  html = html.replace(
      /content="https:\/\/github\.com\/bmarwell\.png"/g,
      `content="${avatarFullUrl}"`
  );

  // Replace JSON-LD (use JPEG)
  html = html.replace(
      /"image":\s*"https:\/\/github\.com\/bmarwell\.png"/g,
      `"image":"${avatarFullUrl}"`
  );

  await fs.writeFile(HTML_FILE, html);
  console.log(`✓ Updated HTML with ${avatarWebpPath
      ? 'picture element (WebP + JPEG fallback)' : 'img element'}`);
}

async function main() {
  try {
    // Download avatar
    const imageData = await downloadAvatar();
    await fs.writeFile(AVATAR_DEST, imageData);
    console.log(`✓ Downloaded avatar: ${imageData.length} bytes`);

    // Optimize image (only if it helps)
    await optimizeImage(AVATAR_DEST);

    // Update HTML references
    await updateHTMLReferences();

    console.log('\n✅ Avatar ready!\n');
    console.log(
        'ℹ️  Note: Images are not pre-compressed (JPEG/PNG already optimal)\n');
  } catch (error) {
    console.error(`\n⚠️  Failed to download avatar: ${error.message}`);
    console.error('   Keeping external GitHub URL as fallback');
    console.error('   Site will still work but loads avatar from github.com\n');
    // Don't fail the build - external URL works as fallback
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  // Don't fail build - fallback to external URL
});
