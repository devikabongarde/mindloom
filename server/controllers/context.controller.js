import { GoogleGenerativeAI } from '@google/generative-ai';
import Link from '../models/Link.js';
import { searchRecentContext } from '../services/search.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

export const getContextFeed = async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) return res.status(404).json({ message: 'Link not found' });

    // Build a focused search query from title + vibes
    const searchQuery = `${link.title} ${new Date().getFullYear()}`;

    // Step 1: Web search (non-blocking — continues even if empty)
    const searchResults = await searchRecentContext(searchQuery);

    // Step 2: Gemini generates a contextual update
    const searchSummary = searchResults.length
      ? searchResults.map((r) => `- ${r.title}: ${r.snippet}`).join('\n')
      : 'No recent web results found.';

    const prompt = `
A user saved this link: "${link.title}"
Original summary when saved: "${link.summary || 'No summary available.'}"

Here are recent search results on the same topic:
${searchSummary}

Write a 2-3 sentence "context update" in plain English:
- Has this topic evolved recently?
- Is there anything newer or more relevant the user should know?
- Is this link still worth reading, or is it outdated?

Be direct, practical, and concise. No fluff. No markdown formatting.
    `.trim();

    let contextUpdate = 'Context feed temporarily unavailable.';
    try {
      const result = await model.generateContent(prompt);
      contextUpdate = result.response.text().trim();
    } catch (geminiErr) {
      console.error('Gemini context error:', geminiErr.message);
    }

    res.json({
      contextUpdate,
      recentResults: searchResults,
      searchedAt: new Date(),
    });
  } catch (err) {
    console.error('getContextFeed error:', err.message);
    res.status(500).json({ message: 'Server error generating context feed' });
  }
};
