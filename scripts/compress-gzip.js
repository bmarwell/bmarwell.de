#!/usr/bin/env node
/**
 * Gzip compression script with maximum compression level.
 * Level 9 provides the best gzip compression as a universal fallback.
 * Gzip is supported by all browsers and serves as the baseline.
 */
import { promises as fs } from 'fs';
import path from 'path';
import pako from 'pako';

const DIST_DIR = 'dist';
const COMPRESSION_LEVEL = process.env.GZIP_LEVEL ? parseInt(process.env.GZIP_LEVEL, 10) : 9;
const FILES_TO_COMPRESS = ['index.html', 'bmarwell-apache.asc', 'bmarwell-personal.asc'];

async function compressFile(filePath) {
  try {
    const content = await fs.readFile(filePath);
    
    // Gzip compression with maximum level
    const compressed = Buffer.from(pako.gzip(content, {
      level: COMPRESSION_LEVEL, // 9 is maximum compression
      memLevel: 9, // Maximum memory for better compression
      strategy: 0 // Default strategy (0 = default, 1 = filtered, 2 = huffman, 3 = rle, 4 = fixed)
    }));
    
    const outputPath = `${filePath}.gz`;
    await fs.writeFile(outputPath, compressed);
    
    const originalSize = content.length;
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
    
    console.log(`✓ ${path.basename(filePath)}.gz - ${originalSize} → ${compressedSize} bytes (${ratio}% reduction)`);
  } catch (error) {
    console.error(`✗ Failed to compress ${filePath}:`, error.message);
  }
}

async function main() {
  console.log(`\n🗜️  Compressing with Gzip (level ${COMPRESSION_LEVEL})...`);
  
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
