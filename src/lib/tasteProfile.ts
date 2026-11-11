/**
 * Taste profile — TikTok/Xianyu-style interest graph kept on the device.
 * Learns from every signal (card seen, scrolled past, clicked, time on page,
 * cart, favorite, search) and generalises to similar products via
 * category, name keywords and price band. Interests decay over time.
 */

export type TasteSignal =
  | 'impression' // card visible > ~1.2s
  | 'skip'       // card seen quickly and scrolled past
  | 'click'
  | 'dwell'      // time on product page (pass seconds)
  | 'cart'
  | 'favorite'
  | 'purchase'
  | 'search';

export interface TasteFeatures {
  id: string;
  name: string;
  category?: string | null;
  price?: number;
}

interface Weighted { w: number; t: number }
interface Profile {
  cats: Record<string, Weighted>;
  tokens: Record<string, Weighted>;
  prices: Record<string, Weighted>;
  seen: Record<string, { n: number; clicked: boolean; t: number }>;
  v: 1;
}

const KEY = 'jb_taste_v1';
const HALF_LIFE_MS = 3 * 24 * 3600 * 1000;
const STOP = new Set(['avec', 'pour', 'sans', 'the', 'and', 'des', 'les', 'une', 'new', 'neuf', 'pro', 'max', 'plus', 'mini', 'set', 'pcs']);

const WEIGHTS: Record<Exclude<TasteSignal, 'dwell' | 'search'>, number> = {
  impression: 0.3, skip: -0.4, click: 3, cart: 6, favorite: 5, purchase: 10,
};

const registry = new Map<string, TasteFeatures>();
let profile: Profile = load();
const listeners = new Set<() => void>();

function load(): Profile {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { cats: {}, tokens: {}, prices: {}, seen: {}, v: 1 };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      // keep storage small
      const prune = (o: Record<string, Weighted>, max: number) => {
        const e = Object.entries(o);
        if (e.length <= max) return o;
        return Object.fromEntries(e.sort((a, b) => Math.abs(decayed(b[1])) - Math.abs(decayed(a[1]))).slice(0, max));
      };
      profile.tokens = prune(profile.tokens, 300);
      const seen = Object.entries(profile.seen);
      if (seen.length > 800) profile.seen = Object.fromEntries(seen.sort((a, b) => b[1].t - a[1].t).slice(0, 800));
      localStorage.setItem(KEY, JSON.stringify(profile));
    } catch { /* ignore */ }
    listeners.forEach((l) => l());
  }, 400);
}

export function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9\u4e00-\u9fff]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t))
    .slice(0, 12);
}

export function priceBand(price?: number): string | null {
  if (!price || price <= 0) return null;
  return String(Math.round(Math.log10(price) * 2)); // half-decade bands
}

function decayed(x: Weighted, now = Date.now()) {
  return x.w * Math.pow(0.5, (now - x.t) / HALF_LIFE_MS);
}

function bump(bag: Record<string, Weighted>, key: string, amount: number) {
  const now = Date.now();
  const cur = bag[key];
  const base = cur ? decayed(cur, now) : 0;
  bag[key] = { w: Math.max(-20, Math.min(200, base + amount)), t: now };
}

export function registerProducts(items: TasteFeatures[]) {
  items.forEach((p) => registry.set(p.id, p));
}

export function recordSignal(productId: string, type: TasteSignal, seconds = 0) {
  const p = registry.get(productId);
  let amount: number;
  if (type === 'dwell') {
    if (seconds < 3) amount = -0.5; // bounced
    else amount = Math.min(8, Math.log2(seconds) * 1.5);
  } else if (type === 'search') return;
  else amount = WEIGHTS[type];

  const s = profile.seen[productId] || { n: 0, clicked: false, t: 0 };
  if (type === 'impression' || type === 'skip') s.n += 1;
  if (type !== 'impression' && type !== 'skip') s.clicked = true;
  s.t = Date.now();
  profile.seen[productId] = s;

  if (p) {
    if (p.category) bump(profile.cats, p.category, amount);
    tokenize(p.name).forEach((tok) => bump(profile.tokens, tok, amount * 0.6));
    const band = priceBand(p.price);
    if (band) bump(profile.prices, band, amount * 0.4);
  }
  save();
}

export function recordSearch(query: string) {
  tokenize(query).forEach((tok) => bump(profile.tokens, tok, 4));
  save();
}

export function subscribeTaste(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Interest score for a product (can be negative). */
export function tasteScore(p: TasteFeatures): number {
  const now = Date.now();
  let score = 0;
  if (p.category && profile.cats[p.category]) score += decayed(profile.cats[p.category], now);
  const toks = tokenize(p.name);
  let tokScore = 0;
  toks.forEach((tok) => { const w = profile.tokens[tok]; if (w) tokScore += decayed(w, now); });
  score += toks.length ? tokScore / Math.sqrt(toks.length) : 0;
  const band = priceBand(p.price);
  if (band && profile.prices[band]) score += decayed(profile.prices[band], now) * 0.5;

  // Fatigue: shown many times, never opened → fade out
  const s = profile.seen[p.id];
  if (s && !s.clicked && s.n >= 3) score -= (s.n - 2) * 2;
  return score;
}

export function hasTaste(): boolean {
  return Object.keys(profile.cats).length > 0 || Object.keys(profile.tokens).length > 0;
}

/**
 * Rank a feed: personal interest + extra boost, then ~15% exploration
 * slots and a diversity rule (max 2 same category in a row).
 */
export function rankFeed<T extends TasteFeatures>(items: T[], boost: (p: T) => number = () => 0): T[] {
  const scored = items.map((p) => ({ p, s: tasteScore(p) + boost(p) + Math.random() * 1.5 }));
  scored.sort((a, b) => b.s - a.s);
  const main = scored.filter((x) => x.s > 1);
  const explore = scored.filter((x) => x.s <= 1).sort(() => Math.random() - 0.5);

  const queue: T[] = [];
  let mi = 0, ei = 0;
  for (let i = 0; i < scored.length; i++) {
    const exploreSlot = (i + 1) % 7 === 0 || mi >= main.length;
    if (exploreSlot && ei < explore.length) queue.push(explore[ei++].p);
    else if (mi < main.length) queue.push(main[mi++].p);
    else if (ei < explore.length) queue.push(explore[ei++].p);
  }

  // diversity pass
  const out: T[] = [];
  const pending = [...queue];
  while (pending.length) {
    const a = out[out.length - 1]?.category, b = out[out.length - 2]?.category;
    let idx = 0;
    if (a && a === b) {
      const j = pending.findIndex((x) => x.category !== a);
      if (j > 0 && j < 8) idx = j;
    }
    out.push(pending.splice(idx, 1)[0]);
  }
  return out;
}
