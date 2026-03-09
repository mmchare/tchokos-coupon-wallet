import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Clock, Tag, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MasonryProductCard from '@/components/MasonryProductCard';
import Masonry from 'react-masonry-css';
import { Skeleton } from '@/components/ui/skeleton';

const filters = [
  { key: 'all', label: 'Tout', icon: Flame },
  { key: 'biggest', label: '-50% et plus', icon: TrendingDown },
  { key: 'ending', label: 'Bientôt fini', icon: Clock },
];

const Deals = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      setIsLoading(true);
      let query = supabase
        .from('products')
        .select('*')
        .not('original_price', 'is', null)
        .gt('original_price', 0)
        .order('created_at', { ascending: false })
        .limit(30);

      const { data } = await query;

      let filtered = (data || []).filter(p => p.original_price && p.original_price > p.price);

      if (activeFilter === 'biggest') {
        filtered = filtered.filter(p => {
          const discount = ((p.original_price! - p.price) / p.original_price!) * 100;
          return discount >= 50;
        });
      }

      if (activeFilter === 'ending') {
        filtered = filtered.filter(p => p.stock_available <= 3);
      }

      setProducts(filtered);
      setIsLoading(false);
    };
    fetchDeals();
  }, [activeFilter]);

  const breakpointCols = { default: 2, 640: 2 };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">🏷️ Bons Plans</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Banner */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <Tag className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground text-sm">Les meilleures réductions</span>
        </div>
        <p className="text-xs text-muted-foreground">Produits avec les plus grosses baisses de prix sélectionnés pour vous.</p>
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl mb-3 block">🏷️</span>
            <p className="text-muted-foreground text-sm">Aucun bon plan pour le moment</p>
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointCols}
            className="flex -ml-3 w-auto"
            columnClassName="pl-3 bg-clip-padding"
          >
            {products.map((product) => (
              <MasonryProductCard
                key={product.id}
                id={product.id}
                image={product.images?.[0] || '/placeholder.svg'}
                name={product.name}
                price={product.price}
                originalPrice={product.original_price}
                rating={4.5}
                isAuction={product.is_auction}
                isVerified={product.is_verified}
              />
            ))}
          </Masonry>
        )}
      </div>
    </div>
  );
};

export default Deals;
