import 'dotenv/config';
import axios from 'axios';

async function debugTelegramBot() {
  console.log('\n🔍 Telegram Bot Debug Tool\n');

  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token || token === 'your_telegram_bot_token_here') {
    console.error('❌ TELEGRAM_BOT_TOKEN not found or not set in .env file!');
    console.log('\nPlease check /server/.env file and make sure you have:');
    console.log('TELEGRAM_BOT_TOKEN=your_actual_token_here\n');
    return;
  }

  console.log('✅ Bot token found in .env\n');

  // Test 1: Check if bot token is valid
  console.log('📡 Test 1: Checking bot info...');
  try {
    const { data } = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    if (data.ok) {
      console.log('✅ Bot is valid!');
      console.log('   Bot name:', data.result.first_name);
      console.log('   Bot username: @' + data.result.username);
      console.log('   Bot ID:', data.result.id);
    } else {
      console.error('❌ Bot token is invalid!');
      return;
    }
  } catch (err) {
    console.error('❌ Error checking bot:', err.response?.data?.description || err.message);
    console.log('\n💡 This usually means your bot token is wrong.');
    console.log('   Get a new token from @BotFather with /newbot\n');
    return;
  }

  console.log('');

  // Test 2: Check webhook status
  console.log('📡 Test 2: Checking webhook...');
  try {
    const { data } = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    
    console.log('Webhook URL:', data.result.url || '❌ NOT SET');
    console.log('Pending updates:', data.result.pending_update_count || 0);
    
    if (data.result.last_error_date) {
      const errorDate = new Date(data.result.last_error_date * 1000);
      console.log('⚠️  Last error:', data.result.last_error_message);
      console.log('   Error time:', errorDate.toLocaleString());
    }

    if (!data.result.url) {
      console.log('\n❌ PROBLEM FOUND: Webhook is not set!');
      console.log('   This is why your bot is not responding.\n');
      console.log('   To fix: Run "node setup-telegram.js" and set your webhook URL\n');
      return;
    }

    if (data.result.last_error_message) {
      console.log('\n⚠️  PROBLEM FOUND: Webhook has errors!');
      console.log('   Error:', data.result.last_error_message);
      
      if (data.result.last_error_message.includes('Connection refused')) {
        console.log('\n💡 Your server is not accessible at the webhook URL.');
        console.log('   Make sure:');
        console.log('   1. Your server is running (npm start)');
        console.log('   2. ngrok is running (ngrok http 5000)');
        console.log('   3. Webhook URL matches your ngrok URL\n');
      }
      
      if (data.result.last_error_message.includes('Wrong response')) {
        console.log('\n💡 Your server is responding incorrectly.');
        console.log('   Check server logs for errors.\n');
      }
      return;
    }

    console.log('✅ Webhook is set correctly!');
    
  } catch (err) {
    console.error('❌ Error checking webhook:', err.message);
    return;
  }

  console.log('');

  // Test 3: Check for pending updates
  console.log('📡 Test 3: Checking for pending messages...');
  try {
    const { data } = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`);
    
    if (data.result && data.result.length > 0) {
      console.log(`⚠️  Found ${data.result.length} pending message(s)!`);
      console.log('   These messages were sent but not processed.\n');
      
      const lastUpdate = data.result[data.result.length - 1];
      if (lastUpdate.message) {
        console.log('   Last message:');
        console.log('   From:', lastUpdate.message.from.first_name);
        console.log('   Text:', lastUpdate.message.text);
        console.log('   Time:', new Date(lastUpdate.message.date * 1000).toLocaleString());
      }
      
      console.log('\n💡 This means webhook is not working properly.');
      console.log('   Your server is not receiving the messages.\n');
    } else {
      console.log('✅ No pending messages');
    }
  } catch (err) {
    console.error('❌ Error checking updates:', err.message);
  }

  console.log('');

  // Summary
  console.log('📊 SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('If your bot is still not responding, check:');
  console.log('');
  console.log('1. ✅ Server is running:');
  console.log('   cd server && npm start');
  console.log('');
  console.log('2. ✅ ngrok is running:');
  console.log('   ngrok http 5000');
  console.log('');
  console.log('3. ✅ Webhook is set to ngrok URL:');
  console.log('   node setup-telegram.js');
  console.log('   Enter: https://your-ngrok-url.ngrok.io/api/telegram/webhook');
  console.log('');
  console.log('4. ✅ Check server logs for errors');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

debugTelegramBot();
