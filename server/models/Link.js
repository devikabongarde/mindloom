import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema(
  {
    shelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true },
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    screenshot: { type: String, default: null },
    vibes: [{ type: String }],
    status: {
      type: String,
      enum: ['fresh', 'aging', 'dead'],
      default: 'fresh',
    },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    suggestions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true, trim: true, maxlength: 300 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastClickedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Link', linkSchema);
