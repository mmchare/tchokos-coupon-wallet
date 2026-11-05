// Niveaux & badges vendeur (gamification façon Xianyu 鱼力值)
export const LEVELS = [
  { name: 'Graine', icon: '🌱', minSales: 0 },
  { name: 'Pousse', icon: '🌿', minSales: 5 },
  { name: 'Bambou', icon: '🎋', minSales: 20 },
  { name: 'Dragon', icon: '🐉', minSales: 50 },
  { name: 'Empereur', icon: '👑', minSales: 150 },
];

export function sellerLevel(totalSales: number) {
  let i = 0;
  LEVELS.forEach((l, idx) => { if (totalSales >= l.minSales) i = idx; });
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const progress = next ? Math.round(((totalSales - cur.minSales) / (next.minSales - cur.minSales)) * 100) : 100;
  return { index: i + 1, ...cur, next, progress, remaining: next ? next.minSales - totalSales : 0 };
}

export interface Badge { id: string; icon: string; label: string; unlocked: boolean; hint: string }

export function sellerBadges(s: any, productsCount: number, reviewsCount: number): Badge[] {
  const rating = Number(s.rating || 0);
  return [
    { id: 'verified', icon: '✅', label: 'Vérifié', unlocked: s.verification_status === 'verified', hint: 'Dossier validé par JinBao' },
    { id: 'first', icon: '🎯', label: '1ère vente', unlocked: (s.total_sales || 0) >= 1, hint: 'Réaliser une vente' },
    { id: 'catalog', icon: '📦', label: 'Vitrine pleine', unlocked: productsCount >= 10, hint: 'Avoir 10 produits en vente' },
    { id: 'star', icon: '⭐', label: 'Bien noté', unlocked: reviewsCount >= 3 && rating >= 4.5, hint: '3 avis et note ≥ 4,5' },
    { id: 'branding', icon: '🎨', label: 'Belle boutique', unlocked: !!s.avatar_url && !!s.cover_url && !!s.shop_description, hint: 'Photo, couverture et présentation' },
    { id: 'premium', icon: '💎', label: 'Premium', unlocked: s.subscription_tier === 'premium', hint: 'Passer au plan Premium' },
  ];
}

export interface Mission { label: string; reward: string; done: boolean; tab?: string }

export function sellerMissions(s: any, productsCount: number): Mission[] {
  return [
    { label: 'Ajouter une photo de profil', reward: '+4 % confiance', done: !!s.avatar_url, tab: 'shop' },
    { label: 'Ajouter une image de couverture', reward: '+3 % confiance', done: !!s.cover_url, tab: 'shop' },
    { label: 'Écrire la présentation de la boutique', reward: '+3 % confiance', done: !!s.shop_description, tab: 'shop' },
    { label: 'Mettre en vente 3 produits', reward: 'Plus de visibilité', done: productsCount >= 3, tab: 'products' },
    { label: 'Créer un code promo', reward: 'Attire les acheteurs', done: false, tab: 'promos' },
  ];
}
