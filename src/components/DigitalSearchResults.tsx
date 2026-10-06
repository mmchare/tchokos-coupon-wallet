import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, MonitorPlay } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db, DigitalProduct, durationLabel, formatFcfa } from '@/lib/digital';

const DigitalSearchResults = ({ query }: { query: string }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<DigitalProduct[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setItems([]); return; }
    const t = setTimeout(async () => {
      const { data } = await db.rpc('search_digital_products', { p_query: q });
      setItems((data as DigitalProduct[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  if (!items.length) return null;

  return (
    <section className="mb-4">
      <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <MonitorPlay className="h-4 w-4 text-primary" /> Produits numériques
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/digital/${p.id}`)}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 text-left transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {p.logo_url ? <img src={p.logo_url} alt={p.platform} className="h-full w-full object-contain" loading="lazy" /> : <MonitorPlay className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{p.platform} · {p.title}</p>
              <p className="text-xs text-muted-foreground">{durationLabel(p.duration_months)} · Profil {p.profile_type}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-primary">{formatFcfa(p.price_fcfa)}</span>
                <Badge variant="secondary" className="text-[10px] gap-1"><Zap className="h-3 w-3" />Livraison instantanée</Badge>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default DigitalSearchResults;
