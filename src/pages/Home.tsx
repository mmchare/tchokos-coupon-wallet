import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import CouponPanel from '@/components/CouponPanel';
import CategoryFilter from '@/components/CategoryFilter';
import LoadCouponModal from '@/components/LoadCouponModal';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, Filter, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import product images
import sneakersImg from '@/assets/product-sneakers-1.jpg';
import tshirtImg from '@/assets/product-tshirt-1.jpg';
import bagImg from '@/assets/product-bag-1.jpg';
import heelsImg from '@/assets/product-heels-1.jpg';

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
  const [walletBalance] = useState(125000);
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [couponItems, setCouponItems] = useState<CouponItem[]>([]);
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isLoadCouponOpen, setIsLoadCouponOpen] = useState(false);

  // Sample products data
  const products: Product[] = [
    {
      id: '1',
      name: 'Sneakers Premium Noir',
      price: 45000,
      originalPrice: 60000,
      category: 'Chaussures',
      rating: 4.8,
      image: sneakersImg
    },
    {
      id: '2',
      name: 'T-Shirt Designer Blanc',
      price: 15000,
      category: 'Vêtements',
      rating: 4.6,
      image: tshirtImg
    },
    {
      id: '3',
      name: 'Sac à Main Cuir Premium',
      price: 75000,
      originalPrice: 95000,
      category: 'Accessoires',
      rating: 4.9,
      image: bagImg
    },
    {
      id: '4',
      name: 'Escarpins Rouge Élégants',
      price: 55000,
      category: 'Chaussures',
      rating: 4.7,
      image: heelsImg
    },
  ];

  const categories = ['Tous', 'Chaussures', 'Vêtements', 'Accessoires'];

  const filteredProducts = activeCategory === 'Tous' 
    ? products 
    : products.filter(product => product.category === activeCategory);

  const handleAddToCoupon = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = couponItems.find(item => item.id === productId);
    
    if (existingItem) {
      setCouponItems(prev => 
        prev.map(item => 
          item.id === productId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCouponItems(prev => [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1
      }]);
    }

    toast({
      title: "Ajouté au coupon !",
      description: `${product.name} a été ajouté à votre coupon`,
    });
  };

  const handleRemoveFromCoupon = (productId: string) => {
    setCouponItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleUpdateCouponQuantity = (productId: string, quantity: number) => {
    setCouponItems(prev => 
      prev.map(item => 
        item.id === productId 
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handlePurchase = () => {
    toast({
      title: "Commande confirmée !",
      description: "Votre commande a été traitée avec succès",
    });
    setCouponItems([]);
    setIsCouponOpen(false);
  };

  const handleGenerateCode = () => {
    // This is handled in CouponPanel component
  };

  const handleLoadCoupon = (items: CouponItem[]) => {
    // Fusionner avec les articles existants
    const existingIds = couponItems.map(item => item.id);
    const newItems = items.filter(item => !existingIds.includes(item.id));
    const updatedExisting = couponItems.map(existingItem => {
      const matchingItem = items.find(item => item.id === existingItem.id);
      return matchingItem 
        ? { ...existingItem, quantity: existingItem.quantity + matchingItem.quantity }
        : existingItem;
    });
    
    setCouponItems([...updatedExisting, ...newItems]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        walletBalance={walletBalance}
        couponItems={couponItems.length}
        onMenuClick={() => {}}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <section className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Bienvenue sur{' '}
            <span className="text-gradient">TCHOKOS</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Découvrez notre collection premium de chaussures, vêtements et accessoires. 
            Ajoutez vos articles favoris à votre coupon personnalisé.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input 
              type="text"
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent"
            />
          </div>
        </section>

        {/* Category Filter */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Nos Produits</h2>
            <div className="flex space-x-3">
              <Button 
                onClick={() => setIsLoadCouponOpen(true)}
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Charger Code
              </Button>
              <Sheet open={isCouponOpen} onOpenChange={setIsCouponOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent hover:text-white"
                  >
                    Mon Coupon ({couponItems.length})
                  </Button>
                </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md bg-gray-950 border-gray-800">
                <SheetHeader>
                  <SheetTitle className="text-white">Mon Coupon TCHOKOS</SheetTitle>
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
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <p className="text-gray-400 text-lg">
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
    </div>
  );
};

export default Home;