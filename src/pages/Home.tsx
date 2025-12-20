/**
 * Home page - JinBao Smart Market
 * Clean, unified product grid with invisible AI-powered personalization
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Masonry from 'react-masonry-css';
import Header from '@/components/Header';
import MasonryProductCard from '@/components/MasonryProductCard';
import CategoryFilter from '@/components/CategoryFilter';
import LoadCouponModal from '@/components/LoadCouponModal';
import DeliveryFormModal from '@/components/DeliveryFormModal';
import PurchaseConfirmation from '@/components/PurchaseConfirmation';
import CouponPanel from '@/components/CouponPanel';
import SearchSuggestions from '@/components/SearchSuggestions';
import { ProductSkeletonGrid } from '@/components/ProductSkeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Download, Loader2, Sparkles, X } from 'lucide-react';
import { useCoupon } from '@/contexts/CouponContext';
import { useSmartProducts } from '@/hooks/useSmartProducts';
import { useAISearch } from '@/hooks/useAISearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';

interface CouponItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

const Home = () => {
  const { couponItems, removeFromCoupon, updateQuantity, clearCoupon, loadCoupon } = useCoupon();
  const { products, isLoading } = useSmartProducts();
  const { search: aiSearch, isSearching, searchResults, interpretation, clearSearch, hasResults } = useAISearch();
  const { history, addSearch, deleteSearch, clearHistory } = useSearchHistory();
  
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isLoadCouponOpen, setIsLoadCouponOpen] = useState(false);
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [purchasedProductName, setPurchasedProductName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [useAIMode, setUseAIMode] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
  // Infinite scroll state
  const [displayCount, setDisplayCount] = useState(10);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract categories from products
  const categories = ['Tous', 'Enchères', ...new Set(products.map(p => p.category).filter(Boolean))];

  // Handle AI search with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSearchSuggestions(value.length === 0 && history.length > 0);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If AI mode is enabled and query is long enough, trigger AI search
    if (useAIMode && value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        aiSearch(value);
      }, 500);
    } else if (value.length < 3) {
      clearSearch();
    }
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    if (searchQuery.trim().length >= 2) {
      addSearch(searchQuery.trim());
      setShowSearchSuggestions(false);
    }
  };

  // Handle search suggestion selection
  const handleSelectSuggestion = (query: string) => {
    setSearchQuery(query);
    setShowSearchSuggestions(false);
    if (useAIMode && query.length >= 3) {
      aiSearch(query);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    clearSearch();
    setShowSearchSuggestions(false);
  };

  // Products to display - AI results or filtered products
  const displayProducts = hasResults && useAIMode 
    ? searchResults!.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.original_price,
        category: p.category || 'Autres',
        rating: 4.5,
        image: p.images?.[0] || '/placeholder.svg',
        isAuction: p.is_auction || false,
      }))
    : products.filter(product => {
        const matchesCategory = activeCategory === 'Tous' || 
          (activeCategory === 'Enchères' ? product.isAuction === true : product.category === activeCategory);
        const matchesSearch = searchQuery === '' || 
          product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });

  // Paginated products for infinite scroll
  const visibleProducts = displayProducts.slice(0, displayCount);
  const hasMore = displayCount < displayProducts.length;

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(10);
  }, [activeCategory, searchQuery, hasResults]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setDisplayCount(prev => Math.min(prev + 8, displayProducts.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, displayProducts.length]);

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
      <Header />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Hero Section - Compact */}
        <section className="text-center mb-6 animate-fade-in px-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 leading-tight">
            <span className="text-vibrant-red">JinBao</span> Smart Market
          </h1>
          <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
            Gadgets tech premium à prix imbattables
          </p>
          
          {/* Search Bar with AI Toggle */}
          <div className="max-w-md mx-auto relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder={useAIMode ? "Ex: téléphone pas cher avec bonne batterie..." : "Rechercher..."}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSearchSuggestions(searchQuery.length === 0 && history.length > 0)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="w-full pl-10 pr-20 py-2.5 bg-input border border-border rounded-full text-foreground placeholder-muted-foreground focus:outline-none focus:border-vibrant-red text-sm"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setUseAIMode(!useAIMode)}
                className={`p-1.5 rounded-full transition-colors ${
                  useAIMode 
                    ? 'bg-vibrant-red/20 text-vibrant-red' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={useAIMode ? "Désactiver recherche IA" : "Activer recherche IA"}
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
            {isSearching && (
              <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-vibrant-red" />
              </div>
            )}
            
            {/* Search History Suggestions */}
            <SearchSuggestions
              history={history}
              onSelect={handleSelectSuggestion}
              onDelete={deleteSearch}
              onClearAll={clearHistory}
              isVisible={showSearchSuggestions}
            />
          </div>

          {/* AI Interpretation */}
          {interpretation && useAIMode && (
            <p className="text-xs text-muted-foreground text-center mb-2">
              <Sparkles className="h-3 w-3 inline mr-1" />
              {interpretation}
            </p>
          )}
        </section>

        {/* Category Filter & Actions */}
        <section className="mb-4">
          {/* Buttons - Full width on mobile, right-aligned on desktop */}
          <div className="flex items-center justify-center gap-3 mb-3 px-1 sm:justify-end">
            <Button 
              onClick={() => setIsLoadCouponOpen(true)}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none text-xs max-w-[160px]"
            >
              <Download className="h-3 w-3 mr-1" />
              Code
            </Button>
            <Button 
              onClick={() => setIsCouponOpen(true)}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none border-vibrant-red text-vibrant-red hover:bg-vibrant-red hover:text-white text-xs max-w-[160px]"
            >
              Coupon ({couponItems.length})
            </Button>
          </div>
          
          <CategoryFilter 
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </section>

        {/* Loading State - Skeleton Grid */}
        {isLoading && (
          <Masonry
            breakpointCols={breakpointColumns}
            className="masonry-grid"
            columnClassName="masonry-grid-column"
          >
            <ProductSkeletonGrid count={8} />
          </Masonry>
        )}

        {/* Unified Product Grid - Smart ordering invisible to user */}
        {!isLoading && visibleProducts.length > 0 && (
          <>
            <Masonry
              breakpointCols={breakpointColumns}
              className="masonry-grid"
              columnClassName="masonry-grid-column"
            >
              {visibleProducts.map((product, index) => (
                <MasonryProductCard
                  key={product.id}
                  id={product.id}
                  image={product.image}
                  name={product.name}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  rating={product.rating}
                  isAuction={product.isAuction}
                  priority={index < 6} // First 6 images load immediately
                />
              ))}
            </Masonry>

            {/* Load more trigger for infinite scroll */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && displayProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {useAIMode && searchQuery ? "Aucun produit ne correspond à votre recherche" : "Aucun produit trouvé"}
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
