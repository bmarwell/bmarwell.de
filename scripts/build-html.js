#!/usr/bin/env node
/**
 * Build HTML: minify and copy static files
 */
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '../src/main/html');
const DIST_DIR = path.join(__dirname, '../dist');

async function main() {
  console.log('\n📄 Building HTML...');
  
  // Create dist directory
  await fs.mkdir(DIST_DIR, { recursive: true });
  
  // Minify HTML
  console.log('  Minifying index.html...');
  execSync(
    'html-minifier-terser ' +
    '--collapse-whitespace ' +
    '--remove-comments ' +
    '--remove-optional-tags ' +
    '--remove-redundant-attributes ' +
    '--remove-script-type-attributes ' +
    '--remove-tag-whitespace ' +
    '--use-short-doctype ' +
    '--minify-css true ' +
    '--minify-js true ' +
    '--minify-urls true ' +
    `--process-scripts "application/ld+json" ` +
    `-o ${DIST_DIR}/index.html ${SRC_DIR}/index.html`,
    { stdio: 'inherit' }
  );
  
  // Copy static files
  console.log('  Copying static files...');
  const staticFiles = ['.htaccess', 'robots.txt'];
  
  for (const file of staticFiles) {
    const src = path.join(SRC_DIR, file);
    const dest = path.join(DIST_DIR, file);
    await fs.copyFile(src, dest);
    console.log(`    ✓ ${file}`);
  }
  
  console.log('✅ HTML built!\n');
}

main().catch((error) => {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
});
