# LICHT Signature Souvenirs — Storefront

React 18 + Vite + Tailwind CSS storefront and admin. It talks to the backend API (separate repository,
[lifeoncanvas/souv-b](https://github.com/lifeoncanvas/souv-b)) only over HTTP at `/api`.

## Run locally (VS Code)

1. Open **this repository's folder** in VS Code (the one containing `package.json`). Node.js 18 or newer is needed.
2. **Start the backend first.** Open the backend repository in IntelliJ and run it (see its README). The storefront
   has no products without it.
3. In VS Code's terminal:

```bash
npm install
npm start
```

Open http://localhost:5173. The dev server forwards `/api`, `/uploads` and `/sitemap.xml` to
`http://localhost:8090`. To use a backend elsewhere, set `VITE_API_TARGET` in `.env` (see `.env.example`).

If the backend isn't running, the terminal prints `Backend not reachable at http://localhost:8090…` (older versions
show `ECONNREFUSED`), and no products appear. Start the backend and refresh.

## Deploy on the server (GoDaddy VPS)

Everything runs on **one domain**, `https://lichtsignaturesouvenirs.store`:

- the storefront is the built `dist/` folder;
- `/api`, `/uploads` and `/sitemap.xml` are forwarded by nginx to the LICHT backend (the `souv-b` repo), running as a
  service on the same server, port 8090.

The built site calls `/api` on its own domain (`VITE_API_URL` is empty in `.env.production`), so no extra DNS record,
certificate or CORS setting is needed.

1. Start the backend on the server first (backend README, "Deploy on a Linux server").
   `curl http://localhost:8090/api/categories` on the server must list **Wedding Souvenirs, Birthday Gifts…**.
2. Build: `npm install && npm run build`. This produces `dist/`.
3. Install nginx and certbot (Ubuntu: `sudo apt install nginx certbot python3-certbot-nginx`), then follow the steps
   at the top of `deploy/nginx-storefront.conf`. It serves `dist/`, forwards `/api` and `/uploads` to the backend,
   makes refreshes on pages like `/shop` work, and adds the security headers. Always run `sudo nginx -t` before
   reloading.
4. Check: `https://lichtsignaturesouvenirs.store/api/categories` shows the souvenir categories, and the shop shows
   products.
   - If that address shows something else (for example "Healing Streams" testimonies), another nginx site or rule is
     still sending `/api` to a different app. Remove it as described at the top of `deploy/nginx-storefront.conf`.
   - If it returns `502 Bad Gateway`, the backend isn't running, or isn't on the port that nginx uses.

**To update the storefront:** pull, `npm run build`, copy `dist/*` to `/var/www/licht/`. No restart is needed.

If the API ever moves to its own domain, put that address in `VITE_API_URL` in `.env.production` and rebuild. It is
also added to the Content-Security-Policy.

| Variable | Purpose |
| --- | --- |
| `VITE_API_TARGET` | Dev server only: backend address (default `http://localhost:8090`) |
| `VITE_API_URL` | Build: API origin when it differs from the storefront |
| `VITE_GA_ID` | Google Analytics 4 |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile; the backend needs `TURNSTILE_SECRET_KEY` |

## Offline catalogue

The storefront carries its own copy of the public catalogue in `src/data/catalog.json`: products, categories,
prices, descriptions, related products, site content, testimonials and FAQs. With all pictures in `src/assets`,
**every page a visitor browses works even when the backend is down, slow, or answering with another app's data.**

- When the API answers properly, its live data is used. The copy is only a fallback (`src/lib/offline.js`, used by
  `src/lib/api.js`).
- Anything that needs the server still needs the backend: bag, checkout, sign-in, account, enquiries, newsletter.
  While it's down, those show "Our shop server isn't reachable right now…" instead of failing silently.

**After changing products or content in the admin**, refresh the copy so the fallback matches. With the backend
running on `localhost:8090` and pointed at the real database:

```bash
npm run snapshot
```

Then commit `src/data/catalog.json`. A new product also needs its picture in `src/assets/products/<slug>.jpg`
(see Images).

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
