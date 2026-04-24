# MindLoom Vercel Deployment Guide

## Project Structure Overview
- **Backend**: Express.js server in `/server` folder
- **Frontend**: React + Vite in `/client` folder
- **Database**: MongoDB (needs Atlas for cloud)
- **Real-time**: Socket.io (optional, can be disabled)
- **APIs Used**: Google Generative AI, SerpAPI, OpenRouter, Twilio, Telegram

---

## Step 1: Prepare Backend for Vercel

### 1.1 Create Vercel Build Configuration

Create `/vercel.json` in the root:
```json
{
  "buildCommand": "cd server && npm install",
  "outputDirectory": "server",
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 1.2 Update API Configuration for Client

The client currently has hardcoded `http://localhost:5000`. Update `/client/src/utils/api.js`:

```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mindloom_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## Step 2: Environment Variables Needed

### Backend (Server) - Required for Vercel
```
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mindloom?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-secret-key-here-min-32-chars

# Client URL (for CORS)
CLIENT_URL=https://your-frontend-domain.vercel.app

# Optional: Real-time features
REALTIME_ENABLED=true
REDIS_URL=redis://default:password@your-redis-host:port  # Only if using Socket.io

# API Keys (third-party services)
GEMINI_API_KEY=your-google-ai-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=openai/gpt-4  # or your model choice
SERPER_API_KEY=your-serper-api-key

# Optional: Messaging/Notifications
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token

# Server
PORT=3000  # Vercel will set this automatically
NODE_ENV=production
```

### Frontend (Client) - Required for Vercel
```
# API Configuration
VITE_API_URL=https://your-backend-api.vercel.app

# Real-time Socket (optional)
VITE_REALTIME_ENABLED=true
VITE_SOCKET_URL=https://your-backend-api.vercel.app
```

---

## Step 3: Deployment Steps

### Option A: Deploy Backend First (Recommended)

**3A.1 Create Vercel Backend Project**
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Select "root" as the root directory
5. Go to "Settings" → "Environment Variables"
6. Add all the **Backend** variables from Step 2

**3A.2 Deploy Backend**
1. Click "Deploy"
2. Wait for deployment to complete
3. Note your backend URL (e.g., `https://mindloom-api.vercel.app`)

### Option B: Deploy Frontend

**3B.1 Update Client Env for Frontend**
In Vercel dashboard for frontend project:
1. Go to "Settings" → "Environment Variables"
2. Add:
   ```
   VITE_API_URL=https://your-backend-domain.vercel.app
   VITE_REALTIME_ENABLED=true
   VITE_SOCKET_URL=https://your-backend-domain.vercel.app
   ```

**3B.2 Deploy Frontend**
1. Connect your GitHub repo
2. Select `/client` as the root directory
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables
6. Click Deploy

---

## Step 4: Additional Configuration

### Database Setup (MongoDB Atlas)
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create database user (note username/password)
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/mindloom`
5. Add to Vercel env vars as `MONGO_URI`

### JWT Secret Generation
```bash
# Run in terminal to generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### API Keys to Obtain
- **GEMINI_API_KEY**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **OPENROUTER_API_KEY**: [OpenRouter.ai](https://openrouter.ai)
- **SERPER_API_KEY**: [Serper.dev](https://serper.dev)
- **TELEGRAM_BOT_TOKEN**: [@BotFather on Telegram](https://t.me/botfather)

---

## Step 5: Testing

### Backend Testing
```bash
# Test if backend is running
curl https://your-backend-domain.vercel.app

# Test database connection by logging in (should return JWT token)
curl -X POST https://your-backend-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Frontend Testing
1. Visit your frontend Vercel URL
2. Test login/register
3. Test link creation
4. Check browser console for any API errors

---

## Step 6: Troubleshooting

### Common Issues

**1. CORS Errors**
- Make sure `CLIENT_URL` in backend env vars matches your frontend domain
- Add to `server.js` corsOrigin function

**2. API Calls Returning 404**
- Check `VITE_API_URL` in frontend env vars
- Ensure it matches your backend Vercel domain
- Check network tab in browser DevTools

**3. Socket.io Connection Issues**
- Set `VITE_REALTIME_ENABLED=false` if you don't need real-time
- Or use Redis for Socket.io adapter (Vercel limitation)

**4. Database Connection Timeouts**
- Verify `MONGO_URI` is correct
- Whitelist Vercel IPs in MongoDB Atlas Network Access
- Check if database exists

**5. Missing Environment Variables**
- Go to Vercel Project Settings → Environment Variables
- Add any missing variables
- Redeploy (Environment variables don't update without redeploy)

---

## File Changes Needed

### 1. Create `/vercel.json`
```json
{
  "buildCommand": "cd server && npm install",
  "outputDirectory": "server",
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Update `/client/src/utils/api.js`
Already provided above - switch from hardcoded localhost to env var

### 3. Optional: Create `/server/.env.example`
```
MONGO_URI=
JWT_SECRET=
CLIENT_URL=
GEMINI_API_KEY=
```

---

## Quick Deployment Checklist

- [ ] Update `/client/src/utils/api.js` to use `VITE_API_URL`
- [ ] Create MongoDB Atlas account and get connection string
- [ ] Generate JWT secret
- [ ] Obtain API keys (Gemini, OpenRouter, SerpAPI)
- [ ] Create Vercel account
- [ ] Deploy backend first, get URL
- [ ] Update frontend `VITE_API_URL` with backend URL
- [ ] Deploy frontend
- [ ] Test login, link creation, search
- [ ] Monitor logs for errors

---

## Cost Considerations

- **Vercel Frontend**: Free tier includes 100GB bandwidth/month ✓
- **Vercel Backend**: Free tier limited to ~6 serverless invocations/sec
- **MongoDB Atlas**: Free tier 512MB storage ✓
- **Redis (if needed)**: ~$5-15/month for Socket.io adapter
- **API Keys**: Some free limits, check providers

For production, consider upgrading to Vercel Pro ($20/month) for faster builds and better scaling.
