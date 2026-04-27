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

// Real JCPenney category taxonomy
const JCP_CATEGORIES = {
  "Women's Clothing":  ["t-shirts","blouses","tunic tops","tank tops","camisoles","crop top","pullover sweaters","cardigans","sweatshirts","hoodies","fit + flare dresses","a-line dresses","maxi dresses","sheath dresses","wrap dresses","sundresses","bodycon dresses","shirt dresses","swing dresses","party dresses","evening gowns","ball gowns","straight leg jeans","skinny jeans","bootcut jeans","flare jeans","boyfriend jeans","cropped jeans","jeggings","pull-on pants","cargo pants","palazzo pants","trousers","capri pants","jogger pants","leggings","yoga pants","a-line skirts","maxi skirts","pencil skirts","blazers","denim jackets","bomber jackets","trench coats","full coverage bras","sports bras","bralettes","pajama sets","robes","nightgowns","one piece swimsuits","bikini","tankinis","rompers","jumpsuits"],
  "Men's Clothing":    ["dress shirts","button-down shirts","polo shirts","graphic t-shirts","t-shirts","henley shirts","flannel shirts","pullover sweaters","cardigans","quarter-zip pullover","sweatshirts","hoodies","straight leg jeans","slim fit jeans","relaxed fit jeans","cargo pants","flat front pants","trousers","chino shorts","cargo shorts","swim shorts","suit jackets","suit pants","blazers","sport coats","suit sets","tuxedos","denim jackets","bomber jackets","fleece jackets","boxer briefs","pajama sets","track suits","jogger pants","workout shorts"],
  "Kids & Baby":       ["graphic t-shirts","t-shirts","hoodies","sweatshirts","pajama sets","kids pajama sets","one piece pajamas","dresses","leggings","jeans","shorts","pants","layette sets","bibs","footed pajamas","romper sets","sneakers","baby booties"],
  "Shoes":             ["sneakers","running shoes","slip-on shoes","loafers","oxford shoes","boat shoes","work shoes","ballet flats","clogs","heeled sandals","flat sandals","wedge sandals","slide sandals","flip-flops","dress boots","ankle boots","chelsea boots","cowboy boots","winter boots","combat boots","booties","pumps","mules"],
  "Home & Bedding":    ["comforter sets","sheet sets","duvet cover sets","quilt sets","bed pillows","throw pillows","blankets","throws","coverlets","curtain panels","valances","area rugs","accent rugs","runners","bath towel sets","bath towels","hand towels","shower curtains","kitchen towels","placemats","tablecloths"],
  "Furniture":         ["accent chairs","recliners","ottomans","benches","accent tables","nightstands","desks","dining chairs","dining tables","bar stools","bookcases","headboards","beds","office chairs","kitchen islands"],
  "Jewelry & Accessories": ["drop earrings","hoop earrings","collar necklaces","bracelet watches","strap watches","crossbody bags","evening bags","backpacks","wallets","clutches","belts","scarves","gloves","sunglasses","bow ties","ties","cufflinks"],
  "Sports & Active":   ["sports bras","yoga pants","workout pants","workout shorts","running shoes","sneakers","athletic jackets","compression socks","swim shirts","rash guards","track suits","basketball shorts","golf shorts","bike shorts"],
  "Kitchen & Dining":  ["cookware sets","skillets","frying pans","sauce pans","dutch ovens","bakeware sets","knife sets","dinnerware sets","coffee mugs","tumblers","water bottles","air fryers","slow cookers","stand mixers","blenders","toasters","cutting boards","pot holders"],
};

const ALL_JCP_TERMS = Object.values(JCP_CATEGORIES).flat();

// ── INTENT PARSER ─────────────────────────────────────────────────────────────
app.post('/intent/parse', async (req, res) => {
  try {
    const { query } = req.body;
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 300,
      messages: [{
        role: 'system',
        content: `You are a JSON-only intent parser for JCPenney (clothing, shoes, home, jewelry, kids, sports, kitchen).
JCPenney does NOT sell electronics, TVs, laptops, phones, or appliances beyond kitchen items.

Rules:
1. Return ONLY a raw JSON object. No markdown, no explanation, no extra text.
2. Pick keywords ONLY from this JCPenney product list: ${ALL_JCP_TERMS.join(', ')}
3. If the query is for something JCPenney does not sell (TV, laptop, phone, car, etc), return keywords as empty array [].
4. keywords must be 3-6 items from the list above.

Context mappings:
- beach/Goa/Miami → sunglasses, swim shorts, bikini, flat sandals, sundresses
- winter/snow/Shimla → winter boots, pullover sweaters, fleece jackets, trench coats
- rainy/monsoon → trench coats, hoodies, pullover sweaters, cardigans
- office/interview → dress shirts, blazers, trousers, oxford shoes
- party/wedding → party dresses, evening gowns, heeled sandals, suit jackets
- gym/workout → sports bras, yoga pants, running shoes, workout shorts
- baby/newborn → layette sets, footed pajamas, bibs, baby booties
- bedroom/sleep → comforter sets, sheet sets, bed pillows, throw pillows
- kitchen/cooking → cookware sets, air fryers, knife sets, dinnerware sets

JSON format (return exactly this structure):
{"category":"","color":"","occasion":"","budget":{"max":0,"currency":"USD"},"gender":"","keywords":[],"inferred_context":""}`
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
  app.get('/{*path}', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`🛍  Intent Search running on http://localhost:${PORT}`));
