// Score de confiance vendeur (style Xianyu 芝麻信用) — 0 à 100 %.
export interface TrustInput {
  verified: boolean;
  rating: number; // 0-5
  totalSales: number;
  reviewsCount: number;
  createdAt: string | Date;
  hasAvatar?: boolean;
  hasCover?: boolean;
  hasDescription?: boolean;
  isSuspended?: boolean;
}

export function computeTrustScore(s: TrustInput): number {
  if (s.isSuspended) return 0;
  let score = 0;
  if (s.verified) score += 30; // identité / résidence vérifiée
  // Note : comptée seulement s'il y a des avis
  score += s.reviewsCount > 0 ? (Math.min(Math.max(s.rating, 0), 5) / 5) * 25 : 10;
  score += Math.min(s.totalSales, 50) / 50 * 20; // ventes (max à 50)
  const days = (Date.now() - new Date(s.createdAt).getTime()) / 86400000;
  score += Math.min(Math.max(days, 0), 365) / 365 * 15; // ancienneté (max 1 an)
  score += (s.hasAvatar ? 4 : 0) + (s.hasCover ? 3 : 0) + (s.hasDescription ? 3 : 0); // profil complet
  return Math.round(Math.min(score, 100));
}

export function trustLevel(score: number): { label: string; tone: 'excellent' | 'good' | 'fair' | 'new' } {
  if (score >= 85) return { label: 'Excellent', tone: 'excellent' };
  if (score >= 70) return { label: 'Très bon', tone: 'good' };
  if (score >= 50) return { label: 'Correct', tone: 'fair' };
  return { label: 'Nouveau', tone: 'new' };
}

export function sellerToTrustInput(seller: any, reviewsCount: number): TrustInput {
  return {
    verified: seller.verification_status === 'verified',
    rating: Number(seller.rating || 0),
    totalSales: seller.total_sales || 0,
    reviewsCount,
    createdAt: seller.created_at,
    hasAvatar: !!seller.avatar_url,
    hasCover: !!seller.cover_url,
    hasDescription: !!seller.shop_description,
    isSuspended: !!seller.is_suspended,
  };
}
