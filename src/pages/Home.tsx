/**
 * Home page - JinBao Smart Market
 * Masonry Grid Layout with AI-Powered Personalized Recommendations
 */

import { useState } from 'react';
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
import { Search, Download, Loader2, Sparkles, TrendingUp, Brain, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCoupon } from '@/contexts/CouponContext';
import { usePersonalizedProducts } from '@/hooks/usePersonalizedProducts';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import { useAuth } from '@/contexts/AuthContext';

interface CouponItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

const Home = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { couponItems, removeFromCoupon, updateQuantity, clearCoupon, loadCoupon } = useCoupon();
  const { personalizedProducts, trendingProducts, isLoading, hasPersonalization } = usePersonalizedProducts();
  const { 
    aiRecommendedProducts, 
    personalizationMessage, 
    isLoading: isAILoading, 
    refetch: refetchAI 
  } = useAIRecommendations();
  
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isLoadCouponOpen, setIsLoadCouponOpen] = useState(false);
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [purchasedProductName, setPurchasedProductName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract categories from all products
  const allProducts = [...personalizedProducts, ...trendingProducts];
  const categories = ['Tous', 'Enchères', ...new Set(allProducts.map(p => p.category).filter(Boolean))];

  // Filter products based on category and search
  const filterProducts = <T extends { category: string; isAuction?: boolean; name: string }>(products: T[]): T[] => {
    return products.filter(product => {
      const matchesCategory = activeCategory === 'Tous' || 
        (activeCategory === 'Enchères' ? product.isAuction === true : product.category === activeCategory);
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  const filteredPersonalized = filterProducts(personalizedProducts);
  const filteredTrending = filterProducts(trendingProducts);
  const filteredAIRecommendations = filterProducts(aiRecommendedProducts);

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

        {/* AI Recommendations Section - Only for logged in users */}
        {!isLoading && user && filteredAIRecommendations.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">IA Recommande</h2>
                  {personalizationMessage && (
                    <p className="text-xs text-muted-foreground">{personalizationMessage}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refetchAI}
                disabled={isAILoading}
                className="text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isAILoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
            
            {isAILoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">L'IA analyse vos préférences...</span>
              </div>
            ) : (
              <Masonry
                breakpointCols={breakpointColumns}
                className="masonry-grid"
                columnClassName="masonry-grid-column"
              >
                {filteredAIRecommendations.map((product) => (
                  <div key={`ai-${product.id}`} className="relative">
                    {product.aiReason && (
                      <div className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground text-[10px] px-2 py-1 rounded-full max-w-[80%] truncate">
                        {product.aiReason}
                      </div>
                    )}
                    <MasonryProductCard
                      id={product.id}
                      image={product.image}
                      name={product.name}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      rating={product.rating}
                      isAuction={product.isAuction}
                    />
                  </div>
                ))}
              </Masonry>
            )}
          </section>
        )}

        {/* Rule-Based Personalized Section */}
        {!isLoading && hasPersonalization && filteredPersonalized.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4 px-1">
              <Sparkles className="h-5 w-5 text-vibrant-yellow" />
              <h2 className="text-lg font-bold text-foreground">Basé sur vos visites</h2>
            </div>
            <Masonry
              breakpointCols={breakpointColumns}
              className="masonry-grid"
              columnClassName="masonry-grid-column"
            >
              {filteredPersonalized.map((product) => (
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
          </section>
        )}

        {/* Trending/All Products Section */}
        {!isLoading && filteredTrending.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4 px-1">
              <TrendingUp className="h-5 w-5 text-vibrant-red" />
              <h2 className="text-lg font-bold text-foreground">
                {hasPersonalization || aiRecommendedProducts.length > 0 ? "Les Incontournables" : "Catalogue"}
              </h2>
            </div>
            <Masonry
              breakpointCols={breakpointColumns}
              className="masonry-grid"
              columnClassName="masonry-grid-column"
            >
              {filteredTrending.map((product) => (
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
          </section>
        )}

        {/* Empty State */}
        {!isLoading && filteredPersonalized.length === 0 && filteredTrending.length === 0 && (
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
