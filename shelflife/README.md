# ShelfLife: The Resurrection of the Living Archive

ShelfLife is a social, AI-augmented link curation engine that treats your bookmark collection as a living organism.

## 🚀 How to Run the App (Local Dev)

You will need **two terminal windows** (or two tabs in VS Code). 

### 1. Start the Backend Server (Terminal 1)
Open a new terminal and run:
```bash
cd d:\mergeinfinity_se_hack\shelflife\server
node index.js
```
*You should see "MongoDB connected" and "Server running on port 5000".*

### 2. Start the Frontend App (Terminal 2)
Open a second terminal window and run:
```bash
cd d:\mergeinfinity_se_hack\shelflife\client
npm run dev
```
*You should see Vite exposing a local link, typically `http://localhost:5173`. Click that link to open the app!*

---

## 🛠 Features

1. **Autonomous AI Crawler**: Drop a link, we fetch the title, site screenshot, Perplexity AI-generated summary, and Vibe tag automatically. 
2. **Biological Decay**: Links progressively fade into grayscale (Aging -> Critical -> Dead) via an hourly cron engine if you neglect them. Dead links drop into the global `/compost` graveyard.
3. **Multiplayer Cursors**: View live SVGs of users currently browsing the same archive shelf.

**Note on Redis:** By default, Bull Queue falls back to an in-memory queue. Ensure your MongoDB Atlas URI and JWT_SECRET are configured. For AI features, set either `PERPLEXITY_API_KEY` or `GEMINI_API_KEY` in `server/.env`.
