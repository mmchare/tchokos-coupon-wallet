import { ShoppingBag, User, Menu, Sun, Moon, LogIn, Wallet, Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCoupon } from '@/contexts/CouponContext';
import { useAuth } from '@/contexts/AuthContext';
import CouponPanel from '@/components/CouponPanel';
import DeliveryFormModal from '@/components/DeliveryFormModal';
import PurchaseConfirmation from '@/components/PurchaseConfirmation';
import { useToast } from '@/hooks/use-toast';
import { formatBalance } from '@/lib/formatBalance';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [purchasedProductName, setPurchasedProductName] = useState('');
  const { couponItems: items, removeFromCoupon, updateQuantity, clearCoupon } = useCoupon();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const walletBalance = profile?.wallet_balance ?? 0;

  const handlePurchase = () => {
    setIsCouponOpen(false);
    setIsDeliveryFormOpen(true);
  };

  const handleDeliverySubmit = (data: { address: string; phone: string }) => {
    const productNames = items.length === 1 
      ? items[0].name 
      : `${items.length} articles`;
    
    setPurchasedProductName(productNames);
    setIsDeliveryFormOpen(false);
    setShowPurchaseConfirmation(true);
    clearCoupon();
  };

  const handleCloseConfirmation = () => {
    setShowPurchaseConfirmation(false);
    setPurchasedProductName('');
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="md:hidden text-foreground hover:bg-muted h-8 w-8"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 
                className="text-lg sm:text-2xl font-bold text-jinbao-red tracking-wider cursor-pointer"
                onClick={() => navigate('/')}
              >
                JinBao
              </h1>
            </div>

            {/* Wallet Balance - Gris Argent style */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2 animate-fade-in">
                <button 
                  onClick={() => navigate('/recharge')}
                  className="flex items-center gap-1 sm:gap-2 bg-muted hover:bg-muted/80 text-foreground px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all hover:scale-105 border border-border"
                >
                  <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-jinbao-silver" />
                  <span className="font-bold text-xs sm:text-sm">
                    {formatBalance(walletBalance)}
                  </span>
                </button>
                <button
                  onClick={() => navigate('/recharge')}
                  className="flex items-center justify-center bg-jinbao-red hover:bg-jinbao-red/90 text-white p-1.5 sm:p-2 rounded-lg transition-all hover:scale-105 shadow-lg"
                  title="Recharger"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} />
                </button>
              </div>
            ) : (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => navigate('/auth')}
                className="text-xs sm:text-sm border-jinbao-red text-jinbao-red hover:bg-jinbao-red hover:text-white"
              >
                <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Connexion</span>
              </Button>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-1 sm:space-x-4">
              {/* Coupon - Mobile Optimized */}
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsCouponOpen(true)}
                className="relative bg-transparent border-jinbao-red text-jinbao-red hover:bg-jinbao-red hover:text-white text-xs sm:text-sm px-2 sm:px-3"
              >
                <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Mon Coupon</span>
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-jinbao-blue text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 sm:h-10 sm:w-10"
              >
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 sm:h-5 sm:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>

              {/* Orders - Only visible when logged in */}
              {user && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/orders')}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 sm:h-10 sm:w-10"
                  title="Mes commandes"
                >
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}

              {/* Profile */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(user ? '/profile' : '/auth')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 sm:h-10 sm:w-10"
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Coupon Sheet */}
        <Sheet open={isCouponOpen} onOpenChange={setIsCouponOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-4 sm:p-6">
            <SheetHeader className="mb-4">
              <SheetTitle>Mon Coupon JinBao</SheetTitle>
            </SheetHeader>
            <CouponPanel
              items={items}
              onRemoveItem={removeFromCoupon}
              onUpdateQuantity={updateQuantity}
              onPurchase={handlePurchase}
              onGenerateCode={() => {
                // Code generation is handled inside CouponPanel
              }}
            />
          </SheetContent>
        </Sheet>
      </header>

      {/* Delivery Form Modal */}
      <DeliveryFormModal
        isOpen={isDeliveryFormOpen}
        onClose={() => setIsDeliveryFormOpen(false)}
        onSubmit={handleDeliverySubmit}
        total={total}
        items={items}
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
    </>
  );
};

export default Header;