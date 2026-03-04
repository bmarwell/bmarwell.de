# GitHub Copilot Instructions for bmarwell.de

> **Also see**: [`.github/additional-instructions.md`](additional-instructions.md) for workflow orchestration, subagent strategy, and core principles that apply to all work in this repository.

## Project Overview
This is a personal landing page and link hub for Benjamin Marwell, hosted at https://bmarwell.de/. The site is optimized for SEO, performance, and modern web standards.

## Build System
- **Source**: `src/main/html/` (Maven-style structure)
- **Output**: `dist/` directory
- **Build tool**: Bun (package manager and script runner); scripts defined in `package.json`
- **Testing**: Use local HTTP server for testing (e.g., `bunx http-server dist/`)
- **Do NOT**: Include deployment commands (rsync) in the repository

## Code Style
- **JavaScript**: Follow Google Style Guide (configured in `.idea/codeStyles/codeStyleConfig.xml`)
- **Indentation**: 2 spaces
- **Comments**: Minimal - only add comments when clarification is truly needed
- **HTML/CSS**: Clean, semantic, minimal

## Critical Design Decisions & Why

### 1. No External Font Loading
**What**: Fonts are downloaded during build and self-hosted in `dist/fonts/`
**Why**: Privacy, GDPR compliance, performance, and no dependency on Google Fonts CDN
**Implementation**: `scripts/download-fonts.js` downloads Roboto from Google Fonts API

### 2. Pre-Compression Strategy
**What**: All text files are pre-compressed with Zstandard (.zst), Brotli (.br), and Gzip (.gz)
**Why**: Better compression than on-the-fly, reduces server CPU, faster delivery
**Priority**: zstd > brotli > gzip (as supported by client)
**Exception**: `.htaccess` files are NEVER compressed (Apache needs to read them)

### 3. Double Compression Prevention
**What**: `.htaccess` serves pre-compressed files with `T=content` flag
**Why**: Without this flag, Apache's mod_deflate would compress already-compressed files, causing mojibake
**Implementation**: `RewriteRule` with `[T=content-type,L]` flags

### 4. Avatar & Image Optimization
**What**: Avatar downloaded from GitHub, converted to WebP with JPEG fallback
**Why**: Modern format reduces bandwidth by ~30%, better UX on slow connections
**Build**: `scripts/download-avatar.js` with sharp for WebP conversion and optimization

### 5. Responsive Images
**What**: Multiple sizes generated (480w, 768w, 1024w) with srcset
**Why**: Mobile users don't need 1024px images, saves bandwidth and improves Core Web Vitals
**Format**: WebP preferred, JPEG fallback for older browsers

### 6. Favicon with Fira Code
**What**: SVG favicon with "BM" monogram using Fira Code glyph paths
**Why**: Professional monospace aesthetic, scalable, brand color #336699
**Implementation**: Only B and M glyph paths embedded (not full font) for minimal size

### 7. Canonical URL & Redirects
**What**: Canonical URL is https://bmarwell.de/ (no www, no index.html)
**Why**: SEO - prevents duplicate content penalties, consolidates page authority
**Implementation**: 
  - `<link rel="canonical">` meta tag
  - `.htaccess` 301 redirects: www → non-www, index.html → /

### 8. JSON-LD Structured Data
**What**: Schema.org Person markup embedded inline
**Why**: Helps search engines understand identity, social profiles, improves rich snippets
**Minification**: Build process minifies inline JSON-LD to save bytes

### 9. Robots.txt - AI Bots Allowed
**What**: All bots allowed, including AI/LLM scrapers (GPTBot, ClaudeBot, etc.)
**Why**: Personal hub benefits from AI indexing for developer discovery
**Different from**: Many sites block AI bots - this is intentional for a personal landing page

### 10. Brand Color #336699
**What**: Signature blue used consistently (avatar border, section arrows, card titles)
**Why**: Personal brand consistency across all properties (blog, GitHub, etc.)

## File Handling Rules

### Never Compress
- `.htaccess` files (Apache must read them plaintext)
- `.woff`/`.woff2` fonts (already optimally compressed)

### Always Compress
- HTML, CSS, JavaScript files
- SVG files (even though they're XML, compression is effective)
- JSON files

### Always Optimize
- PNG images: `optipng -o7`
- JPEG images: mozjpeg quality 85
- WebP images: quality 85, ensure smaller than JPEG

## SEO Requirements
- **Meta description**: Max 160 characters
- **Title tags**: Include primary keywords (Apache Maven, DevSecOps, Java)
- **Alt text**: All images must have descriptive alt text
- **Title attributes**: All anchor links must have title attributes
- **Internal links**: At least one internal link (avatar links to homepage)
- **Structured data**: JSON-LD Person schema required

## Documentation Rules
- **Do NOT create**: Summary markdown files (e.g., `CHANGES.md`, `SUMMARY.md`)
- **Do NOT update**: Documentation files unless explicitly requested
- **Do create**: Inline code comments ONLY when necessary for clarity
- **Reason**: Keep repository clean, avoid documentation drift

## Testing Workflow
1. Run `bun run build` to build the site
2. Start local server: `bunx http-server dist/ -p 8080`
3. Test in browser at http://localhost:8080
4. Verify compression: Check for `.br`, `.gz`, `.zst` files in `dist/`
5. Validate SEO: Check meta tags, structured data, accessibility attributes

## Common Tasks

### Adding a new link card
1. Edit `src/main/html/index.html`
2. Add `<a>` with class `card`, `rel="me"`, and `title` attribute
3. Include SVG icon with `aria-label`
4. Follow existing card structure for consistency
5. Rebuild and test (`bun run build`)

### Updating fonts
1. Modify `scripts/download-fonts.js` font configuration
2. Update inline `@font-face` declarations in HTML
3. Rebuild - fonts are downloaded and copied automatically

### Switching the Featured Article
The featured article card is fully configured via `src/main/resources/featured-article.yml`.
The build script (`scripts/build-featured-article.js`) reads this file, downloads the image, and
injects the card into `dist/index.html` at the `<div id="featured-article-slot"></div>` placeholder.

**To change the featured article:**
1. Edit `src/main/resources/featured-article.yml` with the new article's data:
   - `title` — article headline
   - `url` — canonical article URL
   - `abstract` — 1–3 sentence teaser shown in the card
   - `image_url` — URL of the featured image (downloaded at build time as JPEG + WebP)
   - `date_published` — `YYYY-MM-DD` (optional; auto-parsed from `/YYYY/MM/DD/` in URL)
   - `series` block with `title` + `url` (optional; omit if article is standalone)
2. Run `bun run build` to download the new image and regenerate the site.
3. `rel="author"` goes on article links; `rel="related"` goes on series/collection links.

**To disable the featured article entirely:**
Set `enabled: false` in `featured-article.yml`. The placeholder is removed from the output.

**Image naming**: regardless of the source URL, images are always saved as
`dist/blog/featured-article.jpg` and `dist/blog/featured-article.webp`.


1. Zstandard: Edit `scripts/compress-zstd.js` (currently level 19)
2. Brotli: Edit `scripts/compress-brotli.js` (currently level 11)
3. Gzip: Edit `scripts/compress-gzip.js` (currently level 9)
4. Higher levels = better compression but slower builds

## Performance Targets
- **First Contentful Paint**: < 1.0s
- **Largest Contentful Paint**: < 1.5s
- **Total Transfer Size**: < 30KB (compressed)
- **Time to Interactive**: < 2.0s

## Contact & Deployment
- **Owner**: Benjamin Marwell (@bmarwell)
- **Apache ID**: bmarwell
- **GitHub**: github.com/bmarwell
- **Deployment**: Manual (not documented in repo for security)
