/**
 * Home page - JinBao Smart Market
 * Masonry Grid Layout (Xianyu/Pinterest style)
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
import { Search, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCoupon } from '@/contexts/CouponContext';

// Import product images
import iphoneImg from '@/assets/product-iphone-15-pro.jpg';
import samsungImg from '@/assets/product-samsung-s24.jpg';
import macbookImg from '@/assets/product-macbook-pro.jpg';
import ipadImg from '@/assets/product-ipad-air.jpg';
import powerbankImg from '@/assets/product-powerbank.jpg';
import ringLightImg from '@/assets/product-ring-light.jpg';

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

  // Tech products data
  const products: Product[] = [
    {
      id: '1',
      name: 'iPhone 15 Pro Max 256GB',
      price: 350000,
      originalPrice: 950000,
      category: 'Smartphones',
      rating: 4.9,
      image: iphoneImg,
      isAuction: true,
    },
    {
      id: '2',
      name: 'Samsung Galaxy S24 Ultra',
      price: 280000,
      originalPrice: 780000,
      category: 'Smartphones',
      rating: 4.8,
      image: samsungImg,
      isAuction: true,
    },
    {
      id: '3',
      name: 'MacBook Pro M3 14" 512GB',
      price: 450000,
      originalPrice: 1400000,
      category: 'Ordinateurs',
      rating: 4.9,
      image: macbookImg,
    },
    {
      id: '4',
      name: 'iPad Air M2 11" 256GB',
      price: 180000,
      originalPrice: 520000,
      category: 'Tablettes',
      rating: 4.7,
      image: ipadImg
    },
    {
      id: '5',
      name: 'Google Pixel 8 Pro 512GB',
      price: 250000,
      originalPrice: 720000,
      category: 'Smartphones',
      rating: 4.8,
      image: iphoneImg
    },
    {
      id: '6',
      name: 'Dell XPS 15 Intel i9 1TB',
      price: 380000,
      originalPrice: 980000,
      category: 'Ordinateurs',
      rating: 4.7,
      image: macbookImg
    },
    {
      id: '7',
      name: 'Samsung Galaxy Tab S9 Ultra',
      price: 220000,
      originalPrice: 650000,
      category: 'Tablettes',
      rating: 4.8,
      image: ipadImg
    },
    {
      id: '8',
      name: 'Power Bank Anker 30000mAh',
      price: 12000,
      originalPrice: 35000,
      category: 'Accessoires',
      rating: 4.6,
      image: powerbankImg
    },
    {
      id: '9',
      name: 'Coque iPhone Spigen Ultra Hybrid',
      price: 2500,
      originalPrice: 8000,
      category: 'Accessoires',
      rating: 4.7,
      image: iphoneImg
    },
    {
      id: '10',
      name: 'Ring Light LED 18 pouces',
      price: 15000,
      originalPrice: 55000,
      category: 'Accessoires',
      rating: 4.8,
      image: ringLightImg
    },
    {
      id: '11',
      name: 'OnePlus 12 Pro 16GB RAM',
      price: 220000,
      originalPrice: 580000,
      category: 'Smartphones',
      rating: 4.7,
      image: samsungImg
    },
    {
      id: '12',
      name: 'Batterie externe Xiaomi 20000mAh',
      price: 9000,
      originalPrice: 35000,
      category: 'Accessoires',
      rating: 4.6,
      image: powerbankImg
    },
  ];

  const categories = ['Tous', 'Enchères', 'Smartphones', 'Ordinateurs', 'Tablettes', 'Accessoires'];

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

        {/* Masonry Products Grid */}
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

        {/* Empty State */}
        {filteredProducts.length === 0 && (
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