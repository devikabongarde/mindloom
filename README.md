# MindLoom

MindLoom is a collaborative, AI-powered social bookmarking platform where people collect links into shelves, discuss ideas in context, and resurface knowledge over time.

## Highlights

- Save and organize links into personal or shared shelves.
- Rich shelf collaboration with sharing, invites, comments, and social discovery.
- AI-assisted workflows for chat, summarization, and study/report-style output.
- Knowledge graph and lineage-style exploration pages in the client.
- Real-time collaboration support with Socket.IO (optional toggle).
- Telegram and WhatsApp integration hooks on the backend.
- Browser extension for one-click link saves from any page.

## Tech Stack

### Frontend
- React 18 + Vite
- React Router
- Tailwind CSS
- Framer Motion / GSAP
- Socket.IO client

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Socket.IO (optional realtime)
- Redis adapter support for Socket.IO scaling
- Integrations: Gemini, Serper, OpenRouter, Telegram, Twilio

## Monorepo Layout

```text
.
├─ client/                        # React app
├─ server/                        # Express API + realtime + integrations
├─ browser-extension/
│  └─ mindloom-quick-save/        # Chrome extension for quick link capture
├─ QUICKSTART.md                  # Bot-oriented quick-start doc
├─ VERCEL_DEPLOYMENT_GUIDE.md     # Deployment guide
└─ README.md                      # You are here
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB database (Atlas or local)

### 1) Install dependencies

From the project root:

```bash
npm install
```

Then install app dependencies:

```bash
cd client && npm install
cd ../server && npm install
```

### 2) Configure environment

Create `server/.env` from `server/.env.example` and fill required values.

Important variables:

- `MONGO_URI`
- `JWT_SECRET`
- `PORT`
- `CLIENT_URL`
- `REALTIME_ENABLED`

Optional but recommended (for AI/realtime/integrations):

- `GEMINI_API_KEY`
- `SERPER_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `REDIS_URL`
- `TELEGRAM_BOT_TOKEN`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `BACKEND_URL`

### 3) Run locally

Start backend:

```bash
cd server
npm run dev
```

Start frontend in another terminal:

```bash
cd client
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000` (or the `PORT` in your `.env`)

## Available Scripts

### Root

- `npm run dev` → starts client dev server via root script
- `npm run build` → builds client via root script

### Client (`client/package.json`)

- `npm run dev`
- `npm run build`
- `npm run preview`

### Server (`server/package.json`)

- `npm run dev`
- `npm start`

## Core API Groups

The server mounts these route groups:

- `/api/auth`
- `/api/shelves`
- `/api/links`
- `/api/social`
- `/api/chat`
- `/api/telegram`

Health/root response:

- `GET /` → `MINDLOOM API running`

## Realtime Notes

- Realtime is controlled by `REALTIME_ENABLED=true`.
- If enabled, Socket.IO initializes and can optionally attach Redis adapter when `REDIS_URL` is present.
- If disabled, API runs without Socket.IO.

## Browser Extension

The Chrome extension lives in:

- `browser-extension/mindloom-quick-save`

It allows one-click saves of the current tab URL into MindLoom shelves using your existing API and JWT token.

See extension setup guide:

- `browser-extension/mindloom-quick-save/README.md`

## Related Docs

- `QUICKSTART.md`
- `VERCEL_DEPLOYMENT_GUIDE.md`
- `MEMBER_MANAGEMENT.md`
- `VIBE_IMPROVEMENTS.md`
- `BOT_NOT_RESPONDING.md`

## Contributors

[![GitHub contributors](https://img.shields.io/github/contributors/devikabongarde/mindloom?style=for-the-badge)](https://github.com/devikabongarde/mindloom/graphs/contributors)

[![Contributors](https://contributors-img.web.app/image?repo=devikabongarde/mindloom)](https://github.com/devikabongarde/mindloom/graphs/contributors)

If the image does not load immediately after visibility changes, open the contributors graph directly:
https://github.com/devikabongarde/mindloom/graphs/contributors

## Project Status

Active hack/project codebase with ongoing iteration in product, AI features, social flows, and integrations.