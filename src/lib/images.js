/**
 * Product and category pictures live in the frontend, not in the database.
 *
 *   src/assets/products/<product-slug>.<svg|png|jpg|jpeg|webp|avif>      main picture
 *   src/assets/products/<product-slug>--2.<ext>, --3 ...                 extra gallery pictures
 *   src/assets/categories/<category-slug>.<ext>
 *
 * Vite bundles every file in those folders, so a fresh clone shows the same pictures with no backend
 * uploads folder and no image URLs in the database. To add or change a picture, drop a file named after
 * the product's URL slug into the folder; image URLs stored by the backend are ignored by the storefront.
 */

const productFiles = import.meta.glob('../assets/products/*.{svg,png,jpg,jpeg,webp,avif}', { eager: true, query: '?url', import: 'default' });
const categoryFiles = import.meta.glob('../assets/categories/*.{svg,png,jpg,jpeg,webp,avif}', { eager: true, query: '?url', import: 'default' });

/** slug -> [main, extra...] in order. */
function index(files) {
  const map = new Map();
  for (const [path, url] of Object.entries(files)) {
    const file = path.split('/').pop();
    const name = file.replace(/\.[^.]+$/, '');
    const m = name.match(/^(.*)--(\d+)$/);
    const slug = m ? m[1] : name;
    const order = m ? Number(m[2]) : 1;
    const isSvg = /\.svg$/i.test(file);
    if (!map.has(slug)) map.set(slug, new Map());
    const byOrder = map.get(slug);
    // A photo beats the placeholder SVG drawing with the same name.
    const current = byOrder.get(order);
    if (!current || (current.isSvg && !isSvg)) byOrder.set(order, { url, isSvg });
  }
  const out = new Map();
  map.forEach((byOrder, slug) => out.set(slug, [...byOrder.keys()].sort((a, b) => a - b).map((k) => byOrder.get(k).url)));
  return out;
}

const PRODUCTS = index(productFiles);
const CATEGORIES = index(categoryFiles);
export const DEFAULT_IMAGE = PRODUCTS.get('default')?.[0] || '';

/** Same rule the backend uses for slugs, so an order line can be matched by its product name. */
export function slugify(text) {
  return String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** All pictures for a product (never empty). Pass the slug, or the product name when no slug is known. */
export function productImages(slugOrName) {
  return PRODUCTS.get(slugOrName) || PRODUCTS.get(slugify(slugOrName)) || [DEFAULT_IMAGE];
}

export function productImage(slugOrName) {
  return productImages(slugOrName)[0];
}

export function categoryImage(slug) {
  return CATEGORIES.get(slug)?.[0] || DEFAULT_IMAGE;
}

// Older call sites pass (url, slug); the database URL is deliberately ignored.
export const getProductFallback = (slug) => productImage(slug);
export const getCategoryFallback = (slug) => categoryImage(slug);
export const resolveProductImage = (_url, slug) => productImage(slug);
export const resolveCategoryImage = (_url, slug) => categoryImage(slug);
