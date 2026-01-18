import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Masonry from 'react-masonry-css';
import Header from '@/components/Header';
import CategoryGrid from '@/components/home/CategoryGrid';
import MasonryProductCard from '@/components/MasonryProductCard';
import OfflineIndicator from '@/components/OfflineIndicator';
import { ProductSkeletonGrid } from '@/components/ProductSkeleton';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import { Loader2, Search, ArrowLeft } from 'lucide-react';
import { useSmartProducts } from '@/hooks/useSmartProducts';
import { useOfflineProducts } from '@/hooks/useOfflineProducts';

const Catalog = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const categoryParam = searchParams.get('category') || 'all';
  const queryParam = searchParams.get('q') || '';

  const { products, isLoading } = useSmartProducts();
  const { offlineProducts, isOnline } = useOfflineProducts();
  
  const [displayCount, setDisplayCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Filter products based on URL params
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
      })).filter(product => {
        let matchCat = true;
        let matchSearch = true;

        if (categoryParam !== 'all') {
             // Map activeCategory logic from Home (should be shared util ideally)
             if (categoryParam === 'Iphones') matchCat = product.name.toLowerCase().includes('iphone');
             else if (categoryParam === 'Pixels') matchCat = product.name.toLowerCase().includes('pixel');
             else if (categoryParam === 'Xiaomi') matchCat = product.name.toLowerCase().includes('xiaomi') || product.name.toLowerCase().includes('redmi');
             else if (categoryParam === 'Samsung') matchCat = product.name.toLowerCase().includes('samsung') || product.name.toLowerCase().includes('galaxy');
             else if (categoryParam === 'Accessoires') matchCat = product.category?.toLowerCase().includes('accessoire') || product.category?.toLowerCase().includes('accessory');
             else if (categoryParam === 'Autres') matchCat = product.category === 'Autres' || product.category === 'Other';
             else if (categoryParam === 'bestsellers') matchCat = product.rating >= 4.5;
             else if (categoryParam === 'auctions') matchCat = product.isAuction === true;
             else matchCat = product.category === categoryParam;
        }

        if (queryParam) {
           matchSearch = product.name.toLowerCase().includes(queryParam.toLowerCase());
        }

        return matchCat && matchSearch;
      })
    : products.filter(product => {
        let matchCat = true;
        let matchSearch = true;

        if (categoryParam !== 'all') {
             if (categoryParam === 'Iphones') matchCat = product.name.toLowerCase().includes('iphone');
             else if (categoryParam === 'Pixels') matchCat = product.name.toLowerCase().includes('pixel');
             else if (categoryParam === 'Xiaomi') matchCat = product.name.toLowerCase().includes('xiaomi') || product.name.toLowerCase().includes('redmi');
             else if (categoryParam === 'Samsung') matchCat = product.name.toLowerCase().includes('samsung') || product.name.toLowerCase().includes('galaxy');
             else if (categoryParam === 'Accessoires') matchCat = product.category?.toLowerCase().includes('accessoire') || product.category?.toLowerCase().includes('accessory');
             else if (categoryParam === 'Autres') matchCat = product.category === 'Autres' || product.category === 'Other';
             else if (categoryParam === 'bestsellers') matchCat = product.rating >= 4.5;
             else if (categoryParam === 'auctions') matchCat = product.isAuction === true;
             else matchCat = product.category === categoryParam;
        }

        if (queryParam) {
           matchSearch = product.name.toLowerCase().includes(queryParam.toLowerCase());
        }

        return matchCat && matchSearch;
    });

  const visibleProducts = displayProducts.slice(0, displayCount);
  const hasMore = displayCount < displayProducts.length;

  useEffect(() => {
    setDisplayCount(12);
  }, [categoryParam, queryParam]);

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

  const handleCategoryChange = (cat: string) => {
    // If selecting 'all', just clear category but keep search? Or clear both?
    // Usually clear category.
    const newParams = new URLSearchParams(searchParams);
    if (cat === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', cat);
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <OfflineIndicator isOnline={isOnline} cachedProductsCount={offlineProducts.length} />
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-8">
        {/* Back and Title */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
             <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold dark:text-white">
            {queryParam ? `Search: "${queryParam}"` : t('home.fullCatalog')} 
          </h1>
        </div>

        {/* Category Filter */}
        <CategoryGrid
           activeCategory={categoryParam}
           onCategoryChange={handleCategoryChange}
        />

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
               {t('home.showing', { visible: visibleProducts.length, total: displayProducts.length })}
            </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Masonry breakpointCols={breakpointColumns} className="masonry-grid" columnClassName="masonry-grid-column">
            <ProductSkeletonGrid count={8} />
          </Masonry>
        )}

        {/* Products */}
        {!isLoading && visibleProducts.length > 0 && (
          <>
            <Masonry breakpointCols={breakpointColumns} className="masonry-grid" columnClassName="masonry-grid-column">
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
                  priority={index < 4}
                />
              ))}
            </Masonry>

            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-16">
                 <Loader2 className="h-8 w-8 animate-spin text-brand-secondary" />
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && displayProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
             <Search className="h-10 w-10 text-gray-400 mb-4" />
             <h3 className="text-xl font-bold dark:text-white mb-2">{t('home.noProducts')}</h3>
             <p className="text-gray-500 mb-6">{t('home.noProductsDesc')}</p>
             <Button variant="outline" onClick={handleClearFilters}>
               {t('home.clearFilters')}
             </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Catalog;
