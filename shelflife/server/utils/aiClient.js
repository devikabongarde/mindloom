const axios = require('axios');

function stripCodeFences(text) {
  if (!text || typeof text !== 'string') return '{}';
  let out = text.trim();
  if (out.startsWith('```json')) out = out.replace(/^```json/, '').trim();
  if (out.startsWith('```')) out = out.replace(/^```/, '').trim();
  if (out.endsWith('```')) out = out.replace(/```$/, '').trim();
  return out;
}

async function callPerplexity({ systemPrompt, userPrompt, model }) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY is not configured');

  const response = await axios.post(
    'https://api.perplexity.ai/chat/completions',
    {
      model: model || process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-small-128k-online',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: Number(process.env.AI_TIMEOUT_MS || 10000),
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  return content || '{}';
}

async function callGemini({ systemPrompt, userPrompt, model }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const modelName = model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await axios.post(
    url,
    {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: Number(process.env.AI_TIMEOUT_MS || 10000),
    }
  );

  const parts = response.data?.candidates?.[0]?.content?.parts || [];
  const content = parts.map((p) => p.text || '').join('\n').trim();
  return content || '{}';
}

async function generateJson({ systemPrompt, userPrompt, perplexityModel, geminiModel }) {
  let raw;
  let provider;

  if (process.env.PERPLEXITY_API_KEY) {
    raw = await callPerplexity({ systemPrompt, userPrompt, model: perplexityModel });
    provider = 'perplexity';
  } else if (process.env.GEMINI_API_KEY) {
    raw = await callGemini({ systemPrompt, userPrompt, model: geminiModel });
    provider = 'gemini';
  } else {
    throw new Error('No AI provider configured. Set PERPLEXITY_API_KEY or GEMINI_API_KEY.');
  }

  const cleaned = stripCodeFences(raw);
  return {
    provider,
    raw,
    parsed: JSON.parse(cleaned),
  };
}

module.exports = {
  generateJson,
};
