/**
 * Home page - JinBao Smart Market
 * Clean, unified product grid with invisible AI-powered personalization
 * Supports offline mode with cached products
 */

import { useState, useEffect, useRef, useCallback, lazy, Suspense, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Masonry from 'react-masonry-css';
import Header from '@/components/Header';
import MasonryProductCard from '@/components/MasonryProductCard';
import CategoryFilter from '@/components/CategoryFilter';
import QuickServices from '@/components/QuickServices';
import SearchSuggestions from '@/components/SearchSuggestions';
import OfflineIndicator from '@/components/OfflineIndicator';
import NewDropsCarousel from '@/components/NewDropsCarousel';
import { ProductSkeletonGrid } from '@/components/ProductSkeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Download, Loader2, Sparkles, X, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import mascotImage from '@/assets/jinbao-mascot.jpg';
import { useCoupon } from '@/contexts/CouponContext';
import { useSmartProducts } from '@/hooks/useSmartProducts';
import { useAISearch } from '@/hooks/useAISearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useOfflineProducts } from '@/hooks/useOfflineProducts';
import SEO from '@/components/SEO';

// Lazy-loaded non-critical components
const LoadCouponModal = lazy(() => import('@/components/LoadCouponModal'));
const DeliveryFormModal = lazy(() => import('@/components/DeliveryFormModal'));
const PurchaseConfirmation = lazy(() => import('@/components/PurchaseConfirmation'));
const CouponPanel = lazy(() => import('@/components/CouponPanel'));
const JinBaoOnboarding = lazy(() => import('@/components/JinBaoOnboarding'));

const ONBOARDING_KEY = 'jinbao_onboarding_completed';

interface CouponItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

const Home = () => {
  const { t } = useTranslation();
  const { couponItems, removeFromCoupon, updateQuantity, clearCoupon, loadCoupon } = useCoupon();
  const { products, isLoading } = useSmartProducts();
  const { search: aiSearch, isSearching, searchResults, interpretation, clearSearch, hasResults } = useAISearch();
  const { history, addSearch, deleteSearch, clearHistory } = useSearchHistory();
  const { offlineProducts, isOnline, cacheProducts } = useOfflineProducts();
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isLoadCouponOpen, setIsLoadCouponOpen] = useState(false);
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [purchasedProductName, setPurchasedProductName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [useAIMode, setUseAIMode] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isImageSearching, setIsImageSearching] = useState(false);
  const [imageSearchInterpretation, setImageSearchInterpretation] = useState('');
  
  // Scroll state for collapsing header
  const [isScrolled, setIsScrolled] = useState(false);

  // Infinite scroll state
  const [displayCount, setDisplayCount] = useState(10);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Detect scroll to collapse sections
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check for first-time onboarding
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompletedOnboarding) {
      const timeout = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  // Extract categories from products - use keys, not translated values
  const categoryKeys = ['all', 'auctions', ...new Set(products.map(p => p.category).filter(Boolean))];
  const categories = categoryKeys;

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
    setImageSearchInterpretation('');
  };

  // Handle image search
  const handleImageSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImageSearching(true);
    setImageSearchInterpretation('');
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('image-search', {
          body: { imageBase64: base64 },
        });

        if (error) {
          console.error('Image search error:', error);
          setIsImageSearching(false);
          return;
        }

        if (data?.interpretation) {
          setImageSearchInterpretation(data.interpretation);
        }
        
        // Use the search query from keywords to filter
        if (data?.keywords) {
          setSearchQuery(data.keywords);
          setUseAIMode(true);
          aiSearch(data.keywords);
        }
        
        setIsImageSearching(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Image search failed:', err);
      setIsImageSearching(false);
    }
    
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Cache products when loaded (for offline access)
  useEffect(() => {
    if (products.length > 0 && isOnline) {
      const productsToCache = products.slice(0, 20).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        image: p.image,
        category: p.category,
        rating: p.rating,
        isAuction: p.isAuction,
      }));
      cacheProducts(productsToCache);
    }
  }, [products, isOnline, cacheProducts]);

  // Products to display - AI results, filtered products, or offline cache
  const displayProducts = !isOnline && products.length === 0
    ? offlineProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        category: p.category || 'Autres',
        rating: p.rating,
        image: p.image,
        isAuction: p.isAuction || false,
      }))
    : hasResults && useAIMode 
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
          const matchesCategory = activeCategory === 'all' || 
            (activeCategory === 'auctions' ? product.isAuction === true : product.category === activeCategory);
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
      <SEO
        title="JinBao — Marketplace Chine-Cameroun"
        description="Achetez en Chine depuis le Cameroun : gadgets tech vérifiés, paiement Mobile Money, livraison 7-21 jours avec suivi en 6 étapes."
        path="/"
      />
      {/* Offline Indicator */}
      <OfflineIndicator isOnline={isOnline} cachedProductsCount={offlineProducts.length} />
      
      {/* Header - Collapses on scroll */}
      <div className={`transition-all duration-300 overflow-hidden ${
        isScrolled ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'
      }`}>
        <Header />
      </div>

      <main className={`container mx-auto px-3 sm:px-4 py-4 sm:py-6 ${!isOnline ? 'pt-16' : ''}`}>
        {/* Hero Section - Collapses on scroll */}
        <section className={`text-center mb-4 animate-fade-in px-2 transition-all duration-300 overflow-hidden ${
          isScrolled ? 'max-h-0 opacity-0 mb-0 py-0' : 'max-h-40 opacity-100'
        }`}>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 leading-tight flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="w-7 h-7 sm:w-9 sm:h-9 border-2 border-jinbao-gold rounded-sm flex items-center justify-center bg-jinbao-gold/10">
                <span className="text-jinbao-gold text-base sm:text-xl font-black" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>金</span>
              </span>
              <span className="text-jinbao-gold">Jin</span><span className="text-primary">Bao</span>
            </span>
            <span>Smart Market</span>
          </h1>
          <p className="text-sm text-muted-foreground mb-2 max-w-xl mx-auto">
            {t('home.tagline')}
          </p>
        </section>

        {/* Sticky Search Bar - Always visible */}
        <div className={`sticky z-30 transition-all duration-300 ${
          isScrolled ? 'top-0 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-background/95 backdrop-blur-sm shadow-sm' : 'top-auto mb-4'
        }`}>
          {/* Chinese decorative border when scrolled */}
          {isScrolled && (
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-jinbao-gold/60 to-transparent" />
          )}
          {isScrolled && (
            <>
              <div className="absolute top-0 left-2 text-jinbao-gold/20 text-[10px] font-bold tracking-widest select-none animate-fade-in" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                ◆ 金 ◆
              </div>
              <div className="absolute top-0 right-2 text-jinbao-gold/20 text-[10px] font-bold tracking-widest select-none animate-fade-in" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                ◆ 宝 ◆
              </div>
            </>
          )}
          <div className={`mx-auto relative flex items-center gap-2 ${isScrolled ? 'max-w-lg' : 'max-w-md'}`}>
            {/* Mascot avatar - appears when scrolled */}
            {isScrolled && (
              <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-primary/50 shadow-md animate-fade-in">
                <img
                  src={mascotImage}
                  alt="JinBao mascot logo"
                  className="w-full h-full object-cover object-top scale-125"
                />
              </div>
            )}
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder={useAIMode ? t('common.searchAI') : t('common.search')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSearchSuggestions(searchQuery.length === 0 && history.length > 0)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                className="w-full pl-10 pr-28 py-2.5 bg-input border border-border rounded-full text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary text-sm"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  aria-label="Effacer la recherche"
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {/* Image Search Button */}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isImageSearching}
                className="p-1.5 rounded-full transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50"
                title="Recherche par image"
              >
                {isImageSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSearch}
                className="hidden"
              />
              <button
                onClick={() => setUseAIMode(!useAIMode)}
                className={`p-1.5 rounded-full transition-colors ${
                  useAIMode 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={useAIMode ? t('home.disableAI') : t('home.enableAI')}
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
            {(isSearching || isImageSearching) && (
              <div className="absolute right-24 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
          </div>

          {/* AI / Image Search Interpretation */}
          {(interpretation && useAIMode) || imageSearchInterpretation ? (
            <p className="text-xs text-muted-foreground text-center mt-2">
              <Camera className="h-3 w-3 inline mr-1" />
              {imageSearchInterpretation || interpretation}
            </p>
          ) : null}
        </div>

        {/* Collapsible sections - New Drops, Categories, Quick Services */}
        <div className={`transition-all duration-300 overflow-hidden ${
          isScrolled ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
        }`}>
          {/* New Drops Stories Carousel */}
          <NewDropsCarousel />

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
                {t('home.code')}
              </Button>
              <Button 
                onClick={() => setIsCouponOpen(true)}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none border-primary text-primary hover:bg-primary hover:text-white text-xs max-w-[160px]"
              >
                {t('home.coupon')} ({couponItems.length})
              </Button>
            </div>
            
            <CategoryFilter 
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />

            {/* Quick Services */}
            <QuickServices />
          </section>
        </div>

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
                  isVerified={product.isVerified}
                  interestCount={product.interestCount}
                  priority={index < 6}
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
              {useAIMode && searchQuery ? t('home.noProductsAI') : t('home.noProducts')}
            </p>
          </div>
        )}
      </main>

      {/* Coupon Sheet */}
      <Sheet open={isCouponOpen} onOpenChange={setIsCouponOpen}>
        <SheetContent className="w-full sm:max-w-md bg-background border-border">
          <SheetHeader>
            <SheetTitle className="text-foreground">{t('home.myCoupon')}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />}>
              <CouponPanel
                items={couponItems}
                onRemoveItem={handleRemoveFromCoupon}
                onUpdateQuantity={handleUpdateCouponQuantity}
                onPurchase={handlePurchase}
                onGenerateCode={() => {}}
              />
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>

      {/* Load Coupon Modal */}
      <Suspense fallback={null}>
        <LoadCouponModal
          isOpen={isLoadCouponOpen}
          onClose={() => setIsLoadCouponOpen(false)}
          onLoadCoupon={handleLoadCoupon}
        />
      </Suspense>

      {/* Delivery Form Modal */}
      <Suspense fallback={null}>
        <DeliveryFormModal
          isOpen={isDeliveryFormOpen}
          onClose={() => setIsDeliveryFormOpen(false)}
          onSubmit={handleDeliverySubmit}
          total={couponItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
          items={couponItems}
        />
      </Suspense>

      {/* Purchase Confirmation Modal */}
      {showPurchaseConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-xl shadow-xl border border-border">
            <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />}>
              <PurchaseConfirmation 
                productName={purchasedProductName}
                onClose={handleCloseConfirmation}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* JinBao Onboarding - shows only on first visit */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <JinBaoOnboarding onComplete={handleOnboardingComplete} />
        </Suspense>
      )}
    </div>
  );
};

export default Home;
