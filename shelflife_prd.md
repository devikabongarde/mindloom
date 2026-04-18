# ShelfLife: The Resurrection of the Living Archive
## Product Requirements Document — 24-Hour Hackathon Edition

**Stack:** MERN (MongoDB, Express, React, Node.js)  
**Competition:** WEB DEV PS 2  
**Version:** 1.0  
**Status:** Ready for Agent Implementation  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [User Personas](#3-user-personas)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [Tech Stack & Dependencies](#5-tech-stack--dependencies)
6. [Database Schema (MongoDB)](#6-database-schema-mongodb)
7. [Feature Specifications](#7-feature-specifications)
   - [F1: Autonomous Ingestion Pipeline](#f1-autonomous-ingestion-pipeline-the-scraper)
   - [F2: Semantic Vibe Engine](#f2-semantic-vibe-engine-genai-tagging)
   - [F3: Curator Archetypes](#f3-automated-curator-archetypes)
   - [F4: Biological Decay & Compost System](#f4-biological-decay--compost-system)
   - [F5: Real-time Collaborative Synapse](#f5-real-time-collaborative-synapse)
   - [F6: Perplexity Search-Grounding](#f6-perplexity-search-grounding)
   - [B1: Redis Distributed Synapse (Bonus)](#b1-redis-distributed-synapse-bonus)
   - [B2: Remix & Lineage Architecture (Bonus)](#b2-remix--lineage-architecture-bonus)
8. [API Route Specifications](#8-api-route-specifications)
9. [Frontend Pages & Components](#9-frontend-pages--components)
10. [Real-time Event Schema (Socket.io)](#10-real-time-event-schema-socketio)
11. [Environment Variables](#11-environment-variables)
12. [Decay Algorithm Specification](#12-decay-algorithm-specification)
13. [AI Prompt Templates](#13-ai-prompt-templates)
14. [Build Order & 24-Hour Timeline](#14-build-order--24-hour-timeline)
15. [Risk Register & Mitigations](#15-risk-register--mitigations)
16. [Success Metrics (Demo Checklist)](#16-success-metrics-demo-checklist)

---

## 1. Executive Summary

ShelfLife is a **social, AI-augmented link curation engine** that treats a bookmark collection as a living organism. Unlike passive bookmark managers, ShelfLife:

- **Automatically scrapes, screenshots, and summarizes** every saved URL using a headless browser + GenAI pipeline.
- **Classifies content sentiment** into visual "Energy Types" rendered as glowing "Mood Pills."
- **Biologically ages and kills** neglected links — desaturating them after 14 days and composting them publicly after 30 days.
- **Enables real-time collaboration** with live cursors, emoji reactions, and "Shelf Weather" activity indicators.
- **Grounds each link** in current web context using search-grounded AI to surface relevance drift.

The system is designed to be **demo-ready within 24 hours**, with a clear P0 → P1 → P2 → Bonus priority ladder.

---

## 2. Problem Statement

| Pain Point | Manifestation |
|---|---|
| Tab overload | Rayan: 400+ open tabs across 3 windows |
| Bookmark rot | Siddh: thousands of bookmarks, mostly broken redirects |
| No summaries | Every saved link requires manual reading to understand |
| No urgency | Passive lists create zero motivation to revisit content |
| No collaboration | No shared, live view of what the team is curating |
| Content staleness | No signal on whether a saved link is still relevant |

**Core insight:** The problem is not saving links. The problem is that saved links have no consequence — they don't decay, don't reward engagement, and don't punish neglect.

---

## 3. User Personas

### Persona A — Rayan (The Tab Hoarder)
- Saves links compulsively during research sessions
- Rarely revisits anything older than 48 hours
- Needs: instant AI summaries, urgency signals, visual chaos that mirrors his workflow
- Motivation: seeing his curator archetype evolve as he saves more

### Persona B — Siddh (The Broken Bookmarker)
- Organizes bookmarks into folders that become graveyards
- Values structure and context
- Needs: real-time awareness of what Rayan is saving, relevance grounding, composted links as a safety net
- Motivation: the Compost Heap as a discoverable global resource

---

## 4. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  Shelf View │ Compost Heap │ Curator Card │ Lineage Tree    │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                   EXPRESS API SERVER                         │
│  Auth │ Links │ Shelves │ Compost │ Remix │ Context Feed    │
└───────┬──────────────────┬──────────────────────────────────┘
        │                  │
┌───────▼──────┐  ┌────────▼────────┐  ┌──────────────────┐
│   MongoDB    │  │   Bull Queue     │  │  Socket.io Server │
│  (primary    │  │  (scrape jobs,  │  │  (cursors, reacts,│
│   datastore) │  │   decay cron)   │  │   weather, decay) │
└──────────────┘  └────────┬────────┘  └──────────────────┘
                           │
              ┌────────────▼────────────┐
              │    WORKER PROCESS       │
              │  Puppeteer scraper      │
              │  Claude/OpenAI API      │
              │  Perplexity API         │
              └─────────────────────────┘
                           │ (Bonus)
              ┌────────────▼────────────┐
              │    REDIS               │
              │  Job queue backing     │
              │  Socket.io adapter     │
              │  Decay telemetry cache │
              └─────────────────────────┘
```

### Service Separation Strategy (for 24h)
- **Single Node.js process** runs Express + Socket.io + Bull workers together (monolith for speed).
- Redis is optional — Bull can use an in-memory queue fallback if Redis setup is too slow.
- All scraping is async — UI is non-blocking; links show "processing" state instantly.

---

## 5. Tech Stack & Dependencies

### Backend
| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.18 | HTTP server |
| `mongoose` | ^8.x | MongoDB ODM |
| `socket.io` | ^4.x | WebSocket real-time layer |
| `bull` | ^4.x | Job queue for scraping workers |
| `puppeteer` | ^22.x | Headless browser scraping |
| `cheerio` | ^1.x | HTML parsing fallback |
| `axios` | ^1.x | HTTP client for API calls |
| `@anthropic-ai/sdk` | latest | Claude AI integration |
| `openai` | ^4.x | OpenAI fallback |
| `node-cron` | ^3.x | Decay cron scheduler |
| `jsonwebtoken` | ^9.x | JWT auth |
| `bcryptjs` | ^2.x | Password hashing |
| `cors` | ^2.x | CORS middleware |
| `dotenv` | ^16.x | Environment config |
| `redis` (ioredis) | ^5.x | Redis client (bonus) |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.x | UI framework |
| `react-router-dom` | ^6.x | Client-side routing |
| `socket.io-client` | ^4.x | WebSocket client |
| `axios` | ^1.x | API calls |
| `framer-motion` | ^11.x | Decay animations, mood pill glow |
| `@xyflow/react` | ^12.x | Lineage tree visualization (bonus) |
| `react-hot-toast` | ^2.x | Notifications |
| `zustand` | ^4.x | Lightweight global state |
| `date-fns` | ^3.x | Date arithmetic for decay |
| `tailwindcss` | ^3.x | Styling |

### Infrastructure
- **Database:** MongoDB Atlas (free tier) or local MongoDB
- **Redis:** Upstash Redis (free tier) or local Redis
- **AI:** Anthropic Claude claude-sonnet-4-20250514 (primary) / GPT-4o-mini (fallback)
- **Search Grounding:** Perplexity API (`llama-3.1-sonar-small-128k-online`)
- **Screenshot Storage:** Base64 in MongoDB (demo) or Cloudinary free tier (production)

---

## 6. Database Schema (MongoDB)

### Collection: `users`
```js
{
  _id: ObjectId,
  username: String,           // unique, required
  email: String,              // unique, required
  passwordHash: String,       // bcrypt
  avatarColor: String,        // hex color for cursor + UI
  curatorArchetype: {
    title: String,            // e.g. "The Chaos Archivist"
    description: String,
    dominantVibe: String,     // e.g. "Chaotic"
    vibeDistribution: {       // percentages
      Chaotic: Number,
      Educational: Number,
      Cursed: Number,
      HighSignal: Number,
      Aesthetic: Number,
      Liminal: Number
    },
    updatedAt: Date
  },
  shelves: [ObjectId],        // ref: shelves
  createdAt: Date,
  lastActiveAt: Date
}
```

### Collection: `shelves`
```js
{
  _id: ObjectId,
  name: String,               // required
  description: String,
  slug: String,               // unique URL slug
  owners: [ObjectId],         // ref: users — supports shared shelves
  isPublic: Boolean,          // default: false
  links: [ObjectId],          // ref: links
  weather: {
    state: String,            // "Stormy" | "Active" | "Foggy" | "Dead"
    activityScore: Number,    // 0-100
    lastUpdated: Date
  },
  lineage: {
    forkedFrom: ObjectId,     // ref: shelves — null if original
    forkDepth: Number,        // 0 = original
    remixCount: Number        // how many times this shelf was forked
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: `links`
```js
{
  _id: ObjectId,
  url: String,                // required, original URL
  shelfId: ObjectId,          // ref: shelves
  addedBy: ObjectId,          // ref: users
  
  // Scrape data
  scrapeStatus: String,       // "pending" | "scraping" | "ai_processing" | "complete" | "failed"
  title: String,
  metaDescription: String,
  screenshotBase64: String,   // or screenshotUrl for Cloudinary
  faviconUrl: String,
  
  // AI data
  summary: String,            // 3-sentence AI summary
  vibeType: String,           // "Chaotic" | "Educational" | "Cursed" | "HighSignal" | "Aesthetic" | "Liminal"
  vibeScore: Number,          // 0-100 confidence
  vibeReasoning: String,      // 1-sentence AI explanation
  tags: [String],             // AI-generated topic tags
  
  // Decay data
  lastClickedAt: Date,        // updated on every user click
  decayStage: Number,         // 0 (fresh) → 1 (aging) → 2 (critical) → 3 (dead)
  decayPercent: Number,       // 0-100 — drives UI desaturation + scale
  isDead: Boolean,            // moved to compost heap
  diedAt: Date,
  
  // Context grounding
  contextFeed: {
    lastFetched: Date,
    summary: String,          // AI's "what has changed" summary
    isStillRelevant: Boolean,
    successorUrl: String,     // if a better/newer resource exists
    successorTitle: String
  },
  
  // Social
  reactions: [{
    userId: ObjectId,
    emoji: String,            // "🔥" | "💀" | "👀" | "⚡" | "🌿"
    createdAt: Date
  }],
  clickCount: Number,         // total clicks across all users
  
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: `compost` (global graveyard)
```js
{
  _id: ObjectId,
  originalLinkId: ObjectId,   // ref: links (for lineage)
  url: String,
  title: String,
  summary: String,
  vibeType: String,
  screenshotBase64: String,
  diedAt: Date,
  diedFromShelfId: ObjectId,
  diedFromShelfName: String,
  addedByUsername: String,    // denormalized for display
  viewCount: Number           // how many times seen in compost heap
}
```

### Collection: `lineage` (bonus)
```js
{
  _id: ObjectId,
  originalShelfId: ObjectId,
  forkChain: [{
    shelfId: ObjectId,
    shelfName: String,
    ownerUsername: String,
    forkedAt: Date,
    linkCountAtFork: Number
  }],
  totalRemixes: Number,
  createdAt: Date
}
```

---

## 7. Feature Specifications

---

### F1: Autonomous Ingestion Pipeline (The Scraper)

**Priority:** P0 — Must ship  
**Description:** Background worker that auto-enriches every saved URL without user intervention.

#### User Flow
1. User pastes URL into shelf input and presses Enter.
2. Frontend immediately renders a "skeleton" card with status = `pending`.
3. Backend creates a `link` document (status: `pending`) and enqueues a scrape job.
4. Worker picks up the job:
   a. Launches Puppeteer, navigates to URL (15s timeout).
   b. Captures `document.title`, meta tags, OG tags, favicon URL.
   c. Takes a full-page screenshot (PNG, 1280×800).
   d. Extracts visible body text (first 3000 chars) for AI.
5. Calls Claude/OpenAI to generate summary + vibe classification (single API call).
6. Updates MongoDB document with all enriched data; status → `complete`.
7. Emits `link:enriched` Socket.io event to all shelf members.
8. Frontend card animates from skeleton → full card with screenshot, summary, mood pill.

#### Technical Spec

```
Queue: Bull (Redis-backed or in-memory)
Queue name: "link-scrape"
Concurrency: 3 workers (safe for demo)
Job retry: 2 attempts on failure
Job timeout: 30s

Puppeteer config:
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  headless: true
  viewport: { width: 1280, height: 800 }

Screenshot:
  type: 'jpeg'
  quality: 60
  fullPage: false (viewport only for speed)
  encoding: 'base64'

Fallback chain:
  1. Puppeteer (full render)
  2. Cheerio + axios (static HTML only, no screenshot)
  3. URL metadata only (title from <title> tag)
  4. Store URL + "Could not fetch content" summary

Paywall detection:
  Check for login/signup forms in DOM
  If detected: store available meta only, flag as paywall: true

404/error detection:
  HTTP status >= 400: set decayStage = 3 immediately, isDead = true
```

#### AI Call for Scraper
See Section 13 — Prompt Template #1.

---

### F2: Semantic Vibe Engine (GenAI Tagging)

**Priority:** P0 — Must ship  
**Description:** Every link is classified into one of 6 Energy Types based on AI sentiment + content analysis.

#### Energy Type Definitions

| Vibe | Color | Glow | Meaning | Example content |
|---|---|---|---|---|
| `HighSignal` | `#00FF9C` (neon green) | Strong | Dense, actionable, expert-level | Research papers, technical docs |
| `Educational` | `#4FC3F7` (sky blue) | Medium | Structured learning content | Tutorials, explainers, courses |
| `Chaotic` | `#FF6B35` (electric orange) | Pulsing | Overwhelming, disorganized, Twitter-brained | Twitter threads, Reddit rabbit holes |
| `Cursed` | `#9C27B0` (deep violet) | Dim flicker | Unsettling, weird, hard to categorize | Niche forums, bizarre Wikipedia pages |
| `Aesthetic` | `#FF80AB` (hot pink) | Soft glow | Visually-driven, design/art content | Portfolios, design inspo, photography |
| `Liminal` | `#B0BEC5` (gray-white) | Barely visible | In-between, transitional, nostalgic | Old blogs, abandoned projects, archive.org |

#### Mood Pill UI Behavior
- Pill renders as a rounded badge next to the link title.
- CSS animation: `box-shadow` pulses based on vibeScore (0-100).
- `HighSignal` pills have a `keyframes` shimmer animation.
- `Chaotic` pills have an irregular pulse (`animation-timing-function: steps(3)`).
- `Cursed` pills flicker on and off (opacity animation, 3s cycle).
- On hover: tooltip shows `vibeReasoning` (the AI's 1-sentence explanation).

#### Classification Logic
- Runs in the **same API call** as the scraper summary (single LLM call — see Prompt Template #2).
- Returns: `{ vibeType, vibeScore, vibeReasoning, tags[] }`.
- Tags are stored as searchable strings (max 5 tags per link).

---

### F3: Automated Curator Archetypes

**Priority:** P1 — Ship if time allows  
**Description:** Each user gets a dynamically computed "Curator Card" identity based on their vibe distribution.

#### Archetype Table

| Archetype | Trigger Condition | Flavor Text |
|---|---|---|
| The Chaos Archivist | >40% Chaotic | "You save first and ask questions never." |
| The Signal Hunter | >40% HighSignal | "Every link is a potential weapon of mass understanding." |
| The Librarian of Broken Things | >30% Cursed | "You have seen things the algorithm tried to bury." |
| The Aesthetic Pilgrim | >35% Aesthetic | "Your shelf is a mood board. Your mood is a manifesto." |
| The Eternal Student | >40% Educational | "You learn everything. You ship nothing. Growth." |
| The Liminal Wanderer | >30% Liminal | "You live between saves. The fog is your home." |
| The Balanced Curator | No dominant vibe | "You contain multitudes. The algorithm is confused." |

#### Card Data Structure
```js
{
  title: "The Chaos Archivist",
  description: "...",
  dominantVibe: "Chaotic",
  vibeDistribution: { Chaotic: 52, Educational: 20, ... },
  totalLinks: 87,
  totalShelves: 3,
  memberSince: "2024-01-15",
  shareUrl: "/curator/username"
}
```

#### Recomputation Trigger
- Recalculated every time a user saves a new link (async, non-blocking).
- Background job: update `user.curatorArchetype` in MongoDB.
- Frontend: display on profile page + as a shareable `/curator/:username` public page.

---

### F4: Biological Decay & Compost System

**Priority:** P0 — Must ship (core differentiator)  
**Description:** Links age and die if neglected. This is the defining mechanic of ShelfLife.

#### Decay Stages

| Stage | Trigger | Visual Effect | UI Label |
|---|---|---|---|
| 0 — Fresh | 0-13 days since last click | Full color, full size | "Fresh" |
| 1 — Aging | 14-21 days | 40% desaturated, 95% scale | "Aging" |
| 2 — Critical | 22-29 days | 80% desaturated, 88% scale, faded opacity | "Critical — act now" |
| 3 — Dead | 30+ days | Grayscale, 70% scale, strikethrough | "Dead" → moved to compost |

#### Decay Algorithm (see Section 12 for full formula)

```
decayPercent = min(100, ((daysSinceClick - 14) / 16) * 100)
  where: daysSinceClick = (now - lastClickedAt) in days
  only applied if daysSinceClick >= 14
  clamped to range [0, 100]

decayStage:
  0 if daysSinceClick < 14
  1 if 14 ≤ daysSinceClick < 22
  2 if 22 ≤ daysSinceClick < 30
  3 if daysSinceClick ≥ 30 → trigger compost
```

#### Cron Job Spec
```
Schedule: every 1 hour (node-cron: "0 * * * *")
Process:
  1. Find all links where isDead = false
  2. For each link, compute decayPercent + decayStage from lastClickedAt
  3. Bulk update MongoDB (updateMany)
  4. For newly dead links (decayStage just became 3):
     a. Set isDead = true, diedAt = now
     b. Copy to compost collection
     c. Emit socket event: link:died to shelf room
     d. Remove from shelf.links array
  5. Update shelf.weather.activityScore (see Shelf Weather spec below)
```

#### Resurrection Mechanic
- Clicking a link resets `lastClickedAt = Date.now()`.
- `decayStage` and `decayPercent` recalculate to 0 on next cron run.
- UI: clicking a grayed-out link triggers a "resurrection" animation (color floods back).

#### Compost Heap (Global Graveyard Page)
- Public page: `/compost`
- Shows all dead links across all public shelves, sorted by `diedAt` descending.
- Each entry: title, summary, vibe pill, original shelf name, date died, `screenshotBase64`.
- Anyone can click a compost link — this **does not** resurrect it (it's dead; dead stays dead).
- `viewCount` increments per view.
- Compost can be paginated (20 per page).

#### Shelf Weather System

| State | Condition | Visual | Description |
|---|---|---|---|
| Stormy ⛈ | >5 links added in last hour | Dark animated background, lightning effect | "Heavy curation session in progress" |
| Active 🌤 | 1-5 links added in last hour | Warm, bright shelf background | "Someone's on a discovery run" |
| Foggy 🌫 | 0 links in last 24h, no deaths | Muted, gray-blue tint | "Shelf abandoned — content sleeping" |
| Dead 💀 | 0 links in last 7 days | Black and white, static noise | "This shelf has not been touched in a week" |

- `activityScore` computed from: links added (last hour × 20) + clicks (last hour × 5) - deaths (× 10), clamped to [0-100].
- Shelf weather recalculated on every Socket.io connect and on cron run.
- Emitted to all shelf members via `shelf:weather:update` event.

---

### F5: Real-time Collaborative Synapse

**Priority:** P0 — Must ship  
**Description:** Live multiplayer layer on top of the shelf using Socket.io.

#### Socket.io Room Architecture
```
Room naming: shelf:{shelfId}
Each user joins their active shelf room on page load.
```

#### Events Emitted by Client → Server

| Event | Payload | Description |
|---|---|---|
| `cursor:move` | `{ x, y, userId }` | Live cursor position (throttled 50ms) |
| `link:add` | `{ url, shelfId }` | User submits a new URL |
| `link:click` | `{ linkId }` | User clicks a link (triggers resurrection) |
| `link:react` | `{ linkId, emoji }` | User sends emoji reaction |
| `shelf:join` | `{ shelfId, userId }` | User enters shelf page |
| `shelf:leave` | `{ shelfId, userId }` | User leaves shelf page |

#### Events Emitted by Server → Client

| Event | Payload | Description |
|---|---|---|
| `cursor:update` | `{ userId, x, y, username, color }` | Broadcast other user cursors |
| `link:enriched` | `{ link }` | Scraping complete, update skeleton card |
| `link:died` | `{ linkId }` | Link crossed 30-day threshold |
| `link:reacted` | `{ linkId, emoji, userId }` | Someone reacted |
| `user:joined` | `{ userId, username }` | User entered the shelf |
| `user:left` | `{ userId }` | User left the shelf |
| `shelf:weather:update` | `{ state, activityScore }` | Shelf weather changed |
| `link:decayUpdate` | `{ linkId, decayPercent, decayStage }` | Hourly decay broadcast |

#### Live Cursor Rendering
- Each online user gets a colored SVG cursor (color from `user.avatarColor`).
- Cursor renders as a small arrow with username label beneath.
- Cursors fade out with CSS transition if no movement for 3s.
- Do NOT render cursor for self.
- Performance: throttle `cursor:move` events to once per 50ms on client.

#### Emoji Reaction System
- 5 reaction types: `🔥` (fire), `💀` (dead), `👀` (watching), `⚡` (high signal), `🌿` (growing)
- Reactions float up from the link card with CSS `@keyframes floatUp` animation.
- Count displayed as badge on link card: `🔥 3`
- One reaction per user per link (subsequent clicks toggle it off).

---

### F6: Perplexity Search-Grounding

**Priority:** P1 — Ship if time allows  
**Description:** A "Context Feed" on each link that uses Perplexity's search-grounded API to check if the content is still relevant.

#### User Flow
1. User clicks a "Check Context" button on a link card.
2. Frontend shows loading spinner.
3. Backend calls Perplexity API with the link's title + topic tags.
4. Response: summary of how the topic has evolved, whether content is outdated, and a recommended successor URL if one exists.
5. Result stored in `link.contextFeed` with `lastFetched` timestamp.
6. Cache: do not re-fetch if `lastFetched` < 24 hours ago (serve from MongoDB).

#### Perplexity API Call Spec
```
Model: llama-3.1-sonar-small-128k-online
Endpoint: POST https://api.perplexity.ai/chat/completions
See Section 13 — Prompt Template #4
```

#### UI Display
- "Context Feed" panel slides out from the right of the link card.
- Shows: relevance status badge (Still Relevant / Outdated / Evolved), summary paragraph, successor link (if any).
- `lastFetched` timestamp shown: "Context last updated 3 hours ago."

---

### B1: Redis Distributed Synapse (Bonus)

**Priority:** P2 — Bonus points  
**Description:** Redis as the real-time backbone enabling multi-server Socket.io synchronization.

#### Implementation
```
1. Replace Bull's in-memory queue with Redis-backed queue.
2. Use socket.io-redis-adapter for Socket.io multi-node support.
3. Store cursor positions in Redis with TTL:
   KEY: cursor:{shelfId}:{userId}
   VALUE: { x, y, username, color }
   TTL: 5 seconds (auto-expires if user disconnects)
4. Store decay telemetry in Redis:
   KEY: decay:{linkId}
   VALUE: { decayPercent, decayStage, lastUpdated }
   TTL: 3600 (hourly cron refreshes these)
5. Shelf weather cache:
   KEY: weather:{shelfId}
   VALUE: { state, activityScore }
   TTL: 300 (5 min)
```

#### Why This Matters (for demo explanation)
> "If we had two server instances, Socket.io events would be siloed — users on Server A couldn't see cursors from users on Server B. Redis acts as the shared brain, broadcasting all events across nodes. Both Rayan and Siddh see the same shelf reality regardless of which server they're connected to."

---

### B2: Remix & Lineage Architecture (Bonus)

**Priority:** P2 — Bonus points  
**Description:** Git-style forking of public shelves with visual lineage tree.

#### Fork Flow
1. User visits a public shelf (`/shelf/:slug`).
2. Clicks "Remix This Shelf" button.
3. Backend:
   a. Creates a new shelf document with all the same links.
   b. Sets `lineage.forkedFrom = originalShelfId`.
   c. Increments `originalShelf.lineage.remixCount`.
   d. Creates/updates `lineage` collection document with new fork node.
4. User is redirected to their new forked shelf.
5. Original shelf shows: "Remixed 3 times" badge.

#### Lineage Tree Visualization
- Uses `@xyflow/react` (React Flow) to render a node graph.
- Each node: shelf name + owner + fork date + link count.
- Edges show fork relationships (parent → child).
- Original shelf node highlighted in brand color.
- Page: `/shelf/:slug/lineage`

#### Lineage Document Structure
```js
{
  originalShelfId: ObjectId,
  forkChain: [
    { shelfId, shelfName, ownerUsername, forkedAt, linkCountAtFork }
  ]
}
```

---

## 8. API Route Specifications

### Authentication
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register new user |
| `POST` | `/api/auth/login` | None | Login, returns JWT |
| `GET` | `/api/auth/me` | JWT | Get current user profile |

### Shelves
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shelves` | JWT | Create new shelf |
| `GET` | `/api/shelves` | JWT | Get all shelves for current user |
| `GET` | `/api/shelves/:id` | JWT | Get shelf with populated links |
| `PATCH` | `/api/shelves/:id` | JWT | Update shelf name/description/public |
| `DELETE` | `/api/shelves/:id` | JWT | Delete shelf |
| `POST` | `/api/shelves/:id/remix` | JWT | Fork a public shelf |
| `GET` | `/api/shelves/:id/lineage` | None | Get lineage tree data |

### Links
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/links` | JWT | Add URL to shelf (enqueues scrape job) |
| `GET` | `/api/links/:id` | JWT | Get single link with full data |
| `DELETE` | `/api/links/:id` | JWT | Delete link from shelf |
| `POST` | `/api/links/:id/click` | JWT | Register click (reset decay) |
| `POST` | `/api/links/:id/react` | JWT | Add/toggle emoji reaction |
| `GET` | `/api/links/:id/context` | JWT | Get/refresh Perplexity context feed |

### Compost
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/compost` | None | Get paginated global compost heap |
| `GET` | `/api/compost/stats` | None | Total dead, most common vibe, etc. |

### Users
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/:username` | None | Public curator card page data |
| `GET` | `/api/users/me/archetype` | JWT | Get current user archetype |

### Request / Response Examples

**POST /api/links**
```json
// Request
{
  "url": "https://example.com/article",
  "shelfId": "64abc123..."
}

// Response (immediate — before scraping)
{
  "_id": "64def456...",
  "url": "https://example.com/article",
  "scrapeStatus": "pending",
  "shelfId": "64abc123...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**POST /api/links/:id/click**
```json
// Response
{
  "success": true,
  "linkId": "64def456...",
  "lastClickedAt": "2024-01-15T10:31:00Z",
  "decayReset": true
}
```

---

## 9. Frontend Pages & Components

### Pages

| Route | Page | Auth Required |
|---|---|---|
| `/` | Landing page with "Enter the Shelf" CTA | No |
| `/login` | Login form | No |
| `/register` | Registration form | No |
| `/dashboard` | User's shelves list | Yes |
| `/shelf/:id` | Main shelf view (collaborative) | Yes (shelf members) |
| `/compost` | Global compost heap | No |
| `/curator/:username` | Public curator card | No |
| `/shelf/:id/lineage` | Lineage tree visualization | No |

### Key Components

#### `<ShelfView />` (main page)
- Renders shelf header with weather indicator
- Link input bar at top
- Grid of `<LinkCard />` components
- Live cursor overlay layer (absolute positioned, pointer-events: none)
- Online users indicator (top right: avatar circles)

#### `<LinkCard />`
- States: skeleton / processing / complete / aging / critical / dead
- Shows: screenshot thumbnail, title, domain, summary (truncated, expandable)
- Mood pill badge with animated glow
- Tags list
- Decay progress bar (fills red as decay increases)
- Reaction bar with emoji buttons + counts
- "Check Context" button (Perplexity)
- Age indicator: "Saved 18 days ago · Last clicked 16 days ago"
- Click anywhere on card = register click + open URL

#### `<MoodPill />`
- Props: `vibeType`, `vibeScore`
- Renders colored rounded badge
- CSS animation intensity driven by `vibeScore`
- Tooltip on hover: vibeReasoning

#### `<ShelfWeather />`
- Fixed widget in shelf header
- Renders emoji + state label + activity score
- Animated background: CSS keyframes for each state
- Stormy: animated gradient sweep
- Foggy: opacity pulsing blur overlay

#### `<CursorLayer />`
- Absolutely positioned, full-page, pointer-events: none
- One `<RemoteCursor />` per online user
- Each cursor: SVG arrow + username chip
- 200ms smooth CSS transition on position changes

#### `<CompostHeap />`
- Grid of "dead" link cards (grayscale)
- Tombstone icon aesthetic
- Stats bar at top: "X links composted this week · Most common cause of death: neglect"

#### `<CuratorCard />`
- Archetype title in large display font
- Vibe distribution as a horizontal bar chart (CSS only)
- Total links + shelves counts
- "Share" button that copies `/curator/:username` URL

#### `<LineageTree />` (bonus)
- `@xyflow/react` graph
- Nodes: shelf cards with owner + date
- Edges: animated dashed lines showing fork direction

---

## 10. Real-time Event Schema (Socket.io)

### Server Initialization
```js
// server/index.js
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
  adapter: createAdapter(redisClient) // bonus: Redis adapter
});

io.use(authMiddleware); // validate JWT on connection

io.on('connection', (socket) => {
  const userId = socket.data.userId;

  socket.on('shelf:join', ({ shelfId }) => {
    socket.join(`shelf:${shelfId}`);
    socket.to(`shelf:${shelfId}`).emit('user:joined', { userId, username });
  });

  socket.on('cursor:move', throttle(({ x, y, shelfId }) => {
    socket.to(`shelf:${shelfId}`).emit('cursor:update', { userId, x, y, username, color });
  }, 50));

  socket.on('link:react', async ({ linkId, emoji, shelfId }) => {
    // save to DB, then broadcast
    io.to(`shelf:${shelfId}`).emit('link:reacted', { linkId, emoji, userId });
  });

  socket.on('disconnect', () => {
    // broadcast user left to all their rooms
  });
});
```

### Emitting from Worker (after scraping)
```js
// After scrape job completes in worker:
io.to(`shelf:${link.shelfId}`).emit('link:enriched', { link: enrichedLinkData });
```

### Emitting from Cron (decay updates)
```js
// After hourly decay cron:
io.to(`shelf:${shelfId}`).emit('link:decayUpdate', { linkId, decayPercent, decayStage });
io.to(`shelf:${shelfId}`).emit('link:died', { linkId }); // if newly dead
io.to(`shelf:${shelfId}`).emit('shelf:weather:update', { state, activityScore });
```

---

## 11. Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/shelflife

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Redis (bonus — required for Bull queue in production)
REDIS_URL=redis://localhost:6379
# Or Upstash:
REDIS_HOST=your-upstash-endpoint.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password

# AI — Primary
ANTHROPIC_API_KEY=sk-ant-...

# AI — Fallback
OPENAI_API_KEY=sk-...

# Perplexity (F6)
PERPLEXITY_API_KEY=pplx-...

# Cloudinary (optional — for screenshot storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# App
MAX_LINKS_PER_SHELF=200
DECAY_CHECK_CRON=0 * * * *
SCRAPE_TIMEOUT_MS=15000
AI_TIMEOUT_MS=10000
```

---

## 12. Decay Algorithm Specification

```js
/**
 * Computes decay state for a link.
 * Called both in the cron job and on-demand for UI rendering.
 *
 * @param {Date} lastClickedAt - Last time user clicked this link
 * @param {Date} now - Current time (defaults to Date.now())
 * @returns {{ decayPercent, decayStage, isDead, daysSinceClick }}
 */
function computeDecay(lastClickedAt, now = new Date()) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysSinceClick = (now - new Date(lastClickedAt)) / MS_PER_DAY;

  let decayPercent = 0;
  let decayStage = 0;
  let isDead = false;

  if (daysSinceClick >= 14 && daysSinceClick < 22) {
    decayPercent = Math.round(((daysSinceClick - 14) / 8) * 40); // 0–40%
    decayStage = 1;
  } else if (daysSinceClick >= 22 && daysSinceClick < 30) {
    decayPercent = Math.round(40 + ((daysSinceClick - 22) / 8) * 40); // 40–80%
    decayStage = 2;
  } else if (daysSinceClick >= 30) {
    decayPercent = 100;
    decayStage = 3;
    isDead = true;
  }

  return { decayPercent, decayStage, isDead, daysSinceClick: Math.floor(daysSinceClick) };
}

/**
 * CSS values derived from decayPercent for frontend rendering
 * Apply these to the link card's wrapper element:
 */
function decayToCSS(decayPercent) {
  return {
    filter: `saturate(${100 - decayPercent}%) brightness(${100 - decayPercent * 0.3}%)`,
    transform: `scale(${1 - decayPercent * 0.003})`,
    opacity: decayPercent > 80 ? 0.5 : 1,
  };
}
```

---

## 13. AI Prompt Templates

### Prompt Template #1 + #2 — Combined Scraper + Vibe (single call)

```
System:
You are ShelfLife's curation intelligence. You analyze webpage content and return structured data. Always respond with valid JSON only. No markdown, no explanation.

User:
Analyze this webpage content and return a JSON object with the following fields:

URL: {url}
Title: {title}
Meta Description: {metaDescription}
Page Content (excerpt): {contentExcerpt}

Return this exact JSON structure:
{
  "summary": "Three sentences. Maximum 60 words total. Written for a busy researcher skimming a shelf.",
  "vibeType": "One of: HighSignal | Educational | Chaotic | Cursed | Aesthetic | Liminal",
  "vibeScore": <integer 0-100, confidence in classification>,
  "vibeReasoning": "One sentence explaining the vibe classification.",
  "tags": ["tag1", "tag2", "tag3"] // 3-5 lowercase topic tags
}

Classification guide:
- HighSignal: expert-level, dense, actionable research or technical documentation
- Educational: structured tutorials, explainers, courses, how-tos
- Chaotic: overwhelming, disorganized, rapid-fire content (social media threads, link dumps)
- Cursed: unsettling, bizarre, deeply niche, or hard to categorize
- Aesthetic: primarily visual, design/art-driven, mood/inspiration content
- Liminal: nostalgic, transitional, in-between — old blogs, archived sites, abandoned projects
```

### Prompt Template #3 — Curator Archetype

```
System:
You generate curator identity cards for a social bookmarking platform. Return valid JSON only.

User:
Generate a curator archetype for a user with this vibe distribution:
{vibeDistribution JSON}
Total links saved: {totalLinks}

Return:
{
  "title": "The [Archetype Name]",
  "description": "Two sentences, second-person voice, slightly dramatic.",
  "tagline": "One punchy sentence under 10 words."
}

Use unconventional, memorable archetype names. Avoid clichés.
```

### Prompt Template #4 — Perplexity Context Grounding

```
System:
You are a research currency analyst. Given a saved URL and its topic, determine whether the content is still relevant using your real-time web access. Return valid JSON only.

User:
A researcher saved this link {daysSaved} days ago:
URL: {url}
Title: {title}
Tags: {tags}
Original summary: {summary}

Using your web search capability, determine:
1. Has this topic significantly evolved since this was saved?
2. Is there a better/newer resource that supersedes this?
3. Is the content still relevant today?

Return:
{
  "isStillRelevant": true | false,
  "relevanceStatus": "Current | Evolved | Outdated | Superseded",
  "updateSummary": "2-3 sentences on what has changed since this was saved.",
  "successorUrl": "URL of a better/newer resource, or null",
  "successorTitle": "Title of successor resource, or null"
}
```

---

## 14. Build Order & 24-Hour Timeline

### Phase 0 — Setup (Hours 0–1)
- [ ] Initialize monorepo: `/client` (Vite + React), `/server` (Express)
- [ ] Configure MongoDB Atlas + get connection string
- [ ] Install all dependencies (both `/client` and `/server`)
- [ ] Set up `.env` files with all API keys
- [ ] Create Express server with basic health check route
- [ ] Set up Mongoose connection
- [ ] Deploy frontend shell to Vercel (or keep local for hackathon)

### Phase 1 — Core Backend (Hours 1–5)
- [ ] User model + auth routes (register, login, JWT middleware)
- [ ] Shelf model + CRUD routes
- [ ] Link model + POST route (immediate response, no scraping yet)
- [ ] Bull queue setup (or in-memory fallback)
- [ ] Puppeteer worker: scrape URL → save title + screenshot
- [ ] Claude API integration: generate summary + vibe from scraped content
- [ ] Update link document with enriched data
- [ ] Decay computation function (pure JS — no DB writes yet)
- [ ] Decay cron job (node-cron, every hour)
- [ ] Compost route (GET /api/compost)

### Phase 2 — Core Frontend (Hours 5–10)
- [ ] Auth pages (Login + Register)
- [ ] Dashboard page (shelf list + create shelf)
- [ ] Shelf page layout
- [ ] URL input bar → POST /api/links
- [ ] `<LinkCard />` skeleton state + polling for enrichment
- [ ] `<LinkCard />` complete state (screenshot, summary, mood pill)
- [ ] `<MoodPill />` with correct colors and animations
- [ ] Decay visual rendering (CSS filter from decayPercent)
- [ ] "Click to resurrect" — POST /api/links/:id/click
- [ ] Compost Heap page (`/compost`)

### Phase 3 — Real-time Layer (Hours 10–14)
- [ ] Socket.io server setup with room architecture
- [ ] Client-side Socket.io connection + shelf:join on page load
- [ ] `link:enriched` event → update card from skeleton to full
- [ ] `link:died` event → animate card out, show toast notification
- [ ] Live cursor: emit `cursor:move` + render `<CursorLayer />`
- [ ] Emoji reactions: UI + socket events
- [ ] Shelf Weather: compute + emit `shelf:weather:update`
- [ ] `<ShelfWeather />` component with animated states

### Phase 4 — Polish + Bonus (Hours 14–20)
- [ ] Curator Archetype computation + display
- [ ] `/curator/:username` public page
- [ ] Perplexity context feed (if API key available)
- [ ] Redis integration for Bull queue + Socket.io adapter (bonus)
- [ ] Remix/fork shelf flow (bonus)
- [ ] `<LineageTree />` with React Flow (bonus)
- [ ] Landing page with project pitch + live demo link

### Phase 5 — Demo Prep (Hours 20–24)
- [ ] Seed database with demo data (pre-aged links at stages 1, 2, 3)
- [ ] Test full flow: add URL → scrape → enrich → decay → compost
- [ ] Test multi-user: open two browser windows, verify cursors + reactions
- [ ] Fix top 3 visual bugs
- [ ] Record demo video (screen capture: 90-second walkthrough)
- [ ] Write README with setup instructions + feature walkthrough
- [ ] Final deployment check

---

## 15. Risk Register & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Puppeteer install fails (no Chromium on CI/demo machine) | High | Pre-install `puppeteer-core` + `@sparticuz/chromium` for serverless; test on demo machine first |
| AI API rate limits hit during demo | High | Cache all AI responses in MongoDB; never call twice for the same URL; add 1-second delay between jobs |
| Puppeteer too slow (>10s per URL) | Medium | Run 3 concurrent workers; Cheerio fallback for fast static pages; show skeleton optimistically |
| Socket.io events out of sync on reconnect | Medium | On shelf page mount, always do a full REST fetch first; use sockets only for incremental updates |
| Base64 screenshots bloating MongoDB | Medium | Compress JPEG at 60% quality; cap at 200KB; use Cloudinary if size > threshold |
| Decay cron fires during demo, killing demo links | Low | Seed demo data with `lastClickedAt = Date.now()` before demo; decay won't trigger for 14 days |
| Redis not available for Bull queue | Low | Bull works in-memory without Redis (just don't scale); remove Redis dependency for hackathon if needed |
| Perplexity API key not provisioned | Low | Feature gate the button; show "Context grounding requires Perplexity API key" toast |
| CORS issues between frontend and backend | Low | Set up `cors` middleware in Express with `origin: process.env.CLIENT_URL` on day 0 |

---

## 16. Success Metrics (Demo Checklist)

The following must be demonstrable in the final submission:

### Core (P0)
- [ ] Drop a URL → skeleton card appears immediately (< 500ms)
- [ ] After scraping: card shows real screenshot, title, AI summary, mood pill
- [ ] Mood pill color matches vibe classification (Educational = blue, Chaotic = orange, etc.)
- [ ] A pre-seeded "aging" link shows desaturated/shrunk rendering
- [ ] A pre-seeded "dead" link is visible in `/compost` page
- [ ] Clicking a link updates `lastClickedAt` and visually refreshes the card
- [ ] Shelf Weather shows a state based on activity

### Real-time (P0)
- [ ] Open shelf in two browser tabs → both cursors visible
- [ ] Add a link in Tab A → card appears in Tab B within 2 seconds
- [ ] React with emoji in Tab A → reaction appears in Tab B
- [ ] Link dies → both tabs show removal animation simultaneously

### AI Quality
- [ ] At least 3 different vibe types visible across demo links
- [ ] Summaries are accurate (judge can verify by visiting the URL)
- [ ] Curator card archetype makes sense given saved content

### Bonus (if implemented)
- [ ] Perplexity context feed shows "Evolved" status on a tech article
- [ ] Forking a shelf creates a copy with lineage reference
- [ ] Lineage tree renders as a graph with parent-child connections

---

*End of PRD — ShelfLife v1.0*  
*Built for 24-hour hackathon. Scope ruthlessly — ship P0 first, impress with P1, wow with Bonus.*
