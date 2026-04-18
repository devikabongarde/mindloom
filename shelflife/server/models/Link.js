const mongoose = require('mongoose');

const LinkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  shelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Scrape data
  scrapeStatus: { 
    type: String, 
    enum: ['pending', 'scraping', 'ai_processing', 'complete', 'failed'],
    default: 'pending' 
  },
  title: { type: String },
  metaDescription: { type: String },
  screenshotBase64: { type: String },
  faviconUrl: { type: String },
  
  // AI data
  summary: { type: String },
  vibeType: { 
    type: String, 
    enum: ['Chaotic', 'Educational', 'Cursed', 'HighSignal', 'Aesthetic', 'Liminal'] 
  },
  vibeScore: { type: Number, min: 0, max: 100 },
  vibeReasoning: { type: String },
  tags: [{ type: String }],
  
  // Decay data
  lastClickedAt: { type: Date, default: Date.now },
  decayStage: { type: Number, default: 0, min: 0, max: 3 },
  decayPercent: { type: Number, default: 0, min: 0, max: 100 },
  isDead: { type: Boolean, default: false },
  diedAt: { type: Date },
  
  // Context grounding (Perplexity)
  contextFeed: {
    lastFetched: { type: Date },
    summary: { type: String },
    relevanceStatus: { type: String, enum: ['Current', 'Evolved', 'Outdated', 'Superseded'] },
    isStillRelevant: { type: Boolean },
    successorUrl: { type: String },
    successorTitle: { type: String }
  },
  
  // Social
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String, enum: ['🔥', '💀', '👀', '⚡', '🌿'] },
    createdAt: { type: Date, default: Date.now }
  }],
  clickCount: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model('Link', LinkSchema);
