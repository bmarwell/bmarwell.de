#!/usr/bin/env node
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '../src/main/html');
const DIST_DIR = path.join(__dirname, '../dist');

async function main() {
  console.log('\n🗺️  Generating sitemap...');
  
  let lastmod;
  try {
    lastmod = execSync(
      'git log -1 --format="%aI" -- src/main/html/index.html',
      { encoding: 'utf8', cwd: path.join(__dirname, '..') }
    ).trim();
  } catch (error) {
    console.warn('  ⚠️  Could not get git lastmod, using current date');
    lastmod = new Date().toISOString();
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bmarwell.de/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
  console.log(`  ✓ sitemap.xml (lastmod: ${lastmod})`);
  console.log('✅ Sitemap generated!\n');
}

main().catch((error) => {
  console.error('❌ Sitemap generation failed:', error.message);
  process.exit(1);
});
