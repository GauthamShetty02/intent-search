import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── INTENT PARSER ─────────────────────────────────────────────────────────────
app.post('/intent/parse', async (req, res) => {
  try {
    const { query } = req.body;
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 256,
      messages: [{
        role: 'system',
        content: `You are a smart shopping intent parser with deep contextual reasoning.

You must infer hidden intent from context clues:
- Destinations → infer climate/activity: "Goa", "Miami", "Maldives" = beach trip → sunglasses, swimwear, sandals, sunscreen, linen
- "Shimla", "Manali", "Alps" = cold/snow trip → jackets, thermals, boots, gloves
- "office", "interview", "meeting" = formal → blazer, trousers, formal shoes
- "party", "club", "wedding" = dressy → evening wear, heels, accessories
- "gym", "trek", "hiking" = active → sportswear, sneakers, backpack
- Seasons: "summer" = light fabrics, "monsoon" = waterproof, "winter" = warm layers
- Vague intent like "trip to Goa" should expand to ALL relevant beach categories

Return ONLY valid JSON (no markdown, no explanation):
{
  "category": string,
  "color": string,
  "occasion": string,
  "budget": { "max": number, "currency": string },
  "vibe": string,
  "gender": string,
  "keywords": string[],
  "inferred_context": string
}

"keywords" must include ALL inferred product types (e.g. ["sunglasses", "swimwear", "sandals", "linen shirt", "beach bag"])
"inferred_context" should be a short human-readable explanation like "Beach destination — warm, sunny, outdoor activities"`
      }, {
        role: 'user',
        content: query
      }]
    });
    const text = completion.choices[0].message.content.trim();
    res.json(JSON.parse(text));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── JCPENNEY SEARCH PROXY ─────────────────────────────────────────────────────
app.get('/jcp/search', async (req, res) => {
  try {
    const { q = '', pageSize = 24, page = 1 } = req.query;
    const url = `https://search-api.jcpenney.com/v1/search-service/s?productGridView=medium&searchTerm=${encodeURIComponent(q)}&responseType=organic&pageSize=${pageSize}&pageNum=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    const zone = data.organicZoneInfo || {};
    const raw = zone.products || [];

    const products = raw.map(p => ({
      id: p.ppId,
      name: p.name,
      brand: p.brand,
      price: p.currentMin,
      originalPrice: p.originalMin !== p.currentMin ? p.originalMin : null,
      priceType: p.priceType,
      rating: p.averageRating ? parseFloat(p.averageRating.toFixed(1)) : null,
      reviews: p.reviewCount || 0,
      image: p.imagesInfo?.thumbnailImageId
        ? `https://jcpenney.scene7.com/is/image/jcpenney/${p.imagesInfo.thumbnailImageId}?wid=400&hei=400&op_sharpen=1`
        : null,
      url: `https://www.jcpenney.com${p.pdpUrl}`,
      badge: p.marketingLabel || null,
      colors: (p.skuSwatch || []).map(s => s.colorName),
    }));

    res.json({
      products,
      total: zone.totalNumRecs || 0,
      totalPages: zone.totalPages || 1,
      currentPage: zone.currentPage || 1,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Catch-all: serve React app for any non-API route
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`🛍  Intent Search running on http://localhost:${PORT}`));
