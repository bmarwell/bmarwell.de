#!/usr/bin/env node
/**
 * Brotli compression script with maximum quality.
 * Brotli level 11 provides excellent compression, especially for text content.
 * It's widely supported by modern browsers and CDNs.
 */
import { promises as fs } from 'fs';
import path from 'path';
import brotli from 'brotli';

const DIST_DIR = 'dist';
const COMPRESSION_LEVEL = process.env.BROTLI_LEVEL ? parseInt(process.env.BROTLI_LEVEL, 10) : 11;
const FILES_TO_COMPRESS = ['index.html', 'bmarwell.asc'];

async function compressFile(filePath) {
  try {
    const content = await fs.readFile(filePath);
    
    // Brotli compression with maximum quality
    const compressed = Buffer.from(brotli.compress(content, {
      mode: 0, // Generic mode (0 = generic, 1 = text, 2 = font)
      quality: COMPRESSION_LEVEL, // 0-11, 11 is maximum
      lgwin: 24 // Window size (10-24), 24 is maximum
    }));
    
    const outputPath = `${filePath}.br`;
    await fs.writeFile(outputPath, compressed);
    
    const originalSize = content.length;
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
    
    console.log(`✓ ${path.basename(filePath)}.br - ${originalSize} → ${compressedSize} bytes (${ratio}% reduction)`);
  } catch (error) {
    console.error(`✗ Failed to compress ${filePath}:`, error.message);
  }
}

async function main() {
  console.log(`\n🗜️  Compressing with Brotli (quality ${COMPRESSION_LEVEL})...`);
  
  for (const file of FILES_TO_COMPRESS) {
    const filePath = path.join(DIST_DIR, file);
    try {
      await fs.access(filePath);
      await compressFile(filePath);
    } catch (error) {
      console.warn(`⚠️  Skipping ${file}: file not found`);
    }
  }
  
  console.log('');
}

main().catch(console.error);
