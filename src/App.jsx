import { useState } from "react";
import { parseIntent, searchJCP } from "./groqClient";
import "./App.css";

const INTENT_GROUPS = [
  {
    label: "👔 Men's Clothing",
    items: ["dress shirts for men", "men's jeans under $40", "men's suits for wedding", "casual polo shirts", "men's joggers", "men's hoodies"],
  },
  {
    label: "👗 Women's Clothing",
    items: ["women's dresses for party", "women's jeans under $50", "floral blouses for spring", "women's activewear", "plus size dresses", "women's cardigans"],
  },
  {
    label: "👟 Shoes",
    items: ["women's heels for wedding", "men's dress shoes under $80", "sneakers for men", "women's sandals for summer", "kids' sneakers", "boots for women"],
  },
  {
    label: "🛋️ Home & Furniture",
    items: ["bedding sets under $60", "curtains for living room", "throw pillows", "area rugs under $100", "kitchen towels", "comforter sets"],
  },
  {
    label: "💍 Jewelry & Accessories",
    items: ["gold earrings under $50", "women's handbags", "men's watches under $100", "necklaces for women", "sunglasses for summer", "scarves for winter"],
  },
  {
    label: "👶 Kids & Baby",
    items: ["boys' school uniforms", "girls' dresses for party", "baby onesies", "kids' pajamas", "toddler shoes", "boys' jeans"],
  },
  {
    label: "🏋️ Sports & Active",
    items: ["women's yoga pants", "men's running shoes", "sports bras", "men's gym shorts", "athletic jackets", "workout tops for women"],
  },
  {
    label: "🎁 Deals & Occasions",
    items: ["gifts under $25", "wedding guest outfits", "back to school clothes", "holiday dresses", "Mother's Day gifts", "clearance tops under $15"],
  },
];

const TAG_ICONS = {
  category: "🏷️", color: "🎨", occasion: "📍", vibe: "✨",
  gender: "👤", budget: "💰", keywords: "🔍",
};

function IntentTag({ label, value }) {
  return (
    <span className="intent-tag">
      <span className="tag-icon">{TAG_ICONS[label] || "•"}</span>
      <span className="tag-label">{label}</span>
      <span className="tag-value">{value}</span>
    </span>
  );
}

function ProductCard({ product }) {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <a className="product-card" href={product.url} target="_blank" rel="noreferrer">
      <div className="product-img-wrap">
        {product.image
          ? <img src={product.image} alt={product.name} loading="lazy" />
          : <div className="img-placeholder">No Image</div>
        }
        {discount >= 10 && <span className="discount-badge">-{discount}%</span>}
        {product.badge && <span className="product-badge">{product.badge}</span>}
      </div>
      <div className="product-info">
        {product.brand && <p className="product-brand">{product.brand}</p>}
        <p className="product-name">{product.name}</p>
        <div className="product-pricing">
          <span className="product-price">${product.price?.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="product-original">${product.originalPrice?.toFixed(2)}</span>
          )}
        </div>
        {product.rating && (
          <div className="product-meta">
            <span className="product-rating">★ {product.rating}</span>
            <span className="product-reviews">({product.reviews})</span>
          </div>
        )}
        {product.colors?.length > 0 && (
          <p className="product-colors">{product.colors.length} color{product.colors.length > 1 ? "s" : ""}</p>
        )}
      </div>
    </a>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [lastSearchTerm, setLastSearchTerm] = useState("");

  async function runSearch(searchTerm, page = 1) {
    setLoading(true);
    setError(null);
    try {
      const data = await searchJCP(searchTerm, page);
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
      setLastSearchTerm(searchTerm);
    } catch (e) {
      setError("Failed to fetch products. Is the backend running?");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(q = query) {
    if (!q.trim()) return;
    setSearched(true);
    setCurrentPage(1);
    setIntent(null);
    setLoading(true);
    setError(null);

    try {
      const parsed = await parseIntent(q);
      setIntent(parsed);

      const keywords = parsed.keywords || [];

      if (keywords.length > 1) {
        const results = await Promise.allSettled(
          keywords.slice(0, 6).map(kw => searchJCP(kw, 1))
        );

        const seen = new Set();
        const merged = [];
        for (const r of results) {
          if (r.status === 'fulfilled') {
            for (const p of (r.value.products || [])) {
              if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
            }
          }
        }

        setProducts(merged);
        setTotal(merged.length);
        setTotalPages(1);
        setCurrentPage(1);
        setLastSearchTerm(keywords[0]);
      } else {
        const searchTerm = keywords[0] || parsed.category || q;
        await runSearch(searchTerm, 1);
      }
    } catch (e) {
      setError("Could not parse intent. Searching directly.");
      await runSearch(q, 1);
    } finally {
      setLoading(false);
    }
  }

  async function handlePageChange(page) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await runSearch(lastSearchTerm, page);
  }

  function handleSuggestion(s) {
    setQuery(s);
    handleSearch(s);
  }

  function handleReset() {
    setQuery("");
    setIntent(null);
    setProducts([]);
    setSearched(false);
    setError(null);
    setTotal(0);
    setCurrentPage(1);
  }

  function renderIntentTags() {
    if (!intent) return null;
    const tags = [];
    if (intent.category) tags.push(<IntentTag key="category" label="category" value={intent.category} />);
    if (intent.color) tags.push(<IntentTag key="color" label="color" value={intent.color} />);
    if (intent.occasion) tags.push(<IntentTag key="occasion" label="occasion" value={intent.occasion} />);
    if (intent.vibe) tags.push(<IntentTag key="vibe" label="vibe" value={intent.vibe} />);
    if (intent.gender) tags.push(<IntentTag key="gender" label="gender" value={intent.gender} />);
    if (intent.budget) tags.push(<IntentTag key="budget" label="budget" value={`under ${intent.budget.currency === "USD" ? "$" : ""}${intent.budget.max}`} />);
    if (intent.keywords?.length) tags.push(<IntentTag key="keywords" label="searching" value={intent.keywords.slice(0, 4).join(", ")} />);
    return tags;
  }

  const pageNumbers = () => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-badge">✦ JCPenney AI Search</div>
        <h1>Intent Search</h1>
        <p className="hero-sub">Search the way you think — not the way machines expect</p>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Try: black dress for wedding under $80, men's shirts for office"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={loading}
          />
          {query && <button className="clear-btn" onClick={handleReset}>✕</button>}
          <button className="search-btn" onClick={() => handleSearch()} disabled={loading || !query.trim()}>
            {loading ? <span className="spinner" /> : "Search"}
          </button>
        </div>

        {!searched && (
          <div className="intent-explorer">
            <p className="explorer-label">✦ Browse by intent</p>
            <div className="intent-groups">
              {INTENT_GROUPS.map((group) => (
                <div key={group.label} className="intent-group">
                  <div className="group-label">{group.label}</div>
                  <div className="group-chips">
                    {group.items.map((s) => (
                      <button key={s} className="suggestion-chip" onClick={() => handleSuggestion(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {error && <div className="error-banner">{error}</div>}

      {intent && (
        <section className="intent-section">
          <div className="intent-header">
            <span className="intent-label">🧠 Understood your intent</span>
            <span className="result-count">{total.toLocaleString()} results</span>
          </div>
          {intent.inferred_context && (
            <div className="inferred-context">💡 {intent.inferred_context}</div>
          )}
          <div className="intent-tags">{renderIntentTags()}</div>
        </section>
      )}

      {searched && !loading && products.length === 0 && !error && (
        <div className="no-results">
          <p>😕 No products found.</p>
          <button className="reset-btn" onClick={handleReset}>Back to Browse</button>
        </div>
      )}

      {products.length > 0 && (
        <>
          <main className="product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </main>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>‹</button>
              {pageNumbers().map(n => (
                <button key={n} className={`page-btn ${n === currentPage ? "active" : ""}`} onClick={() => handlePageChange(n)}>{n}</button>
              ))}
              <button className="page-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
