import 'dotenv/config';
import axios from 'axios';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupTelegramWebhook() {
  console.log('\n🤖 SHELFLIFE Telegram Bot Setup\n');
  console.log('This script will help you set up your Telegram webhook.\n');

  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token || token === 'your_telegram_bot_token_here') {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file!');
    console.log('\nPlease add your bot token to /server/.env:');
    console.log('TELEGRAM_BOT_TOKEN=your_actual_token_here\n');
    rl.close();
    return;
  }

  console.log('✅ Bot token found in .env\n');

  // Get current webhook info
  try {
    const { data } = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    
    console.log('📊 Current Webhook Status:');
    console.log('URL:', data.result.url || '(not set)');
    console.log('Pending updates:', data.result.pending_update_count || 0);
    
    if (data.result.last_error_message) {
      console.log('⚠️  Last error:', data.result.last_error_message);
    }
    console.log('');
  } catch (err) {
    console.error('❌ Error checking webhook:', err.message);
    rl.close();
    return;
  }

  const webhookUrl = await question('Enter your webhook URL (e.g., https://abcd-1234.ngrok.io/api/telegram/webhook): ');

  if (!webhookUrl.startsWith('https://')) {
    console.error('\n❌ Webhook URL must start with https://');
    console.log('Telegram requires HTTPS for webhooks.\n');
    rl.close();
    return;
  }

  console.log('\n⏳ Setting webhook...\n');

  try {
    const { data } = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
      url: webhookUrl
    });

    if (data.ok) {
      console.log('✅ Webhook set successfully!');
      console.log('Description:', data.description);
      
      // Verify webhook
      const verify = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      console.log('\n📊 Verified Webhook Info:');
      console.log('URL:', verify.data.result.url);
      console.log('Pending updates:', verify.data.result.pending_update_count);
      
      console.log('\n✨ Setup complete! Now:');
      console.log('1. Start your server: npm start');
      console.log('2. Message your bot on Telegram');
      console.log('3. Bot will show your Telegram ID');
      console.log('4. Link your ID: node link-telegram.js your@email.com YOUR_TELEGRAM_ID');
      console.log('5. Test commands: /start, /shelves, /pdf\n');
    } else {
      console.error('❌ Failed to set webhook:', data.description);
    }
  } catch (err) {
    console.error('❌ Error setting webhook:', err.response?.data || err.message);
  }

  rl.close();
}

setupTelegramWebhook();
