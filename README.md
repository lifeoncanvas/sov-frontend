# LICHT Signature Souvenirs — Storefront

React 18 + Vite + Tailwind CSS storefront and admin. It talks to the backend API (separate repository,
`souvenirs-backend`) only over HTTP at `/api`.

## Run locally

Start the backend first (see its README), then:

```bash
npm install
npm start
```

Open http://localhost:5173. The dev server forwards `/api`, `/uploads` and `/sitemap.xml` to
`http://localhost:8090`. To use a backend elsewhere, set `VITE_API_TARGET` in `.env` (see `.env.example`).

If the backend is not running, every `/api` call fails with `ECONNREFUSED` and no products appear.

## Build for production

```bash
npm run build
```

Deploy `dist/` to any static host. If the API is on a different domain, set `VITE_API_URL` before building
(it is also added to the Content-Security-Policy). Serve `dist/_headers` (or the same headers: HSTS,
`frame-ancestors 'none'`) where the host supports it. Route unknown paths to `index.html` (single-page app).

| Variable | Purpose |
| --- | --- |
| `VITE_API_TARGET` | Dev server only: backend address (default `http://localhost:8090`) |
| `VITE_API_URL` | Build: API origin when it differs from the storefront |
| `VITE_GA_ID` | Google Analytics 4 |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile; the backend needs `TURNSTILE_SECRET_KEY` |

## Images

All pictures are bundled from this repository; image URLs stored in the backend database are not used.

| Folder | File name | Used for |
| --- | --- | --- |
| `src/assets/products/` | `<product-slug>.jpg`, extra photos `<product-slug>--2.jpg`, `--3` … | Shop, product page, cart, orders |
| `src/assets/categories/` | `<category-slug>.jpg` | Category tiles |
| `src/assets/site/` | `hero.jpg`, `about.jpg`, `occasion-<slug>.jpg`, `gift-box-<title-slug>.jpg`, `instagram-1.jpg` … | Content sections |

Any of `.jpg .png .webp .avif .svg` works; a photo wins over an `.svg` placeholder of the same name. A product
without its own file shows `products/default.svg`. Content sections without their own file reuse a product
photo; see `src/lib/siteImages.js`. Sample photos are from Unsplash — replace them with your own.
