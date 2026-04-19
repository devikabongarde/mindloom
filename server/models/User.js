import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    telegramId: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    defaultShelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', default: null },
    apiToken:        { type: String, default: null, index: true },

    curatorArchetype: { type: String, default: null },
    curatorArchetypeName: { type: String, default: null, trim: true },
    curatorArchetypeDescription: { type: String, default: null, trim: true },
    vibeStats: {
      Educational: { type: Number, default: 0 },
      Chaotic: { type: Number, default: 0 },
      Cursed: { type: Number, default: 0 },
      HighSignal: { type: Number, default: 0 },
      Inspirational: { type: Number, default: 0 },
      Entertainment: { type: Number, default: 0 },
      Shopping: { type: Number, default: 0 },
      News: { type: Number, default: 0 },
      Technology: { type: Number, default: 0 },
      Design: { type: Number, default: 0 },
      Business: { type: Number, default: 0 },
      Lifestyle: { type: Number, default: 0 },
      Creative: { type: Number, default: 0 },
      Research: { type: Number, default: 0 },
      Tools: { type: Number, default: 0 },
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
