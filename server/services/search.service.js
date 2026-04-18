import axios from 'axios';

/**
 * Searches Serper.dev for the top 3 organic results on a given query.
 * Falls back to empty array on error — never throws.
 */
export async function searchRecentContext(query) {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    console.warn('SERPER_API_KEY not set — skipping web search');
    return [];
  }

  try {
    const { data } = await axios.post(
      'https://google.serper.dev/search',
      { q: query, num: 3 },
      {
        headers: {
          'X-API-KEY': key,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );

    const results = data.organic || [];
    return results.slice(0, 3).map((r) => ({
      title:   r.title,
      snippet: r.snippet,
      link:    r.link,
    }));
  } catch (err) {
    console.error('Serper search error:', err.response?.data || err.message);
    return [];
  }
}
