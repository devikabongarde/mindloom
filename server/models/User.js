import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: null },
    defaultShelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', default: null },
    curatorArchetype: { type: String, default: null },
    vibeStats: {
      Educational: { type: Number, default: 0 },
      Chaotic: { type: Number, default: 0 },
      Cursed: { type: Number, default: 0 },
      HighSignal: { type: Number, default: 0 },
      Inspirational: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
