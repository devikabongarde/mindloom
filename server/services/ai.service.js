import axios from 'axios';
import { scrapePage } from './scraper.service.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL;

if (!OPENROUTER_API_KEY) {
  console.warn('WARNING: OPENROUTER_API_KEY not set — AI summaries will fall back to scraped description only.');
}

const ALLOWED_VIBES = [
  'Educational',
  'Chaotic', 
  'Cursed',
  'HighSignal',
  'Inspirational',
  'Entertainment',
  'Shopping',
  'News',
  'Technology',
  'Design',
  'Business',
  'Lifestyle',
  'Creative',
  'Research',
  'Tools'
];

const SYSTEM_PROMPT = `
You are an expert content analyzer and curator.

Your job:
1. Carefully analyze the web page content (title, description, body preview).
2. Produce a sharp, clear 3-sentence summary in plain English.
   - What is this content about?
   - Who is it for?
   - What value does it provide?
3. Assign 1-3 "vibe tags" that accurately describe the content type and purpose.

You MUST respond with STRICT JSON ONLY.
No markdown. No extra text. No code fences.

JSON schema:
{ "summary": "string, exactly 3 sentences.", "vibes": ["string", ...] }

Rules for "vibes" — choose 1 to 3 that BEST match the content from this list:

- "Educational"   — Tutorials, courses, how-tos, learning resources, documentation
- "HighSignal"    — Research papers, technical deep-dives, academic content, data analysis
- "News"          — News articles, current events, journalism, updates
- "Technology"    — Tech products, software, apps, programming, development
- "Shopping"      — E-commerce, product pages, online stores, marketplaces
- "Entertainment" — Movies, music, games, videos, streaming, fun content
- "Design"        — UI/UX, graphics, art, creative portfolios, design systems
- "Business"      — Startups, finance, marketing, entrepreneurship, corporate
- "Lifestyle"     — Health, fitness, food, travel, personal development
- "Creative"      — Writing, photography, art, music creation, creative work
- "Tools"         — Productivity tools, utilities, software services, platforms
- "Research"      — Scientific studies, experiments, data, academic papers
- "Inspirational" — Motivational content, success stories, visionary ideas
- "Chaotic"       — Memes, weird internet, unstructured, experimental
- "Cursed"        — Dark humor, unsettling, strange, controversial

IMPORTANT:
- Analyze the ACTUAL content carefully
- Choose vibes that ACCURATELY represent what the page is about
- For e-commerce sites like Amazon, eBay, Shopify → use "Shopping"
- For news sites like CNN, BBC, TechCrunch → use "News"
- For entertainment like Netflix, YouTube, Spotify → use "Entertainment"
- For tech products/services → use "Technology" or "Tools"
- Only use "Educational" if it's actually teaching/tutorial content
- Be specific and accurate, don't default to "Educational"
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
    // Smart fallback when no AI key
    const urlLower = url.toLowerCase();
    const titleLower = (scraped.title || '').toLowerCase();
    let fallbackVibes = ['HighSignal'];
    
    if (urlLower.includes('amazon.') || urlLower.includes('shop')) fallbackVibes = ['Shopping'];
    else if (urlLower.includes('youtube.') || urlLower.includes('netflix.')) fallbackVibes = ['Entertainment'];
    else if (urlLower.includes('news') || urlLower.includes('bbc.')) fallbackVibes = ['News'];
    else if (urlLower.includes('github.') || urlLower.includes('app.')) fallbackVibes = ['Tools'];
    else if (titleLower.includes('tutorial') || titleLower.includes('how to')) fallbackVibes = ['Educational'];
    
    return {
      title:         scraped.title || url,
      summary:       scraped.description || 'Summary will be generated later. Content is saved safely.',
      vibes:         fallbackVibes,
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
    
    // Smart fallback based on URL and content
    if (vibes.length === 0) {
      const urlLower = url.toLowerCase();
      const titleLower = (scraped.title || '').toLowerCase();
      const descLower = (scraped.description || '').toLowerCase();
      
      // E-commerce detection
      if (urlLower.includes('amazon.') || urlLower.includes('ebay.') || 
          urlLower.includes('shop') || urlLower.includes('store') ||
          titleLower.includes('buy') || titleLower.includes('price')) {
        vibes = ['Shopping'];
      }
      // News detection
      else if (urlLower.includes('news') || urlLower.includes('bbc.') ||
               urlLower.includes('cnn.') || urlLower.includes('techcrunch.')) {
        vibes = ['News'];
      }
      // Entertainment detection
      else if (urlLower.includes('youtube.') || urlLower.includes('netflix.') ||
               urlLower.includes('spotify.') || titleLower.includes('watch') ||
               titleLower.includes('video')) {
        vibes = ['Entertainment'];
      }
      // Tech/Tools detection
      else if (urlLower.includes('github.') || urlLower.includes('app.') ||
               descLower.includes('tool') || descLower.includes('platform')) {
        vibes = ['Tools'];
      }
      // Default fallback
      else {
        vibes = ['HighSignal'];
      }
    }

    return {
      title:         scraped.title || url,
      summary,
      vibes,
      screenshotUrl: scraped.screenshotUrl,
    };
  } catch (err) {
    console.error('enrichUrlWithAI (OpenRouter) error:', err.response?.data || err.message);
    
    // Smart fallback on error
    const urlLower = url.toLowerCase();
    const titleLower = (scraped.title || '').toLowerCase();
    let fallbackVibes = ['HighSignal'];
    
    if (urlLower.includes('amazon.') || urlLower.includes('shop')) fallbackVibes = ['Shopping'];
    else if (urlLower.includes('youtube.') || urlLower.includes('netflix.')) fallbackVibes = ['Entertainment'];
    else if (urlLower.includes('news') || urlLower.includes('bbc.')) fallbackVibes = ['News'];
    else if (urlLower.includes('github.') || urlLower.includes('app.')) fallbackVibes = ['Tools'];
    else if (titleLower.includes('tutorial') || titleLower.includes('how to')) fallbackVibes = ['Educational'];
    
    return {
      title:         scraped.title || url,
      summary:       scraped.description || "We couldn't fully summarize this link, but it's saved.",
      vibes:         fallbackVibes,
      screenshotUrl: scraped.screenshotUrl,
    };
  }
}

/**
 * Study Mode: given a summary + subject, returns a concise topic label (2-5 words).
 * e.g. subject="DBMS", summary about deadlocks → "Deadlocks in DBMS"
 */
export async function suggestTopic(summary, subject) {
  if (!OPENROUTER_API_KEY || !summary || !subject) return null;

  const prompt = `You are a teaching assistant.
Subject: ${subject}
Resource summary: ${summary}

Return ONE concise topic label (2-5 words) that a student would recognise as a chapter or sub-topic.
Return ONLY the label — no quotes, no punctuation, no extra text.`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type':  'application/json',
          'HTTP-Referer':  'https://shelflife.app',
          'X-Title':       'SHELFLIFE Study Topic Tagger',
        },
        timeout: 12000,
      }
    );
    const raw = response.data?.choices?.[0]?.message?.content?.trim() || '';
    return raw.replace(/["']/g, '').split('\n')[0].trim() || null;
  } catch (err) {
    console.error('suggestTopic error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Legacy stub — vibes now come from enrichUrlWithAI directly.
 * Kept so nothing else in the codebase breaks.
 */
export async function classifyVibes() {
  return ['Educational'];
}
