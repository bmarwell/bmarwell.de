import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const BASE_URL = 'http://localhost:8080';
let serverProcess;

beforeAll(async () => {
  serverProcess = spawn('npx', ['http-server', 'dist', '-p', '8080', '-c-1', '--brotli', '--gzip'], {
    stdio: 'ignore'
  });
  await setTimeout(2000);
});

afterAll(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

describe('Content-Type Headers', () => {
  it('should serve HTML with correct content-type', async () => {
    const response = await fetch(`${BASE_URL}/`);
    expect(response.headers.get('content-type')).toMatch(/text\/html/);
  });

  it('should serve robots.txt with correct content-type', async () => {
    const response = await fetch(`${BASE_URL}/robots.txt`);
    expect(response.headers.get('content-type')).toMatch(/text\/plain/);
  });

  it('should serve WebP images with correct content-type', async () => {
    const response = await fetch(`${BASE_URL}/avatar-200w.webp`);
    expect(response.headers.get('content-type')).toMatch(/image\/webp/);
  });

  it('should serve JPEG images with correct content-type', async () => {
    const response = await fetch(`${BASE_URL}/avatar-200w.jpg`);
    expect(response.headers.get('content-type')).toMatch(/image\/jpeg/);
  });

  it('should serve PNG favicons with correct content-type', async () => {
    const response = await fetch(`${BASE_URL}/favicon-32x32.png`);
    expect(response.headers.get('content-type')).toMatch(/image\/png/);
  });

  it('should serve SVG favicon with correct content-type', async () => {
    const response = await fetch(`${BASE_URL}/favicon.svg`);
    expect(response.headers.get('content-type')).toMatch(/image\/svg\+xml/);
  });

  it('should serve WOFF2 fonts with correct content-type', async () => {
    const response = await fetch(`${BASE_URL}/fonts/roboto-v32-latin-regular.woff2`);
    expect(response.headers.get('content-type')).toMatch(/font\/woff2|application\/font-woff2/);
  });
});

describe('Compression', () => {
  it('should serve compressed HTML when requested', async () => {
    const response = await fetch(`${BASE_URL}/`, {
      headers: { 'Accept-Encoding': 'br, gzip' }
    });
    const encoding = response.headers.get('content-encoding');
    expect(['br', 'gzip']).toContain(encoding);
  });

  it('should not double-compress already compressed fonts', async () => {
    const response = await fetch(`${BASE_URL}/fonts/roboto-v32-latin-regular.woff2`);
    expect(response.headers.get('content-encoding')).toBeNull();
  });
});

describe('HTML Content', () => {
  it('should contain canonical URL', async () => {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('https://bmarwell.de/');
  });

  it('should contain proper meta description', async () => {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    expect(html).toContain('name="description"');
    const match = html.match(/name="description"\s+content="([^"]+)"/);
    expect(match).toBeTruthy();
    expect(match[1].length).toBeLessThanOrEqual(160);
  });

  it('should contain structured data', async () => {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    expect(html).toContain('application/ld+json');
    expect(html).toContain('@type');
  });

  it('should use local fonts', async () => {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).toContain('@font-face');
  });

  it('should use local avatar', async () => {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    expect(html).not.toContain('github.com/bmarwell.png');
    expect(html).toContain('avatar-200w.webp');
  });

  it('should have og:image dimensions set', async () => {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    expect(html).toContain('property="og:image:width"');
    expect(html).toContain('property="og:image:height"');
    const widthMatch = html.match(/property="og:image:width"\s+content="(\d+)"/);
    const heightMatch = html.match(/property="og:image:height"\s+content="(\d+)"/);
    expect(widthMatch).toBeTruthy();
    expect(heightMatch).toBeTruthy();
    expect(parseInt(widthMatch[1])).toBeGreaterThan(0);
    expect(parseInt(heightMatch[1])).toBeGreaterThan(0);
  });
});
