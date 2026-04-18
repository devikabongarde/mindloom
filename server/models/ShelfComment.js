import mongoose from 'mongoose';

const shelfCommentSchema = new mongoose.Schema(
  {
    shelfId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model('ShelfComment', shelfCommentSchema);
