# 🔧 Bot Not Responding? Fix It Here!

## Quick Diagnosis

Run these commands to find the problem:

```bash
cd server

# Check bot status
node debug-telegram.js

# Test webhook endpoint
node test-webhook.js
```

## Common Problems & Solutions

### Problem 1: Webhook Not Set ❌

**Symptoms:**
- Bot doesn't respond at all
- `debug-telegram.js` shows "Webhook URL: NOT SET"

**Solution:**
```bash
# 1. Start your server
npm start

# 2. In new terminal, start ngrok
ngrok http 5000

# 3. Copy the HTTPS URL (e.g., https://abcd-1234.ngrok.io)

# 4. Set webhook
node setup-telegram.js
# When prompted, enter: https://your-ngrok-url.ngrok.io/api/telegram/webhook
```

---

### Problem 2: Server Not Running ❌

**Symptoms:**
- `test-webhook.js` shows "Cannot connect to server"
- Bot doesn't respond

**Solution:**
```bash
cd server
npm start
```

Keep this terminal open! Server must stay running.

---

### Problem 3: ngrok Not Running ❌

**Symptoms:**
- Webhook shows errors like "Connection refused"
- Bot doesn't respond

**Solution:**
```bash
# In a NEW terminal (keep server running)
ngrok http 5000
```

Keep this terminal open too!

**Important:** Every time you restart ngrok, you get a NEW URL. You must update the webhook:
```bash
node setup-telegram.js
# Enter the NEW ngrok URL
```

---

### Problem 4: Wrong Bot Token ❌

**Symptoms:**
- `debug-telegram.js` shows "Bot token is invalid"
- Error: "Unauthorized"

**Solution:**
1. Go to Telegram → Search @BotFather
2. Send `/mybots`
3. Select your bot
4. Click "API Token"
5. Copy the token
6. Update `/server/.env`:
   ```
   TELEGRAM_BOT_TOKEN=paste_your_token_here
   ```
7. Restart server

---

### Problem 5: Webhook URL Mismatch ❌

**Symptoms:**
- Webhook is set but bot doesn't respond
- Server logs show no incoming requests

**Solution:**

Make sure webhook URL is EXACTLY:
```
https://your-ngrok-url.ngrok.io/api/telegram/webhook
```

NOT:
- ❌ `http://` (must be HTTPS)
- ❌ Missing `/api/telegram/webhook`
- ❌ Extra slashes or spaces

---

## Step-by-Step Checklist

Follow these steps IN ORDER:

### ✅ Step 1: Check .env file
```bash
cd server
type .env
```

Should see:
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

If not, add your bot token.

---

### ✅ Step 2: Start server
```bash
cd server
npm start
```

Should see:
```
Server running on port 5000
```

Leave this terminal open!

---

### ✅ Step 3: Test webhook endpoint
```bash
# In NEW terminal
cd server
node test-webhook.js
```

Should see:
```
✅ Endpoint is accessible!
```

If not, go back to Step 2.

---

### ✅ Step 4: Start ngrok
```bash
# In NEW terminal
ngrok http 5000
```

Should see something like:
```
Forwarding  https://abcd-1234.ngrok.io -> http://localhost:5000
```

Copy the HTTPS URL!

---

### ✅ Step 5: Set webhook
```bash
# In NEW terminal
cd server
node setup-telegram.js
```

When prompted, paste:
```
https://your-ngrok-url.ngrok.io/api/telegram/webhook
```

Should see:
```
✅ Webhook set successfully!
```

---

### ✅ Step 6: Debug bot
```bash
node debug-telegram.js
```

Should see:
```
✅ Bot is valid!
✅ Webhook is set correctly!
✅ No pending messages
```

If you see any ❌, read the error message and fix it.

---

### ✅ Step 7: Test bot
1. Open Telegram
2. Search for your bot
3. Send: `/start`
4. Should get a response!

---

## Still Not Working?

### Check Server Logs

Look at the terminal where you ran `npm start`. When you message the bot, you should see:
```
Telegram incoming: { chatId: 123456789, text: '/start', telegramUserId: 123456789 }
```

If you DON'T see this, the webhook is not working.

### Check ngrok Dashboard

Open in browser: http://localhost:4040

This shows all requests to your ngrok URL. When you message the bot, you should see a POST request to `/api/telegram/webhook`.

If you DON'T see requests, the webhook URL is wrong.

### Verify Webhook

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Check the `url` field matches your ngrok URL.

---

## Quick Reset (Nuclear Option)

If nothing works, start fresh:

```bash
# 1. Stop everything (Ctrl+C in all terminals)

# 2. Delete webhook
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook"

# 3. Start server
cd server
npm start

# 4. Start ngrok (new terminal)
ngrok http 5000

# 5. Set webhook (new terminal)
cd server
node setup-telegram.js
# Enter: https://new-ngrok-url.ngrok.io/api/telegram/webhook

# 6. Test
node debug-telegram.js

# 7. Message bot
```

---

## Common Mistakes

1. ❌ **Forgetting to restart server after changing .env**
   - Solution: Always restart server after editing .env

2. ❌ **Using old ngrok URL**
   - Solution: Update webhook every time you restart ngrok

3. ❌ **Not keeping terminals open**
   - Solution: Need 3 terminals running:
     - Terminal 1: `npm start` (server)
     - Terminal 2: `ngrok http 5000`
     - Terminal 3: For running commands

4. ❌ **Using HTTP instead of HTTPS**
   - Solution: Telegram requires HTTPS. Always use ngrok's HTTPS URL

5. ❌ **Wrong webhook path**
   - Solution: Must end with `/api/telegram/webhook`

---

## Need More Help?

1. Run `node debug-telegram.js` and share the output
2. Check server logs for errors
3. Check ngrok dashboard at http://localhost:4040
4. Make sure all 3 terminals are running

---

**Most common issue:** Webhook not set or ngrok not running. Follow the checklist above! 🚀
