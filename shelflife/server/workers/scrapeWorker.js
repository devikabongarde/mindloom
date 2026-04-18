const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const { OpenAI } = require('openai');
const { scrapeQueue } = require('./queue');
const Link = require('../models/Link');
const User = require('../models/User');
const { computeCuratorArchetype } = require('../utils/archetype');

// Initialize Perplexity Client using OpenAI SDK Compatibility
const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: 'https://api.perplexity.ai'
});

scrapeQueue.process(3, async (job) => {
  const { linkId } = job.data;
  console.log(`[Scraper] Starting job for link ${linkId}`);

  try {
    const link = await Link.findById(linkId);
    if (!link) {
      console.warn(`[Scraper] Link ${linkId} not found`);
      return;
    }

    link.scrapeStatus = 'scraping';
    await link.save();

    let pageData = {
      title: '',
      metaDescription: '',
      contentExcerpt: '',
      screenshotBase64: null,
      faviconUrl: ''
    };

    // Scraping Fallback Chain: Puppeteer -> Cheerio -> Meta
    try {
      // 1. Puppeteer Approach
      console.log(`[Scraper] Attempting Puppeteer for ${link.url}`);
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      const response = await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const status = response.status();
      if (status >= 400) {
        throw new Error(`HTTP ${status} Error`);
      }

      pageData.title = await page.title();
      
      pageData.metaDescription = await page.$eval("meta[name='description']", (el) => el.content).catch(() => '');
      
      const content = await page.evaluate(() => document.body.innerText);
      pageData.contentExcerpt = content.substring(0, 3000);

      const screenshot = await page.screenshot({ type: 'jpeg', quality: 60, encoding: 'base64', fullPage: false });
      pageData.screenshotBase64 = `data:image/jpeg;base64,${screenshot}`;

      // rudimentary favicon
      pageData.faviconUrl = await page.$eval("link[rel~='icon']", (el) => el.href).catch(() => {
        return new URL('/favicon.ico', link.url).toString();
      });

      await browser.close();
      console.log(`[Scraper] Puppeteer success for ${link.url}`);

    } catch (err) {
      console.warn(`[Scraper] Puppeteer failed for ${link.url}. Falling back to Cheerio. Reason: ${err.message}`);
      
      // Basic 404 handler
      if (err.message.includes('404') || err.message.includes('403')) {
          link.decayStage = 3;
          link.isDead = true;
          link.scrapeStatus = 'failed';
          link.summary = "Site unavailable (Dead Link)";
          await link.save();
          return;
      }
      
      // 2. Cheerio Approach
      const { data } = await axios.get(link.url, { timeout: 10000 });
      const $ = cheerio.load(data);
      pageData.title = $('title').text() || '';
      pageData.metaDescription = $("meta[name='description']").attr('content') || '';
      pageData.contentExcerpt = $('body').text().substring(0, 3000);
      pageData.faviconUrl = $("link[rel~='icon']").attr('href') || new URL('/favicon.ico', link.url).toString();
    }

    // AI Classification (Perplexity API acting as Claude substitute)
    link.scrapeStatus = 'ai_processing';
    await link.save();

    console.log(`[Scraper] Calling AI for ${link.url}`);
    
    const prompt = `Analyze this webpage content and return a JSON object exactly matching this format, with no markdown code blocks around it: { "summary": "Three sentences max.", "vibeType": "HighSignal|Educational|Chaotic|Cursed|Aesthetic|Liminal", "vibeScore": 95, "vibeReasoning": "One sentence.", "tags": ["tag1", "tag2", "tag3"] }
    URL: ${link.url}
    Title: ${pageData.title}
    Meta Description: ${pageData.metaDescription}
    Page Content: ${pageData.contentExcerpt}`;

    const completion = await perplexity.chat.completions.create({
      model: 'llama-3.1-sonar-small-128k-online', // Using standard model or 'llama-3.1-8b-instruct' if available
      messages: [
        { role: 'system', content: 'You are an AI curation assistant. Only return raw JSON. Do not wrap in ```json.' },
        { role: 'user', content: prompt }
      ]
    });

    let aiRaw = completion.choices[0].message.content.trim();
    // Strip markdown formatting if Perplexity forces it
    if(aiRaw.startsWith('\`\`\`json')){
       aiRaw = aiRaw.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '');
    }
    
    let aiData;
    try {
       aiData = JSON.parse(aiRaw);
    } catch(e) {
       console.error(`[Scraper] AI parse error:`, aiRaw);
       throw new Error("Failed to parse AI JSON response");
    }

    // Persist Results
    link.title = pageData.title;
    link.metaDescription = pageData.metaDescription;
    link.screenshotBase64 = pageData.screenshotBase64;
    link.faviconUrl = pageData.faviconUrl;

    link.summary = aiData.summary || 'Summary unavailable';
    link.vibeType = aiData.vibeType || 'Educational';
    link.vibeScore = aiData.vibeScore || 50;
    link.vibeReasoning = aiData.vibeReasoning || '';
    link.tags = aiData.tags || [];

    link.scrapeStatus = 'complete';
    await link.save();

    try {
      const curatorArchetype = await computeCuratorArchetype(link.addedBy);
      await User.findByIdAndUpdate(link.addedBy, { curatorArchetype });

      if (global.io) {
        global.io.emit('curator:updated', {
          userId: link.addedBy.toString(),
          curatorArchetype,
        });
      }
    } catch (archetypeErr) {
      console.warn('[Scraper] Failed to recompute curator archetype:', archetypeErr.message);
    }
    
    // Broadcast enriched link to frontend
    if (global.io && link.shelfId) {
       global.io.to(`shelf:${link.shelfId.toString()}`).emit('link:enriched', { link });
    }

    console.log(`[Scraper] Finished enrichment for ${link.url}`);
    return link;

  } catch (err) {
    console.error(`[Scraper] Global Job Error for ${linkId}:`, err);
    try {
        const link = await Link.findById(linkId);
        if(link) {
          link.scrapeStatus = 'failed';
          await link.save();
        }
    } catch(e) {}
    throw err; // Trigger bull retry
  }
});
