const mongoose = require('mongoose');

const CompostSchema = new mongoose.Schema({
  originalLinkId: { type: mongoose.Schema.Types.ObjectId },
  url: { type: String, required: true },
  title: { type: String },
  summary: { type: String },
  vibeType: { type: String },
  screenshotBase64: { type: String },
  diedAt: { type: Date, required: true },
  diedFromShelfId: { type: mongoose.Schema.Types.ObjectId },
  diedFromShelfName: { type: String },
  addedByUsername: { type: String },
  viewCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Compost', CompostSchema);
