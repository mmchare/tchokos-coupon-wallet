/**
 * Home page - PINBAOO E-commerce
 * Tech gadgets marketplace with coupon system
 */

import { useState } from 'react';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import CouponPanel from '@/components/CouponPanel';
import CategoryFilter from '@/components/CategoryFilter';
import LoadCouponModal from '@/components/LoadCouponModal';
import DeliveryFormModal from '@/components/DeliveryFormModal';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
  const [searchQuery, setSearchQuery] = useState('');

  // Tech products data - Prix super attractifs !
  const products: Product[] = [
    {
      id: '1',
      name: 'iPhone 15 Pro Max 256GB',
      price: 350000,
      originalPrice: 950000,
      category: 'Smartphones',
      rating: 4.9,
      image: iphoneImg
    },
    {
      id: '2',
      name: 'Samsung Galaxy S24 Ultra',
      price: 280000,
      originalPrice: 780000,
      category: 'Smartphones',
      rating: 4.8,
      image: samsungImg
    },
    {
      id: '3',
      name: 'MacBook Pro M3 14" 512GB',
      price: 450000,
      originalPrice: 1400000,
      category: 'Ordinateurs',
      rating: 4.9,
      image: macbookImg
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

  const categories = ['Tous', 'Smartphones', 'Ordinateurs', 'Tablettes', 'Accessoires'];

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'Tous' || product.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCoupon = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    addToCoupon({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });

    toast({
      title: "Ajouté au coupon !",
      description: `${product.name} a été ajouté à votre coupon`,
    });
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
    toast({
      title: "Commande confirmée !",
      description: "Votre commande a été traitée. Livraison gratuite sous 10-14 jours !",
    });
    setIsDeliveryFormOpen(false);
    clearCoupon();
    setIsCouponOpen(false);
  };

  const handleGenerateCode = () => {
    // This is handled in CouponPanel component
  };

  const handleLoadCoupon = (items: CouponItem[]) => {
    loadCoupon(items);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => {}} />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Hero Section */}
        <section className="text-center mb-8 sm:mb-12 animate-fade-in px-2">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
            Bienvenue sur{' '}
            <span className="text-pinbaoo-yellow">PINBAOO</span>
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground mb-2 max-w-xl mx-auto px-4">
            L'assurance d'un achat vérifié en Chine
          </p>
          <p className="text-sm sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Découvrez notre collection premium de gadgets tech : smartphones, tablettes, ordinateurs portables et accessoires. 
            Ajoutez vos produits favoris à votre coupon personnalisé.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative mb-6 sm:mb-8 px-4">
            <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 sm:h-5 sm:w-5" />
            <input 
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-pinbaoo-yellow text-sm sm:text-base"
            />
          </div>
        </section>

        {/* Category Filter */}
        <section className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground px-2 sm:px-0">Nos Produits</h2>
            <div className="flex space-x-2 sm:space-x-3 px-2 sm:px-0">
              <Button 
                onClick={() => setIsLoadCouponOpen(true)}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Charger </span>Code
              </Button>
              <Sheet open={isCouponOpen} onOpenChange={setIsCouponOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-pinbaoo-yellow text-pinbaoo-yellow hover:bg-pinbaoo-yellow hover:text-pinbaoo-dark text-xs sm:text-sm flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">Mon </span>Coupon ({couponItems.length})
                  </Button>
                </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md bg-background border-border">
                <SheetHeader>
                  <SheetTitle className="text-foreground">Mon Coupon PINBAOO</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <CouponPanel
                    items={couponItems}
                    onRemoveItem={handleRemoveFromCoupon}
                    onUpdateQuantity={handleUpdateCouponQuantity}
                    onPurchase={handlePurchase}
                    onGenerateCode={handleGenerateCode}
                  />
                </div>
              </SheetContent>
            </Sheet>
            </div>
          </div>
          
          <CategoryFilter 
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </section>

        {/* Products Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 px-2 sm:px-0">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onAddToCoupon={handleAddToCoupon}
            />
          ))}
        </section>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Aucun produit trouvé dans cette catégorie
            </p>
          </div>
        )}
      </main>

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
      />
    </div>
  );
};

export default Home;