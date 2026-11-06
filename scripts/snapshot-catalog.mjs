// Saves a read-only copy of the public catalogue from a running backend into src/data/catalog.json, which the
// storefront uses when the API can't be reached (see src/lib/offline.js).
// Usage: npm run snapshot                (backend at http://localhost:8090)
//        node scripts/snapshot-catalog.mjs <backend-url> <output.json>
import { writeFileSync } from 'node:fs';

const [base = 'http://localhost:8090', out = 'src/data/catalog.json'] = process.argv.slice(2);
const get = async (path) => {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
};

const SORTS = ['featured', 'popular', 'newest', 'price-asc', 'price-desc', 'name'];

const all = await get('/api/products?category=all&page=0&size=60');
const products = all.content;
const details = {};
const related = {};
const reviews = {};
for (const p of products) {
  details[p.slug] = await get(`/api/products/${p.slug}`);
  related[p.slug] = (await get(`/api/products/${p.slug}/related?limit=12`)).map((r) => r.slug);
  reviews[p.slug] = await get(`/api/products/${p.slug}/reviews`);
}
const sortOrder = {};
for (const s of SORTS) {
  sortOrder[s] = (await get(`/api/products?category=all&sort=${s}&page=0&size=60`)).content.map((p) => p.slug);
}

const snapshot = {
  note: 'Offline copy of the public catalogue, used by src/lib/offline.js when the API cannot be reached. '
    + 'Regenerate after changing products in the admin (see README, "Offline catalogue").',
  savedAt: new Date().toISOString(),
  categories: await get('/api/categories'),
  priceRange: await get('/api/products/price-range'),
  products,
  details,
  related,
  reviews,
  sortOrder,
  content: await get('/api/content'),
  testimonials: await get('/api/testimonials'),
  faqs: await get('/api/faqs'),
};
// Pictures come from src/assets, not from the database: drop external image links so none are shipped.
let dropped = 0;
const strip = (v) => {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = strip(v[k]); return v; }
  if (typeof v === 'string' && /^https?:\/\/images\.unsplash\.com/.test(v)) { dropped++; return null; }
  return v;
};
strip(snapshot);
writeFileSync(out, JSON.stringify(snapshot, null, 1) + '\n');
if (dropped) console.log(`dropped ${dropped} external image links`);
console.log(`saved ${products.length} products, ${snapshot.categories.length} categories, `
  + `${snapshot.testimonials.length} testimonials, ${snapshot.faqs.length} faqs, `
  + `${Object.keys(snapshot.content).length} content blocks -> ${out}`);
