/**
 * Pictures for the storefront's content sections (hero, about, occasions, gift boxes, Instagram grid,
 * corporate / personalised / bulk banners). Like product pictures, they live in the frontend: image URLs in
 * the database's site-content blocks are ignored.
 *
 * To replace one, drop a file into src/assets/site/ named after its key, e.g. hero.jpg, about-2.jpg,
 * occasion-weddings.jpg, gift-box-the-wedding-box.jpg, instagram-3.jpg, corporate.jpg. A file there always
 * wins; otherwise the section reuses the matching product or category photo below.
 */
import { DEFAULT_IMAGE, categoryImage, productImage, productImages, slugify } from './images';

const files = import.meta.glob('../assets/site/*.{png,jpg,jpeg,webp,avif,svg}', { eager: true, query: '?url', import: 'default' });
const SITE = new Map(Object.entries(files).map(([path, url]) => [path.split('/').pop().replace(/\.[^.]+$/, ''), url]));

const keepsakeBox = productImages('the-signature-keepsake-box');

const DEFAULTS = {
  hero: keepsakeBox[0],
  about: keepsakeBox[1],
  'about-2': productImage('hand-thrown-keepsake-cups'),
  'about-3': productImage('personalised-soy-candle'),
  'occasion-weddings': categoryImage('wedding-souvenirs'),
  'occasion-birthdays': categoryImage('birthday-gifts'),
  'occasion-anniversaries': productImages('monogrammed-ring-dish')[1],
  'occasion-christenings': productImage('pressed-bloom-keepsake-frame'),
  'occasion-graduations': productImage('linen-notebook-pen-set'),
  'gift-box-the-signature-box': keepsakeBox[0],
  'gift-box-the-celebration-box': categoryImage('gift-boxes'),
  'gift-box-the-wedding-box': productImage('monogrammed-ring-dish'),
  'gift-box-the-corporate-box': productImage('leather-travel-pouch'),
  'gift-box-the-luxury-box': productImage('initial-pendant-necklace'),
  'instagram-1': productImage('personalised-soy-candle'),
  'instagram-2': productImage('hand-thrown-keepsake-cups'),
  'instagram-3': productImage('initial-pendant-necklace'),
  'instagram-4': keepsakeBox[1],
  'instagram-5': productImage('artisan-chocolate-favour-box'),
  'instagram-6': 'occasion-celebrations',
  'instagram-7': productImage('canvas-event-tote'),
  'instagram-8': productImage('pressed-bloom-keepsake-frame'),
  corporate: 'occasion-corporate-events',
  personalised: productImage('linen-notebook-pen-set'),
  bulk: 'occasion-celebrations',
};

/** Picture for a content-section key (see the file comment). Never empty. */
export function siteImage(key) {
  if (SITE.has(key)) return SITE.get(key);
  const d = DEFAULTS[key];
  if (d && SITE.has(d)) return SITE.get(d); // points at another file in assets/site
  return d || DEFAULT_IMAGE;
}

export const occasionImage = (slug) => siteImage(`occasion-${slug}`);
export const giftBoxImage = (title) => siteImage(`gift-box-${slugify(title)}`);
export const instagramImages = (count = 8) => Array.from({ length: count }, (_, i) => siteImage(`instagram-${i + 1}`));
