import { GoogleGenerativeAI } from '@google/generative-ai';
import { scrapePage } from './scraper.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

/**
 * Full autonomous pipeline:
 * 1. Headless Puppeteer scrapes title, description, body text, and screenshot
 * 2. Gemini generates a 3-sentence executive summary from the scraped content
 * Returns: { title, summary, screenshotUrl }
 */
export async function enrichUrlWithAI(url, linkId) {
  try {
    const scraped = await scrapePage(url, linkId);

    const textForSummary = `
Title: ${scraped.title}
Description: ${scraped.description}
Body Preview: ${scraped.bodyPreview}
    `.trim();

    const prompt = `You are a sharp research assistant. Given this webpage content, write a clear 3-sentence executive summary in plain English. Focus on what the page is about, who it's for, and why it's useful. No bullet points, no markdown, no labels.

Content:
${textForSummary}

Return ONLY the summary sentences.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    return {
      title:         scraped.title,
      summary,
      screenshotUrl: scraped.screenshotUrl,
    };
  } catch (err) {
    console.error('enrichUrlWithAI error:', err.message);
    return {
      title:         url.replace(/https?:\/\//, '').split('/')[0],
      summary:       "We couldn't fully scrape this link, but it's safely stored.",
      screenshotUrl: null,
    };
  }
}

/**
 * Classifies a summary into 1-3 vibe tags using Gemini.
 * Returns a string array — always falls back to ['Educational'].
 */
export async function classifyVibes(summary) {
  try {
    const prompt = `Given this content summary: "${summary}"

Pick 1 to 3 vibe tags that best describe the energy of this content.
Choose ONLY from this exact list: ["Chaotic", "Educational", "Cursed", "High-Signal", "Inspirational"]

Return ONLY a valid JSON array of strings. Example: ["High-Signal", "Educational"]
No explanation. No markdown. Just the JSON array.`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const vibes = JSON.parse(cleaned);
    if (!Array.isArray(vibes)) throw new Error('Not an array');
    return vibes;
  } catch (err) {
    console.error('classifyVibes error:', err.message);
    return ['Educational'];
  }
}
