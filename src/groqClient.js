const RAG_API = 'http://localhost:8001';

export async function parseIntent(query) {
  const res = await fetch(`${RAG_API}/intent/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

export async function searchJCP(searchTerm, page = 1) {
  const res = await fetch(
    `${RAG_API}/jcp/search?q=${encodeURIComponent(searchTerm)}&pageSize=24&page=${page}`
  );
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}
