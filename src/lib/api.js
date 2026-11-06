// Thin fetch wrapper: attaches the JWT and guest cart token, and normalises errors. Public catalogue reads fall back
// to the offline copy in src/data/catalog.json when the server can't answer (see lib/offline.js).
import { isCatalogRequest, looksLikeShopData, offlineAnswer } from './offline';

const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'licht.token';
const CART_KEY = 'licht.cart';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

export const tokens = {
  auth: () => store.get(TOKEN_KEY),
  setAuth: (t) => store.set(TOKEN_KEY, t),
  cart: () => store.get(CART_KEY),
  setCart: (t) => store.set(CART_KEY, t),
};

export class ApiError extends Error {
  constructor(message, status, fields, code) {
    super(message);
    this.status = status;
    this.fields = fields || {};
    this.code = code || null;
  }
}

const UNREACHABLE = 'Our shop server isn\'t reachable right now. You can keep browsing; please try this again in a few minutes.';

// Public catalogue reads that can fall back to the offline copy if the server is slow, down or wrong.
const OFFLINE_TIMEOUT_MS = 8000;

export async function api(path, options = {}) {
  const { method = 'GET', signal } = options;
  if (method !== 'GET' || !isCatalogRequest(path)) return request(path, options);

  // Give up on a hanging server after a few seconds (or when the caller cancels).
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), OFFLINE_TIMEOUT_MS);
  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const data = await request(path, { ...options, signal: timeout.signal });
    if (looksLikeShopData(path, data)) return data;
  } catch (e) {
    if (signal?.aborted) throw e;
    // A real "not found" from this shop's API is the same answer the offline copy gives, so fall through.
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
  try {
    return offlineAnswer(path);
  } catch (e) {
    throw new ApiError(e.message, e.status || 404);
  }
}

async function request(path, { method = 'GET', body, form, signal } = {}) {
  const headers = {};
  const auth = tokens.auth();
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const cart = tokens.cart();
  if (cart) headers['X-Cart-Token'] = cart;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(BASE + path, {
      method, headers, signal,
      body: form ? form : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(UNREACHABLE, 0);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    if (res.status === 401 && auth) tokens.setAuth(null);
    // A 5xx without this API's JSON body comes from the web server or proxy: the shop server itself is down.
    if (res.status >= 500 && !data?.message) throw new ApiError(UNREACHABLE, res.status);
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', res.status, data?.fields, data?.code);
  }
  return data;
}

export const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};
