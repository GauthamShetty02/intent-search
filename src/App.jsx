import { useState } from "react";
import { parseIntent, searchJCP } from "./groqClient";
import "./App.css";

const INTENT_GROUPS = [
  { label: "👔 Men's Clothing",       items: ["dress shirts for men", "men's suits for wedding", "casual polo shirts", "men's joggers", "men's hoodies", "men's jeans"] },
  { label: "👗 Women's Clothing",     items: ["women's dresses for party", "floral blouses for spring", "women's activewear", "plus size dresses", "women's cardigans", "women's jeans"] },
  { label: "👟 Shoes",                items: ["women's heels for wedding", "men's dress shoes", "sneakers for men", "women's sandals for summer", "kids sneakers", "boots for women"] },
  { label: "🛋️ Home & Furniture",    items: ["bedding sets", "curtains for living room", "throw pillows", "area rugs", "kitchen towels", "comforter sets"] },
  { label: "💍 Jewelry & Accessories",items: ["gold earrings", "women's handbags", "men's watches", "necklaces for women", "sunglasses for summer", "scarves for winter"] },
  { label: "👶 Kids & Baby",          items: ["boys school uniforms", "girls dresses for party", "baby onesies", "kids pajamas", "toddler shoes", "boys jeans"] },
  { label: "🏋️ Sports & Active",     items: ["women's yoga pants", "men's running shoes", "sports bras", "men's gym shorts", "athletic jackets", "workout tops"] },
  { label: "🎁 Deals & Occasions",    items: ["gifts under $25", "wedding guest outfits", "back to school clothes", "holiday dresses", "clearance tops"] },
];

const TAG_ICONS = { category: "🏷️", color: "🎨", occasion: "📍", gender: "👤", budget: "💰" };

function IntentTag({ label, value }) {
  if (!value) return null;
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
          : <div className="img-placeholder">No Image</div>}
        {discount >= 10 && <span className="discount-badge">-{discount}%</span>}
        {product.badge && <span className="product-badge">{product.badge}</span>}
      </div>
      <div className="product-info">
        {product.brand && <p className="product-brand">{product.brand}</p>}
        <p className="product-name">{product.name}</p>
        <div className="product-pricing">
          <span className="product-price">${product.price?.toFixed(2)}</span>
          {product.originalPrice && <span className="product-original">${product.originalPrice?.toFixed(2)}</span>}
        </div>
        {product.rating && (
          <div className="product-meta">
            <span className="product-rating">★ {product.rating}</span>
            <span className="product-reviews">({product.reviews})</span>
          </div>
        )}
        {product.colors?.length > 0 && <p className="product-colors">{product.colors.length} color{product.colors.length > 1 ? "s" : ""}</p>}
      </div>
    </a>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState(null);
  const [activeKeyword, setActiveKeyword] = useState(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [intentLoading, setIntentLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  // Step 1 — parse intent only, show keyword tabs
  async function handleSearch(q = query) {
    if (!q.trim()) return;
    setSearched(true);
    setIntent(null);
    setActiveKeyword(null);
    setProducts([]);
    setError(null);
    setIntentLoading(true);
    try {
      const parsed = await parseIntent(q);
      setIntent(parsed);
      if (parsed.keywords?.length) {
        await fetchKeyword(parsed.keywords[0]);
      }
      // if keywords empty, UI will show not-available message
    } catch (e) {
      // Intent parse failed entirely — still try a direct search
      setIntent({ inferred_context: null, keywords: [q] });
      await fetchKeyword(q);
    } finally {
      setIntentLoading(false);
    }
  }

  // Step 2 — fetch products for selected keyword tab
  async function fetchKeyword(kw, page = 1) {
    setActiveKeyword(kw);
    setProductsLoading(true);
    setProducts([]);
    setError(null);
    try {
      const data = await searchJCP(kw, page);
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      setError("Failed to fetch products.");
    } finally {
      setProductsLoading(false);
    }
  }

  async function handlePageChange(page) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    await fetchKeyword(activeKeyword, page);
  }

  function handleSuggestion(s) {
    setQuery(s);
    handleSearch(s);
  }

  function handleReset() {
    setQuery(""); setIntent(null); setActiveKeyword(null);
    setProducts([]); setSearched(false); setError(null);
    setTotal(0); setCurrentPage(1);
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
            placeholder="Try: trip to Goa in rainy season, wedding outfit under $100..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={intentLoading}
          />
          {query && <button className="clear-btn" onClick={handleReset}>✕</button>}
          <button className="search-btn" onClick={() => handleSearch()} disabled={intentLoading || !query.trim()}>
            {intentLoading ? <span className="spinner" /> : "Search"}
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
                      <button key={s} className="suggestion-chip" onClick={() => handleSuggestion(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {error && <div className="error-banner">{error}</div>}

      {/* Intent section with keyword tabs */}
      {intent && (
        <section className="intent-section">
          <div className="intent-header">
            <span className="intent-label">🧠 Understood your intent</span>
            {total > 0 && <span className="result-count">{total.toLocaleString()} results for "{activeKeyword}"</span>}
          </div>

          {intent.inferred_context && (
            <div className="inferred-context">💡 {intent.inferred_context}</div>
          )}

          {/* Intent meta tags */}
          <div className="intent-tags">
            <IntentTag label="category" value={intent.category} />
            <IntentTag label="occasion" value={intent.occasion} />
            <IntentTag label="gender"   value={intent.gender} />
            <IntentTag label="color"    value={intent.color} />
            {intent.budget?.max > 0 && (
              <IntentTag label="budget" value={`under $${intent.budget.max}`} />
            )}
          </div>

          {/* Keyword tabs */}
          {intent.keywords?.length > 0 && (
            <div className="keyword-tabs-wrap">
              <p className="keyword-tabs-label">Select a category to explore:</p>
              <div className="keyword-tabs">
                {intent.keywords.map((kw) => (
                  <button
                    key={kw}
                    className={`keyword-tab ${activeKeyword === kw ? "active" : ""}`}
                    onClick={() => fetchKeyword(kw)}
                    disabled={productsLoading}
                  >
                    {activeKeyword === kw && productsLoading
                      ? <span className="spinner-sm" />
                      : null}
                    {kw}
                    {activeKeyword === kw && !productsLoading && total > 0 && (
                      <span className="tab-count">{total.toLocaleString()}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Products loading skeleton */}
      {productsLoading && (
        <div className="product-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="product-card skeleton">
              <div className="skeleton-img" />
              <div className="skeleton-info">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!productsLoading && searched && products.length === 0 && !error && intent && (
        <div className="no-results">
          {intent.keywords?.length === 0
            ? <>
                <p>🚫 This item is not available at JCPenney.</p>
                <p className="no-results-hint">JCPenney sells clothing, shoes, home, jewelry, kids & kitchen items.</p>
              </>
            : <>
                <p>😕 No products found for "{activeKeyword}".</p>
                <p className="no-results-hint">Try selecting a different category above.</p>
              </>
          }
        </div>
      )}

      {!productsLoading && products.length > 0 && (
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
