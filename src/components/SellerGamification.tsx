import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { sellerLevel, sellerBadges, sellerMissions } from '@/lib/sellerLevel';
import { cn } from '@/lib/utils';

export const SellerLevelBadge = ({ totalSales }: { totalSales: number }) => {
  const lv = sellerLevel(totalSales);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[11px] font-semibold">
      {lv.icon} Niv.{lv.index} {lv.name}
    </span>
  );
};

export const SellerLevelCard = ({ totalSales }: { totalSales: number }) => {
  const lv = sellerLevel(totalSales);
  return (
    <Card className="p-4 bg-gradient-to-br from-primary/15 via-card to-accent/10 border-primary/20">
      <div className="flex items-center gap-3">
        <div className="text-4xl">{lv.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Niveau {lv.index}</p>
          <p className="font-bold text-lg leading-tight">{lv.name}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{totalSales}</p>
          <p className="text-[11px] text-muted-foreground">ventes</p>
        </div>
      </div>
      <Progress value={lv.progress} className="h-2 mt-3" />
      <p className="text-xs text-muted-foreground mt-1.5">
        {lv.next ? <>Encore <b className="text-foreground">{lv.remaining} vente{lv.remaining > 1 ? 's' : ''}</b> pour devenir {lv.next.icon} {lv.next.name}</> : 'Niveau maximum atteint 🎉'}
      </p>
    </Card>
  );
};

export const SellerBadgesRow = ({ seller, productsCount, reviewsCount, showLocked = true }: { seller: any; productsCount: number; reviewsCount: number; showLocked?: boolean }) => {
  const badges = sellerBadges(seller, productsCount, reviewsCount).filter((b) => showLocked || b.unlocked);
  if (!badges.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {badges.map((b) => (
        <div key={b.id} title={b.hint}
          className={cn('flex-shrink-0 w-20 rounded-xl border p-2 text-center', b.unlocked ? 'bg-card border-primary/30' : 'bg-muted/40 border-border opacity-50 grayscale')}>
          <div className="text-2xl">{b.icon}</div>
          <div className="text-[10px] font-medium leading-tight mt-1">{b.label}</div>
        </div>
      ))}
    </div>
  );
};

export const SellerMissions = ({ seller, productsCount, onGo }: { seller: any; productsCount: number; onGo: (tab: string) => void }) => {
  const missions = sellerMissions(seller, productsCount);
  const done = missions.filter((m) => m.done).length;
  if (done === missions.length) return null;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold">🎯 Missions du vendeur</p>
        <span className="text-xs text-muted-foreground">{done}/{missions.length}</span>
      </div>
      <div className="space-y-1">
        {missions.map((m) => (
          <button key={m.label} disabled={m.done} onClick={() => m.tab && onGo(m.tab)}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted disabled:hover:bg-transparent">
            {m.done ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
            <span className={cn('flex-1 text-sm', m.done && 'line-through text-muted-foreground')}>{m.label}</span>
            {!m.done && <><span className="text-[11px] text-primary font-medium">{m.reward}</span><ChevronRight className="w-4 h-4 text-muted-foreground" /></>}
          </button>
        ))}
      </div>
    </Card>
  );
};
