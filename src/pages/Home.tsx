/**
 * Home page - JinBao Smart Market
 * Masonry Grid Layout (Xianyu/Pinterest style)
 */

import { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import Header from '@/components/Header';
import MasonryProductCard from '@/components/MasonryProductCard';
import CategoryFilter from '@/components/CategoryFilter';
import LoadCouponModal from '@/components/LoadCouponModal';
import DeliveryFormModal from '@/components/DeliveryFormModal';
import PurchaseConfirmation from '@/components/PurchaseConfirmation';
import CouponPanel from '@/components/CouponPanel';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCoupon } from '@/contexts/CouponContext';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  image: string;
  isAuction?: boolean;
}

interface CouponItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

const Home = () => {
  const { toast } = useToast();
  const { couponItems, addToCoupon, removeFromCoupon, updateQuantity, clearCoupon, loadCoupon } = useCoupon();
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isLoadCouponOpen, setIsLoadCouponOpen] = useState(false);
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [purchasedProductName, setPurchasedProductName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['Tous', 'Enchères']);

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les produits",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (data) {
        // Transform DB data to component format
        const transformedProducts: Product[] = data.map(product => ({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          originalPrice: product.original_price ? Number(product.original_price) : undefined,
          category: product.category || 'Autres',
          rating: 4.5 + Math.random() * 0.5, // Placeholder rating until reviews system
          image: product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg',
          isAuction: product.is_auction || false
        }));

        setProducts(transformedProducts);

        // Extract unique categories from products
        const uniqueCategories = ['Tous', 'Enchères', ...new Set(data.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories as string[]);
      }

      setIsLoading(false);
    };

    fetchProducts();
  }, [toast]);

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'Tous' || 
      (activeCategory === 'Enchères' ? product.isAuction === true : product.category === activeCategory);
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Masonry breakpoints
  const breakpointColumns = {
    default: 3,
    1024: 3,
    768: 2,
    480: 2
  };

  const handleRemoveFromCoupon = (productId: string) => {
    removeFromCoupon(productId);
  };

  const handleUpdateCouponQuantity = (productId: string, quantity: number) => {
    updateQuantity(productId, quantity);
  };

  const handlePurchase = () => {
    setIsDeliveryFormOpen(true);
  };

  const handleDeliverySubmit = (data: { address: string; phone: string }) => {
    const productNames = couponItems.length === 1 
      ? couponItems[0].name 
      : `${couponItems.length} articles`;
    
    setPurchasedProductName(productNames);
    setIsDeliveryFormOpen(false);
    setIsCouponOpen(false);
    setShowPurchaseConfirmation(true);
    clearCoupon();
  };

  const handleCloseConfirmation = () => {
    setShowPurchaseConfirmation(false);
    setPurchasedProductName('');
  };

  const handleLoadCoupon = (items: CouponItem[]) => {
    loadCoupon(items);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => {}} />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Hero Section - Compact */}
        <section className="text-center mb-6 animate-fade-in px-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 leading-tight">
            <span className="text-vibrant-red">JinBao</span> Smart Market
          </h1>
          <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
            Gadgets tech premium à prix imbattables
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input 
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input border border-border rounded-full text-foreground placeholder-muted-foreground focus:outline-none focus:border-vibrant-red text-sm"
            />
          </div>
        </section>

        {/* Category Filter & Actions */}
        <section className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-2 sm:space-y-0">
            <h2 className="text-lg font-bold text-foreground px-1">Catalogue</h2>
            <div className="flex space-x-2 px-1">
              <Button 
                onClick={() => setIsLoadCouponOpen(true)}
                variant="outline"
                size="sm"
                className="text-xs flex-1 sm:flex-none"
              >
                <Download className="h-3 w-3 mr-1" />
                Code
              </Button>
              <Button 
                onClick={() => setIsCouponOpen(true)}
                variant="outline"
                size="sm"
                className="border-vibrant-red text-vibrant-red hover:bg-vibrant-red hover:text-white text-xs flex-1 sm:flex-none"
              >
                Coupon ({couponItems.length})
              </Button>
            </div>
          </div>
          
          <CategoryFilter 
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-vibrant-red" />
          </div>
        )}

        {/* Masonry Products Grid */}
        {!isLoading && (
          <Masonry
            breakpointCols={breakpointColumns}
            className="masonry-grid"
            columnClassName="masonry-grid-column"
          >
            {filteredProducts.map((product) => (
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
        )}

        {/* Empty State */}
        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Aucun produit trouvé
            </p>
          </div>
        )}
      </main>

      {/* Coupon Sheet */}
      <Sheet open={isCouponOpen} onOpenChange={setIsCouponOpen}>
        <SheetContent className="w-full sm:max-w-md bg-background border-border">
          <SheetHeader>
            <SheetTitle className="text-foreground">Mon Coupon</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <CouponPanel
              items={couponItems}
              onRemoveItem={handleRemoveFromCoupon}
              onUpdateQuantity={handleUpdateCouponQuantity}
              onPurchase={handlePurchase}
              onGenerateCode={() => {}}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Load Coupon Modal */}
      <LoadCouponModal
        isOpen={isLoadCouponOpen}
        onClose={() => setIsLoadCouponOpen(false)}
        onLoadCoupon={handleLoadCoupon}
      />

      {/* Delivery Form Modal */}
      <DeliveryFormModal
        isOpen={isDeliveryFormOpen}
        onClose={() => setIsDeliveryFormOpen(false)}
        onSubmit={handleDeliverySubmit}
        total={couponItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
        items={couponItems}
      />

      {/* Purchase Confirmation Modal */}
      {showPurchaseConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-xl shadow-xl border border-border">
            <PurchaseConfirmation 
              productName={purchasedProductName}
              onClose={handleCloseConfirmation}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
