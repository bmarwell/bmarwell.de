#!/usr/bin/env node
/**
 * Zstandard compression script with maximum compression level.
 * Zstd offers the best compression ratio with good decompression speed.
 * Level 22 is the maximum, providing excellent compression for static assets.
 */
import { promises as fs } from 'fs';
import path from 'path';
import zstd from '@mongodb-js/zstd';

const DIST_DIR = 'dist';
const COMPRESSION_LEVEL = process.env.ZSTD_LEVEL ? parseInt(process.env.ZSTD_LEVEL, 10) : 22;
const FILES_TO_COMPRESS = ['index.html', 'bmarwell-apache.asc', 'bmarwell-personal.asc'];

async function compressFile(filePath) {
  try {
    const content = await fs.readFile(filePath);
    // Zstd compression at level 22 for maximum compression
    const compressed = await zstd.compress(content, COMPRESSION_LEVEL);
    const outputPath = `${filePath}.zst`;
    await fs.writeFile(outputPath, compressed);
    
    const originalSize = content.length;
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
    
    console.log(`✓ ${path.basename(filePath)}.zst - ${originalSize} → ${compressedSize} bytes (${ratio}% reduction)`);
  } catch (error) {
    console.error(`✗ Failed to compress ${filePath}:`, error.message);
  }
}

async function main() {
  console.log(`\n🗜️  Compressing with Zstandard (level ${COMPRESSION_LEVEL})...`);
  
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
