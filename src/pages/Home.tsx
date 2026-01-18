import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Masonry from 'react-masonry-css';
import Header from '@/components/Header';
import Hero from '@/components/home/Hero';
import FeaturesSection from '@/components/home/FeaturesSection';
import CategoryGrid from '@/components/home/CategoryGrid';
import MasonryProductCard from '@/components/MasonryProductCard';
import LoadCouponModal from '@/components/LoadCouponModal';
import DeliveryFormModal from '@/components/DeliveryFormModal';
import PurchaseConfirmation from '@/components/PurchaseConfirmation';
import CouponPanel from '@/components/CouponPanel';
import OfflineIndicator from '@/components/OfflineIndicator';
import { ProductSkeletonGrid } from '@/components/ProductSkeleton';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Download, Loader2, ShoppingBag } from 'lucide-react';
import { useCoupon } from '@/contexts/CouponContext';
import { useSmartProducts } from '@/hooks/useSmartProducts';
import { useAISearch } from '@/hooks/useAISearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useOfflineProducts } from '@/hooks/useOfflineProducts';

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
  
  // Infinite scroll state
  const [displayCount, setDisplayCount] = useState(10);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSearchSuggestions(value.length === 0 && history.length > 0);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (useAIMode && value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        aiSearch(value);
      }, 500);
    } else if (value.length < 3) {
      clearSearch();
    }
  };

  // ok 
  const handleSearchSubmit = () => {
    if (searchQuery.trim().length >= 2) {
      addSearch(searchQuery.trim());
      setShowSearchSuggestions(false);
    }
  };

  const handleSelectSuggestion = (query: string) => {
    setSearchQuery(query);
    setShowSearchSuggestions(false);
    if (useAIMode && query.length >= 3) {
      aiSearch(query);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    clearSearch();
    setShowSearchSuggestions(false);
  };

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
          // Flexible category matching to map new visual categories to existing product categories
          if (activeCategory === 'all') {
            const matchesSearch = searchQuery === '' || 
              product.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
          }
          
          let matchCat = false;
          
          // Map visual categories to product categories
          // Map visual categories to product categories
          if (activeCategory === 'Iphones') {
            matchCat = product.name.toLowerCase().includes('iphone');
          } else if (activeCategory === 'Pixels') {
            matchCat = product.name.toLowerCase().includes('pixel');
          } else if (activeCategory === 'Xiaomi') {
            matchCat = product.name.toLowerCase().includes('xiaomi') || 
                       product.name.toLowerCase().includes('redmi');
          } else if (activeCategory === 'Samsung') {
            matchCat = product.name.toLowerCase().includes('samsung') || 
                       product.name.toLowerCase().includes('galaxy');
          } else if (activeCategory === 'Accessoires') {
            matchCat = product.category?.toLowerCase().includes('accessoire') || 
                       product.category?.toLowerCase().includes('accessory') ||
                       product.category?.toLowerCase().includes('écouteur') ||
                       product.category?.toLowerCase().includes('chargeur');
          } else if (activeCategory === 'Autres') {
            matchCat = product.category === 'Autres' || product.category === 'Other';
          } else if (activeCategory === 'bestsellers') {
             // Proxy for best sellers: High rating
             matchCat = product.rating >= 4.5;
          } else if (activeCategory === 'auctions') {
             matchCat = product.isAuction === true;
          } else {
            // Fallback to exact match logic if needed (e.g. for simple strings)
            matchCat = product.category === activeCategory;
          }

          const matchesSearch = searchQuery === '' || 
            product.name.toLowerCase().includes(searchQuery.toLowerCase());
          return matchCat && matchesSearch;
        });

  const visibleProducts = displayProducts.slice(0, displayCount);
  const hasMore = displayCount < displayProducts.length;

  useEffect(() => {
    setDisplayCount(10);
  }, [activeCategory, searchQuery, hasResults]);

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

  const breakpointColumns = {
    default: 4,
    1536: 4,
    1280: 3,
    1024: 3,
    768: 2,
    640: 2,
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <OfflineIndicator isOnline={isOnline} cachedProductsCount={offlineProducts.length} />
      
      <Header />

      {/* Hero Section */}
      <Hero
        searchQuery={searchQuery}
        useAIMode={useAIMode}
        isSearching={isSearching}
        interpretation={interpretation}
        showSearchSuggestions={showSearchSuggestions}
        history={history}
        searchInputRef={searchInputRef}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onSelectSuggestion={handleSelectSuggestion}
        onDeleteSearch={deleteSearch}
        onClearHistory={clearHistory}
        onToggleAI={() => setUseAIMode(!useAIMode)}
        setShowSearchSuggestions={setShowSearchSuggestions}
      />

      {/* Features Section */}
      <FeaturesSection />

      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-12">
        {/* Category Grid */}
        <CategoryGrid
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Popular Products Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-brand-secondary dark:text-brand-secondary font-bold text-xs tracking-widest uppercase mb-2">
                {t('home.fullCatalog')}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#222222] dark:text-white mb-3">
                {t('home.popularProducts')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl text-sm sm:text-base font-normal">
                {t('home.catalogDesc')}
              </p>
            </div>
            {visibleProducts.length > 0 && (
              <div className="hidden lg:block text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-full">
                {t('home.showing', { visible: visibleProducts.length, total: displayProducts.length })}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Masonry
            breakpointCols={breakpointColumns}
            className="masonry-grid"
            columnClassName="masonry-grid-column"
          >
            <ProductSkeletonGrid count={8} />
          </Masonry>
        )}

        {/* Product Grid */}
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
                  priority={index < 6}
                />
              ))}
            </Masonry>

            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-secondary dark:text-brand-secondary" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium">
                    {t('home.loadingMore')}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && displayProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <div className="p-5 bg-gray-100 dark:bg-gray-700 rounded-full mb-5">
              <Search className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('home.noProducts')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md text-center mb-6">
              {useAIMode && searchQuery 
                ? t('home.noProductsAI') 
                : t('home.noProductsDesc')}
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery(''); 
                setActiveCategory('all');
              }} 
              className="text-brand-secondary dark:text-brand-secondary border-brand-secondary dark:border-brand-secondary hover:bg-brand-secondary/5 dark:hover:bg-brand-secondary/10 font-semibold rounded-lg"
            >
              {t('home.clearFilters')}
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <Button 
          onClick={() => setIsLoadCouponOpen(true)}
          size="icon"
          variant="secondary"
          className="rounded-full h-14 w-14 shadow-card bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-[#222222] dark:text-gray-200 border border-gray-200 dark:border-gray-700"
          title={t('home.code')}
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button 
          onClick={() => setIsCouponOpen(true)}
          size="icon"
          className="rounded-full h-16 w-16 shadow-2xl bg-brand-secondary hover:bg-brand-secondary/90 text-white relative group font-bold"
        >
          <ShoppingBag className="h-7 w-7 group-hover:scale-110 transition-transform" />
          {couponItems.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-[11px] font-bold text-white ring-2 ring-white dark:ring-gray-900 animate-pulse">
              {couponItems.length}
            </span>
          )}
        </Button>
      </div>

      {/* Coupon Sheet */}
      <Sheet open={isCouponOpen} onOpenChange={setIsCouponOpen}>
        <SheetContent className="w-full sm:max-w-md bg-background border-border">
          <SheetHeader>
            <SheetTitle className="text-foreground">{t('home.myCoupon')}</SheetTitle>
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
