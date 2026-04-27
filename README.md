# 🛍️ Intent-Based Smart Search — JCPenney

An AI-powered shopping search experience built for JCPenney. Instead of typing keywords, users search the way they think — *"trip to Miami"*, *"outfit for a wedding under $100"*, *"office chair for back pain"* — and the system understands the full context.

---

## 💡 What It Does

Traditional search: user types `shirts` → gets shirts.

Intent search: user types `trip to Miami` → AI infers beach destination → searches JCPenney for **sunglasses, swimwear, sandals, sunscreen, linen shirts, beach bags** — all at once.

---

## 🏗️ Architecture

```
intent-search-ui/
├── server.js          # Express backend (port 8001)
│   ├── POST /intent/parse    → Groq LLM extracts structured intent
│   └── GET  /jcp/search      → Proxies JCPenney Search API
│
└── src/
    ├── App.jsx         # Main UI — search, intent tags, product grid
    ├── groqClient.js   # API calls to backend
    └── App.css         # Styling
```

**Flow:**
```
User Query
    ↓
POST /intent/parse  (Groq llama-3.1-8b-instant)
    ↓
Structured Intent JSON
{ keywords: ["sunglasses","swimwear","sandals"...], inferred_context: "Beach destination..." }
    ↓
Parallel GET /jcp/search per keyword  (JCPenney Search API)
    ↓
Merged & deduplicated product results
    ↓
Product Grid UI
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm

### Install

```bash
cd intent-search-ui
npm install
```

### Run locally (frontend + backend together)

```bash
npm start
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:8001 |

### Run separately

```bash
# Backend only
npm run server

# Frontend only
npm run dev
```

---

## 🌐 Production Deployment

In production, Express serves the Vite build statically — **one server, one port, one deployment**.

```
browser → Express :8001
              ├── /intent/parse   (API)
              ├── /jcp/search     (API)
              └── /*              (serves React dist/)
```

### Run locally in production mode

```bash
# 1. Create .env from example
cp .env.example .env
# Fill in GROQ_API_KEY

# 2. Build + start
npm run prod
```

App runs at http://localhost:8001

---

### Deploy to Railway (recommended)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables:
   ```
   GROQ_API_KEY=your_key
   NODE_ENV=production
   PORT=8001
   ```
4. Railway auto-detects `Procfile` and runs `npm run prod`
5. Done — live URL provided automatically

---

### Deploy to Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `NODE_ENV=production node server.js`
5. Add environment variables: `GROQ_API_KEY`, `NODE_ENV=production`
6. Deploy

---

### Deploy to AWS (EC2)

```bash
# On EC2 instance
git clone <your-repo>
cd intent-search-ui
npm install

# Set env vars
export GROQ_API_KEY=your_key
export NODE_ENV=production
export PORT=80

# Build and start with PM2
npm run build
npm install -g pm2
pm2 start server.js --name intent-search
pm2 save
pm2 startup
```

---

## 🔌 API Endpoints

### `POST /intent/parse`
Parses a natural language shopping query into structured intent using Groq LLM.

**Request:**
```json
{ "query": "trip to miami under $200" }
```

**Response:**
```json
{
  "category": "beach",
  "occasion": "vacation",
  "budget": { "max": 200, "currency": "USD" },
  "keywords": ["sunglasses", "swimwear", "sandals", "sunscreen", "linen shirt"],
  "inferred_context": "Beach destination — warm, sunny, outdoor activities"
}
```

---

### `GET /jcp/search?q=sunglasses&pageSize=24&page=1`
Proxies the JCPenney Search API and returns clean product objects.

**Response:**
```json
{
  "products": [
    {
      "id": "ppr5008584232",
      "name": "St. John's Bay Polarized Sunglasses",
      "brand": "st. john's bay",
      "price": 24.99,
      "originalPrice": 48.00,
      "rating": 4.5,
      "reviews": 128,
      "image": "https://jcpenney.scene7.com/is/image/jcpenney/...",
      "url": "https://www.jcpenney.com/p/...",
      "badge": "POWER PENNEY DEAL!",
      "colors": ["Black", "Brown", "Gold"]
    }
  ],
  "total": 320,
  "totalPages": 14,
  "currentPage": 1
}
```

---

## 🧠 Intent Examples

| Query | What AI Infers |
|-------|---------------|
| `trip to Miami` | Beach → sunglasses, swimwear, sandals, sunscreen, beach bag |
| `trip to Shimla` | Cold/snow → jackets, thermals, boots, gloves |
| `office chair for back pain` | Ergonomic furniture → office chairs, standing desks |
| `outfit for wedding under $100` | Formal occasion + budget → dresses, heels, blazers |
| `gym outfit for women` | Active → yoga pants, sports bras, sneakers |

---

## 🗂️ Intent Explorer

The home screen shows pre-built intent groups covering JCPenney's full catalog:

- 👔 Men's Clothing
- 👗 Women's Clothing
- 👟 Shoes
- 🛋️ Home & Furniture
- 💍 Jewelry & Accessories
- 👶 Kids & Baby
- 🏋️ Sports & Active
- 🎁 Deals & Occasions

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 5 |
| Backend | Express 5, Node.js |
| AI / LLM | Groq API (`llama-3.1-8b-instant`) |
| Product Data | JCPenney Search API |
| Styling | Plain CSS (dark theme) |

---

## 📁 Project Structure

```
intent-search-ui/
├── server.js           # Express backend
├── src/
│   ├── main.jsx        # React entry point
│   ├── App.jsx         # Main app component
│   ├── App.css         # Styles
│   └── groqClient.js   # Backend API calls
├── public/
├── package.json
└── vite.config.js
```

---

## 👤 Author

**Gautham Shetty**  
Frontend / UI Engineering — Catalyst Brands  
Team: TOF Team
