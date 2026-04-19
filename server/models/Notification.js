import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: [
        'friend_request',
        'friend_accept',
        'shelf_starred',
        'shelf_forked',
        'shelf_comment',
        'shelf_access_revoked',
        'link_reacted',
        'link_comment',
        'link_reference',
        'link_decay_warning',
        'link_decay_reminder',
        'system',
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: '', trim: true },
    meta: { type: Object, default: {} },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
