/**
 * Stories-style carousel for new product arrivals ("Drops")
 * Differentiates JinBao from Xianyu with Instagram-style presentation
 */

import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Flame } from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';

interface DropProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

const NewDropsCarousel = memo(() => {
  const navigate = useNavigate();
  const [drops, setDrops] = useState<DropProduct[]>([]);

  useEffect(() => {
    const fetchNewDrops = async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data } = await supabase
        .from('products')
        .select('id, name, price, images, category')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        setDrops(data.map(p => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image: p.images?.[0] || '/placeholder.svg',
          category: p.category || 'Autres',
        })));
      }
    };

    fetchNewDrops();
  }, []);

  if (drops.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Flame className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Nouveaux Drops</h2>
        <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
          NEW
        </span>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide snap-x snap-mandatory">
        {drops.map((drop) => (
          <div
            key={drop.id}
            onClick={() => navigate(`/product/${drop.id}`)}
            className="flex-shrink-0 w-28 cursor-pointer group snap-start"
          >
            {/* Story-style circular image */}
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden ring-2 ring-primary/40 group-hover:ring-primary transition-all duration-300 shadow-md">
              <OptimizedImage
                src={drop.image}
                alt={drop.name}
                className="w-full h-full group-hover:scale-110 transition-transform duration-500"
              />
              {/* Price overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <span className="text-white text-xs font-bold">
                  {drop.price.toLocaleString()} F
                </span>
              </div>
            </div>
            
            {/* Product name */}
            <p className="text-[11px] text-foreground font-medium mt-1.5 line-clamp-2 leading-tight text-center">
              {drop.name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
});

NewDropsCarousel.displayName = 'NewDropsCarousel';

export default NewDropsCarousel;
