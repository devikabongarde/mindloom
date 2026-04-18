import mongoose from 'mongoose';

const shelfSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    parentShelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', default: null },
    isPublic: { type: Boolean, default: false },
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    type: { type: String, enum: ['personal', 'team'], default: 'personal' },
    weather: {
      type: String,
      enum: ['Stormy', 'Breezy', 'Foggy'],
      default: 'Foggy',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Shelf', shelfSchema);
