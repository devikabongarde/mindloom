import axios from 'axios';

async function testWebhookEndpoint() {
  console.log('\n🧪 Testing Webhook Endpoint\n');

  const testUrl = 'http://localhost:5000/api/telegram/webhook';

  console.log('Testing:', testUrl);
  console.log('');

  try {
    // Send a test POST request
    const response = await axios.post(testUrl, {
      message: {
        chat: { id: 123456789 },
        from: { id: 123456789 },
        text: '/start'
      }
    });

    console.log('✅ Endpoint is accessible!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('');
    console.log('💡 Your webhook endpoint is working locally.');
    console.log('   Now make sure:');
    console.log('   1. ngrok is running');
    console.log('   2. Webhook is set to ngrok URL');
    console.log('');

  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server!');
      console.log('');
      console.log('💡 Your server is not running.');
      console.log('   Start it with: cd server && npm start');
      console.log('');
    } else {
      console.error('❌ Error:', err.message);
      if (err.response) {
        console.log('Status:', err.response.status);
        console.log('Data:', err.response.data);
      }
    }
  }
}

testWebhookEndpoint();
