import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

// Usage: node link-telegram.js <email> <telegramId>
// Example: node link-telegram.js user@example.com 123456789

async function linkTelegramId() {
  const email = process.argv[2];
  const telegramId = process.argv[3];

  if (!email || !telegramId) {
    console.error('Usage: node link-telegram.js <email> <telegramId>');
    console.error('Example: node link-telegram.js user@example.com 123456789');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    user.telegramId = String(telegramId);
    await user.save();

    console.log('✅ Telegram ID linked successfully!');
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`Telegram ID: ${user.telegramId}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

linkTelegramId();
