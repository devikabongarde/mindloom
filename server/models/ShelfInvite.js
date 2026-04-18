import mongoose from 'mongoose';

const shelfInviteSchema = new mongoose.Schema({
  shelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', required: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  token:   { type: String, required: true, unique: true },
}, { timestamps: true });

// Auto-expire invites after 7 days
shelfInviteSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.model('ShelfInvite', shelfInviteSchema);
