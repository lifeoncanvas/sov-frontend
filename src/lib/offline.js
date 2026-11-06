/**
 * Offline catalogue: lets the storefront show everything a visitor browses (home page, shop, categories, product
 * pages, content pages, FAQs, testimonials) even when the backend API cannot be reached or answers with something
 * that is not this shop's data.
 *
 * The data is a copy of the public catalogue saved in src/data/catalog.json. Anything that needs the server (bag,
 * checkout, sign-in, account, enquiries) still needs the backend; those requests are never answered from here.
 */
import catalog from '../data/catalog.json';

const byOrder = (order) => {
  const pos = new Map(order.map((slug, i) => [slug, i]));
  return (a, b) => (pos.get(a.slug) ?? 1e9) - (pos.get(b.slug) ?? 1e9);
};

const SPECIAL = {
  'new-arrivals': (p) => p.newArrival,
  bestsellers: (p) => p.bestseller,
  featured: (p) => catalog.details[p.slug]?.featured,
};

/** Same rules as the backend's CatalogService.search. */
function search(params) {
  const q = (params.get('q') || '').trim().toLowerCase();
  const category = params.get('category') || 'all';
  const min = params.get('minPrice') !== null && params.get('minPrice') !== '' ? Number(params.get('minPrice')) : null;
  const max = params.get('maxPrice') !== null && params.get('maxPrice') !== '' ? Number(params.get('maxPrice')) : null;
  const inStock = params.get('inStock') === 'true';
  const personalisable = params.get('personalisable') === 'true';
  const sort = catalog.sortOrder[params.get('sort')] ? params.get('sort') : 'featured';
  const page = Math.max(Number(params.get('page')) || 0, 0);
  const size = Math.min(Math.max(Number(params.get('size')) || 12, 1), 60);

  let list = catalog.products.filter((p) => {
    if (q) {
      const d = catalog.details[p.slug] || {};
      const text = `${p.name} ${p.shortDescription || ''} ${d.description || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    if (category !== 'all') {
      const special = SPECIAL[category];
      if (special ? !special(p) : !(p.categorySlugs || []).includes(category)) return false;
    }
    if (min !== null && Number(p.price) < min) return false;
    if (max !== null && Number(p.price) > max) return false;
    if (inStock && !p.inStock) return false;
    if (personalisable && !p.personalisable) return false;
    return true;
  });
  list = [...list].sort(byOrder(catalog.sortOrder[sort]));
  const totalElements = list.length;
  return {
    content: list.slice(page * size, page * size + size),
    page,
    size,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
  };
}

function notFound(what) {
  const e = new Error(`${what} not found.`);
  e.status = 404;
  return e;
}

/**
 * Answer a public, read-only API request from the saved catalogue. Returns `undefined` for anything that is not
 * part of the public catalogue (the caller then reports the real error).
 */
export function offlineAnswer(path) {
  const url = new URL(path, 'http://offline.local');
  const p = url.pathname;
  const summaryOf = (slug) => catalog.products.find((x) => x.slug === slug);

  if (p === '/api/categories') return catalog.categories;
  if (p === '/api/products/price-range') return catalog.priceRange;
  if (p === '/api/products') return search(url.searchParams);
  if (p === '/api/content') return catalog.content;
  if (p.startsWith('/api/content/')) {
    const block = catalog.content[decodeURIComponent(p.slice('/api/content/'.length))];
    if (block === undefined) throw notFound('Content block');
    return block;
  }
  if (p === '/api/testimonials') return catalog.testimonials;
  if (p === '/api/faqs') return catalog.faqs;

  let m = p.match(/^\/api\/products\/([^/]+)\/related$/);
  if (m) {
    const limit = Math.min(Number(url.searchParams.get('limit')) || 4, 12);
    return (catalog.related[m[1]] || []).map(summaryOf).filter(Boolean).slice(0, limit);
  }
  m = p.match(/^\/api\/products\/([^/]+)\/reviews$/);
  if (m) return catalog.reviews[m[1]] || [];
  m = p.match(/^\/api\/products\/([^/]+)$/);
  if (m) {
    const d = catalog.details[decodeURIComponent(m[1])];
    if (!d) throw notFound('Product');
    return d;
  }
  return undefined;
}

/** True for the public, read-only catalogue requests that the offline copy can answer. */
export function isCatalogRequest(path) {
  try {
    return offlineAnswer(path) !== undefined;
  } catch {
    return true; // e.g. an unknown product: still a catalogue request, answered "not found"
  }
}

/**
 * True when a response from the server is this shop's data for that request. Guards against another application
 * answering at /api (for example a misconfigured server), which would otherwise show the wrong categories.
 */
export function looksLikeShopData(path, data) {
  const p = new URL(path, 'http://offline.local').pathname;
  if (p === '/api/categories') return Array.isArray(data) && data.every((c) => c && typeof c.slug === 'string');
  if (p === '/api/products') return !!data && Array.isArray(data.content);
  if (p === '/api/products/price-range') return !!data && 'min' in data && 'max' in data;
  if (p === '/api/content') return !!data && typeof data === 'object' && !Array.isArray(data);
  if (/^\/api\/products\/[^/]+$/.test(p)) return !!data && typeof data.slug === 'string';
  return true;
}
