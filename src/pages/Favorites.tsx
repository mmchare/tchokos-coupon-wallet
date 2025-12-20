import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import MasonryProductCard from '@/components/MasonryProductCard';
import Masonry from 'react-masonry-css';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  isAuction: boolean;
}

const Favorites = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { favorites, isLoading: favoritesLoading } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch products when favorites change
  useEffect(() => {
    const fetchProducts = async () => {
      if (favorites.length === 0) {
        setProducts([]);
        return;
      }

      setIsLoadingProducts(true);
      const productIds = favorites.map(f => f.product_id);
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, original_price, images, is_auction')
        .in('id', productIds);

      if (error) {
        console.error('Error fetching favorite products:', error);
        setIsLoadingProducts(false);
        return;
      }

      const transformedProducts = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        image: p.images?.[0] || '/placeholder.svg',
        rating: 4.5,
        isAuction: p.is_auction || false
      }));

      setProducts(transformedProducts);
      setIsLoadingProducts(false);
    };

    fetchProducts();
  }, [favorites]);

  const isLoading = authLoading || favoritesLoading || isLoadingProducts;

  const breakpointColumns = {
    default: 3,
    1024: 3,
    768: 2,
    480: 2
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-vibrant-red" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-6 w-6 text-vibrant-red fill-vibrant-red" />
              Mes Favoris
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Aucun favori</h2>
            <p className="text-muted-foreground mb-6">
              Ajoutez des produits à vos favoris pour les retrouver ici
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-vibrant-red hover:bg-vibrant-red/90 text-white"
            >
              Découvrir les produits
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-4">
              {products.length} produit{products.length > 1 ? 's' : ''} dans vos favoris
            </p>
            <Masonry
              breakpointCols={breakpointColumns}
              className="masonry-grid"
              columnClassName="masonry-grid-column"
            >
              {products.map((product) => (
                <MasonryProductCard
                  key={product.id}
                  id={product.id}
                  image={product.image}
                  name={product.name}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  rating={product.rating}
                  isAuction={product.isAuction}
                />
              ))}
            </Masonry>
          </>
        )}
      </main>
    </div>
  );
};

export default Favorites;
