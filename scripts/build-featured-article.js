#!/usr/bin/env node
/**
 * Build the featured article card from src/main/resources/featured-article.yml.
 *
 * Steps:
 *   1. Parse the YAML config.
 *   2. If enabled=false, erase the placeholder and exit.
 *   3. Download the featured image (JPEG + WebP) into dist/blog/.
 *   4. Generate the card HTML and inject it into dist/index.html in place of
 *      the <div id="featured-article-slot"></div> placeholder left by build-html.
 */
import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import fetch from 'node-fetch';
import sharp from 'sharp';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, '../src/main/resources/featured-article.yml');
const DIST_DIR = path.join(__dirname, '../dist');
const HTML_FILE = path.join(DIST_DIR, 'index.html');
const BLOG_DIR = path.join(DIST_DIR, 'blog');
const PLACEHOLDER = '<div id="featured-article-slot"></div>';

/** Escape special HTML characters for use in text nodes and attribute values. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Try to parse YYYY-MM-DD from a URL like /2024/05/23/slug.html */
function parseDateFromUrl(url) {
  const m = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Format "2024-05-23" → "May\u00a02024" */
function formatMonthYear(iso) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [year, month] = iso.split('-');
  return `${months[parseInt(month, 10) - 1]}\u00a0${year}`;
}

function generateCardHtml(cfg, datePublished) {
  const label = ['Featured Article', datePublished ? formatMonthYear(datePublished) : null]
    .filter(Boolean).join(' \u00b7 ');

  const dateMeta = datePublished
    ? `<meta itemprop="datePublished" content="${esc(datePublished)}">` : '';

  // rel="related" is the correct relation for a collection/series page;
  // rel="author" is reserved for links that identify the author of the current page.
  const seriesHtml = cfg.series ? `<p class="card--featured__series">Part of the \
<a href="${esc(cfg.series.url)}" rel="related" \
title="${esc(cfg.series.title)} \u2013 article series">${esc(cfg.series.title)}</a> series.</p>` : '';

  return `<h2>From the Blog</h2><div class="container">\
<article class="card card--featured" itemscope itemtype="https://schema.org/BlogPosting">\
<span itemprop="author" itemscope itemtype="https://schema.org/Person">\
<meta itemprop="name" content="Benjamin Marwell">\
<meta itemprop="url" content="https://bmarwell.de/">\
</span>\
<meta itemprop="url" content="${esc(cfg.url)}">${dateMeta}\
<a href="${esc(cfg.url)}" class="card--featured__media" rel="author" tabindex="-1" aria-hidden="true" \
title="${esc(cfg.title)} \u2013 featured image">\
<picture>\
<source srcset="/blog/featured-article.webp" type="image/webp">\
<img src="/blog/featured-article.jpg" alt="Featured image for: ${esc(cfg.title)}" \
width="800" height="420" loading="lazy" decoding="async" itemprop="image">\
</picture></a>\
<div class="card--featured__body">\
<span class="card--featured__label">${label}</span>\
<a href="${esc(cfg.url)}" class="card--featured__title-link" rel="author" \
title="${esc(cfg.title)} \u2013 read on blog.bmarwell.de">\
<span class="card-title" itemprop="headline">${esc(cfg.title)}</span></a>\
<span class="card-subtitle">blog.bmarwell.de</span>\
<p class="card-desc" itemprop="description">${esc(cfg.abstract.trim())}</p>\
${seriesHtml}</div></article></div>`;
}

async function buildFeaturedArticle() {
  console.log('\n📰 Building featured article...');

  const cfg = yaml.load(await fs.readFile(CONFIG_FILE, 'utf8'));
  let html = await fs.readFile(HTML_FILE, 'utf8');

  if (!html.includes(PLACEHOLDER)) {
    throw new Error(`Placeholder "${PLACEHOLDER}" not found in ${HTML_FILE}`);
  }

  if (!cfg.enabled) {
    console.log('  ℹ️  Featured article disabled — removing placeholder.');
    await fs.writeFile(HTML_FILE, html.replace(PLACEHOLDER, ''));
    console.log('✅ Featured article slot removed.\n');
    return;
  }

  // Resolve date (field is optional; fall back to parsing from URL)
  const datePublished = cfg.date_published
    ? String(cfg.date_published)
    : parseDateFromUrl(cfg.url);
  if (!cfg.date_published && datePublished) {
    console.log(`  ℹ️  date_published not set — parsed from URL: ${datePublished}`);
  }

  // Download image
  await fs.mkdir(BLOG_DIR, {recursive: true});
  console.log(`  → Downloading featured image…`);
  const response = await fetch(cfg.image_url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${cfg.image_url}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  await fs.writeFile(path.join(BLOG_DIR, 'featured-article.jpg'), buffer);
  console.log(`  ✓ featured-article.jpg (${buffer.length} bytes)`);

  const webpBuffer = await sharp(buffer).webp({quality: 85}).toBuffer();
  await fs.writeFile(path.join(BLOG_DIR, 'featured-article.webp'), webpBuffer);
  const pct = Math.round((1 - webpBuffer.length / buffer.length) * 100);
  console.log(`  ✓ featured-article.webp (${webpBuffer.length} bytes, ${
    pct >= 0 ? pct + '% smaller' : Math.abs(pct) + '% larger than JPEG'})`);

  // Inject
  const cardHtml = generateCardHtml(cfg, datePublished);
  await fs.writeFile(HTML_FILE, html.replace(PLACEHOLDER, cardHtml));
  console.log('✅ Featured article card injected.\n');
}

buildFeaturedArticle().catch((err) => {
  console.error('Failed to build featured article:', err);
  process.exit(1);
});
