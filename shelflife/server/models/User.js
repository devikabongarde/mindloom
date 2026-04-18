const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatarColor: { type: String },
  curatorArchetype: {
    title: { type: String },
    description: { type: String },
    dominantVibe: { type: String },
    vibeDistribution: {
      Chaotic: { type: Number, default: 0 },
      Educational: { type: Number, default: 0 },
      Cursed: { type: Number, default: 0 },
      HighSignal: { type: Number, default: 0 },
      Aesthetic: { type: Number, default: 0 },
      Liminal: { type: Number, default: 0 }
    },
    updatedAt: { type: Date }
  },
  shelves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shelf' }],
  lastActiveAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
