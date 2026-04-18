const mongoose = require('mongoose');

const LineageSchema = new mongoose.Schema({
  originalShelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', required: true },
  forkChain: [{
    shelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf' },
    shelfName: { type: String },
    ownerUsername: { type: String },
    forkedAt: { type: Date, default: Date.now },
    linkCountAtFork: { type: Number }
  }],
  totalRemixes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Lineage', LineageSchema);
