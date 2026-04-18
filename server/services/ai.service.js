import axios from 'axios';
import { scrapePage } from './scraper.service.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL;

if (!OPENROUTER_API_KEY) {
  console.warn('WARNING: OPENROUTER_API_KEY not set — AI summaries will fall back to scraped description only.');
}

const ALLOWED_VIBES = ['Chaotic', 'Educational', 'Cursed', 'High-Signal', 'Inspirational'];

const SYSTEM_PROMPT = `
You are an expert research assistant and content curator.

Your job:
1. Read the given web page content (title, description, body preview).
2. Produce a sharp, clear 3-sentence executive summary in plain English.
   - Who is this for?
   - What is it about?
   - Why does it matter?
3. Assign 1–3 "vibe tags" that describe the emotional / energy feel of the content.

You MUST ALWAYS respond with STRICT JSON ONLY.
No markdown. No extra commentary. No code fences.

JSON schema:
{ "summary": "string, exactly 3 sentences.", "vibes": ["string", ...] }

Rules for "vibes" — choose 1 to 3 from ONLY this list:
- "Chaotic"       — Weird, noisy, meme-like, unstructured.
- "Educational"   — Tutorials, guides, docs, explainers, how-tos.
- "Cursed"        — Dark, disturbing, unsettling, strange internet.
- "High-Signal"   — Dense, serious, high-information (papers, benchmarks, deep dives).
- "Inspirational" — Design showcases, personal stories, visionary / motivational content.

If unsure, default to: "vibes": ["Educational"].
`.trim();

/**
 * Full autonomous pipeline:
 * 1. Puppeteer scrapes title, description, bodyPreview, screenshot
 * 2. OpenRouter returns { summary, vibes } in one call
 * Returns: { title, summary, vibes, screenshotUrl }
 */
export async function enrichUrlWithAI(url, linkId) {
  // Always scrape first — screenshot + metadata available even if AI fails
  const scraped = await scrapePage(url, String(linkId));

  if (!OPENROUTER_API_KEY) {
    return {
      title:         scraped.title || url,
      summary:       scraped.description || 'Summary will be generated later. Content is saved safely.',
      vibes:         ['Educational'],
      screenshotUrl: scraped.screenshotUrl,
    };
  }

  const userPrompt = `
Page Title:
${scraped.title || 'N/A'}

Meta Description or Intro:
${scraped.description || 'N/A'}

Body Preview (first ~1500 chars):
${scraped.bodyPreview || 'N/A'}

Output ONLY the JSON object with "summary" and "vibes".
`.trim();

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model:    OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.35,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type':  'application/json',
          'HTTP-Referer':  'https://shelflife.app',
          'X-Title':       'SHELFLIFE Ingestion Pipeline',
        },
        timeout: 20000,
      }
    );

    const raw     = response.data?.choices?.[0]?.message?.content?.trim() || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('OpenRouter JSON parse error:', parseErr.message, '| Raw:', raw);
    }

    const summary = typeof parsed.summary === 'string' && parsed.summary.length > 10
      ? parsed.summary
      : scraped.description || 'Summary not available, but content is saved.';

    let vibes = Array.isArray(parsed.vibes)
      ? parsed.vibes.filter((v) => ALLOWED_VIBES.includes(String(v).trim()))
      : [];
    if (vibes.length === 0) vibes = ['Educational'];

    return {
      title:         scraped.title || url,
      summary,
      vibes,
      screenshotUrl: scraped.screenshotUrl,
    };
  } catch (err) {
    console.error('enrichUrlWithAI (OpenRouter) error:', err.response?.data || err.message);
    return {
      title:         scraped.title || url,
      summary:       scraped.description || "We couldn't fully summarize this link, but it's saved.",
      vibes:         ['Educational'],
      screenshotUrl: scraped.screenshotUrl,
    };
  }
}

/**
 * Legacy stub — vibes now come from enrichUrlWithAI directly.
 * Kept so nothing else in the codebase breaks.
 */
export async function classifyVibes() {
  return ['Educational'];
}
