import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'public', 'screenshots');

// Ensure dir exists at startup
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Singleton browser — reused across requests
let _browser = null;
async function getBrowser() {
  if (!_browser || !_browser.connected) {
    _browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return _browser;
}

/**
 * Opens url in a headless browser, extracts metadata and captures a screenshot.
 * @param {string} url
 * @param {string} linkId — used for screenshot filename
 * @returns {{ title, description, bodyPreview, screenshotUrl }}
 */
export async function scrapePage(url, linkId) {
  let browser;
  let page;
  try {
    browser = await getBrowser();
    page = await browser.newPage();

    // Realistic desktop viewport
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    const { title, description, bodyPreview } = await page.evaluate(() => {
      const meta = (name) =>
        document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
        document.querySelector(`meta[property="og:${name}"]`)?.getAttribute('content') ||
        '';

      return {
        title:       document.querySelector('title')?.innerText || meta('title') || location.href,
        description: meta('description') || document.body.innerText.slice(0, 300),
        bodyPreview: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1500),
      };
    });

    // Screenshot
    const fileName = `${linkId}-${Date.now()}.png`;
    const filePath = path.join(SCREENSHOTS_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: false, type: 'png' });

    return {
      title:        title.trim(),
      description:  description.trim(),
      bodyPreview:  bodyPreview.trim(),
      screenshotUrl: `/static/screenshots/${fileName}`,
    };
  } catch (err) {
    console.error('scrapePage error:', err.message);
    return { title: url, description: '', bodyPreview: '', screenshotUrl: null };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
