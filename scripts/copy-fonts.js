#!/usr/bin/env node
/**
 * Copy Roboto font files (latin subset only, weights 300/400/500)
 * Build fails if fonts are missing.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_SOURCE = path.join(__dirname, '../node_modules/@fontsource/roboto/files');
const FONT_DEST = path.join(__dirname, '../dist/fonts');

// Only copy latin fonts for weights 300, 400, 500 (what we actually use)
const FONTS_TO_COPY = [
  'roboto-latin-300-normal.woff2',
  'roboto-latin-400-normal.woff2',
  'roboto-latin-500-normal.woff2',
];

async function copyFonts() {
  console.log('\n📦 Copying Roboto fonts...');
  
  // Create fonts directory
  await fs.mkdir(FONT_DEST, { recursive: true });
  
  // Copy font files
  for (const font of FONTS_TO_COPY) {
    const src = path.join(FONT_SOURCE, font);
    const dest = path.join(FONT_DEST, font);
    
    try {
      await fs.copyFile(src, dest);
      const stats = await fs.stat(dest);
      console.log(`✓ ${font} - ${stats.size} bytes`);
    } catch (error) {
      console.error(`✗ Failed to copy ${font}:`, error.message);
      console.error('   Make sure @fontsource/roboto is installed: bun install');
      process.exit(1); // Fail build if font download fails
    }
  }
  
  console.log('\n✅ Fonts ready!\n');
}

copyFonts().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
