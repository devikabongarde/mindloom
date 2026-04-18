import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

// Fetches title and raw text from a URL using axios + cheerio
async function fetchPageContent(url) {
  const { data } = await axios.get(url, {
    timeout: 8000,
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const $ = cheerio.load(data);
  const title =
    $('title').text() ||
    $('meta[property="og:title"]').attr('content') ||
    url;
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';
  const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 3000);
  return { title: title.trim(), content: description || bodyText };
}

// Calls Gemini to generate a 2-3 sentence executive summary
export async function summarizeUrl(url) {
  try {
    const { title, content } = await fetchPageContent(url);
    const prompt = `You are a sharp research assistant. Given this webpage content, 
write a 2-3 sentence executive summary in plain English. 
Be direct and useful. No fluff.

Page Title: ${title}
Content: ${content}

Return ONLY the summary. No labels, no markdown.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();
    return { title, summary };
  } catch (err) {
    console.error('summarizeUrl error:', err.message);
    const fallbackTitle = url.replace(/https?:\/\//, '').split('/')[0];
    return {
      title: fallbackTitle,
      summary: "We couldn't summarize this link, but it's safely stored.",
    };
  }
}

// Calls Gemini to classify the link into vibe tags
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
