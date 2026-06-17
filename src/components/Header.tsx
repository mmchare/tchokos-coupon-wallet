import { ShoppingBag, User, Sun, Moon, LogIn, Wallet, Package } from 'lucide-react';
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
import { useNotifications } from '@/hooks/useNotifications';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Header = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [purchasedProductName, setPurchasedProductName] = useState('');
  const { couponItems: items, removeFromCoupon, updateQuantity, clearCoupon } = useCoupon();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { unreadCount } = useNotifications();

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
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-3 lg:max-w-7xl">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <h1 
              className="text-lg sm:text-2xl font-bold tracking-wider cursor-pointer shrink-0 flex items-center gap-1.5"
              onClick={() => navigate('/')}
            >
              <span className="w-7 h-7 sm:w-8 sm:h-8 border border-jinbao-gold rounded-sm flex items-center justify-center bg-jinbao-gold/10 text-jinbao-gold text-sm sm:text-base font-black">金</span>
              <span><span className="text-jinbao-gold">Jin</span><span className="text-primary">Bao</span></span>
            </h1>

            {/* Center Actions - Wallet + Coupon */}
            <div className="flex items-center gap-3 flex-1 justify-center">
              {/* Wallet Balance or Login */}
              {user ? (
                <button 
                  onClick={() => navigate('/recharge')}
                  className="flex items-center gap-1.5 bg-vibrant-yellow/15 hover:bg-vibrant-yellow/25 text-foreground px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all hover:scale-105 border border-vibrant-yellow/30 h-8 sm:h-9"
                >
                  <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-vibrant-yellow" />
                  <span className="font-bold text-xs sm:text-sm text-vibrant-yellow">
                    {formatBalance(walletBalance)}
                  </span>
                </button>
              ) : (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="text-xs sm:text-sm border-primary text-primary hover:bg-primary hover:text-white h-8 sm:h-9"
                >
                  <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden xs:inline">{t('auth.login')}</span>
                </Button>
              )}

              {/* Coupon Button */}
              <button 
                onClick={() => setIsCouponOpen(true)}
                className="relative flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all hover:scale-105 border border-primary/30 h-8 sm:h-9"
              >
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-xs sm:text-sm font-medium">Coupon</span>
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-jinbao-blue text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>

              {/* Orders - Only visible when logged in */}
              {user && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/orders')}
                  className="relative text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
                  title={t('nav.orders')}
                >
                  <Package className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              )}

              {/* Profile */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(user ? '/profile' : '/auth')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
              >
                <User className="h-4 w-4" />
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