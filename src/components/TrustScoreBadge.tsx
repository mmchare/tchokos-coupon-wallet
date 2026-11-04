import { ShieldCheck } from 'lucide-react';
import { trustLevel } from '@/lib/trustScore';
import { cn } from '@/lib/utils';

export const TrustScoreBadge = ({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) => {
  const { label } = trustLevel(score);
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent-foreground border border-accent/40 font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      )}
      title="Score de confiance calculé à partir de la vérification, des avis, des ventes et de l'ancienneté"
    >
      <ShieldCheck className={size === 'sm' ? 'w-3 h-3 text-primary' : 'w-4 h-4 text-primary'} />
      <span>Confiance {score}%</span>
      {size === 'md' && <span className="text-muted-foreground font-normal">· {label}</span>}
    </div>
  );
};

export const SellerAvatar = ({ url, name, className }: { url?: string | null; name?: string | null; className?: string }) =>
  url ? (
    <img src={url} alt={name || 'Vendeur'} className={cn('rounded-full object-cover', className)} />
  ) : (
    <div className={cn('rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary', className)}>
      {(name || 'S').charAt(0).toUpperCase()}
    </div>
  );
