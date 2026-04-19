import 'dotenv/config';
import mongoose from 'mongoose';
import { enrichUrlWithAI } from './services/ai.service.js';

async function testLinkCreation() {
  console.log('\n🧪 Testing Link Creation\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const testUrl = 'https://www.amazon.com';
    console.log('Testing URL:', testUrl);
    console.log('Enriching with AI...\n');

    const result = await enrichUrlWithAI(testUrl, 'test-123');
    
    console.log('✅ AI Enrichment Result:');
    console.log('Title:', result.title);
    console.log('Summary:', result.summary.slice(0, 100) + '...');
    console.log('Vibes:', result.vibes);
    console.log('Screenshot:', result.screenshotUrl);
    console.log('');

    // Test vibe key generation
    console.log('Testing vibe key generation:');
    result.vibes.forEach((v) => {
      const vibeKey = v.replace(/[^a-zA-Z]/g, '');
      console.log(`  "${v}" → "vibeStats.${vibeKey}"`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await mongoose.disconnect();
  }
}

testLinkCreation();
