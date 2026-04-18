const mongoose = require('mongoose');

const ShelfSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  slug: { type: String, unique: true },
  owners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublic: { type: Boolean, default: false },
  links: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Link' }],
  weather: {
    state: { type: String, enum: ['Stormy', 'Active', 'Foggy', 'Dead'], default: 'Foggy' },
    activityScore: { type: Number, default: 0, min: 0, max: 100 },
    lastUpdated: { type: Date, default: Date.now }
  },
  lineage: {
    forkedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', default: null },
    forkDepth: { type: Number, default: 0 },
    remixCount: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Shelf', ShelfSchema);
