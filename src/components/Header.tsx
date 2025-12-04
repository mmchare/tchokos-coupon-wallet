import { ShoppingBag, User, Menu, Sun, Moon, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCoupon } from '@/contexts/CouponContext';
import { useAuth } from '@/contexts/AuthContext';
import CouponPanel from '@/components/CouponPanel';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const { couponItems: items, removeFromCoupon, updateQuantity } = useCoupon();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const walletBalance = profile?.wallet_balance ?? 0;

  return (
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
              className="text-lg sm:text-2xl font-bold text-pinbaoo-yellow tracking-wider cursor-pointer"
              onClick={() => navigate('/')}
            >
              PINBAOO
            </h1>
          </div>

          {/* Wallet Balance - Mobile Optimized */}
          {user ? (
            <button 
              onClick={() => navigate('/recharge')}
              className="wallet-balance animate-fade-in text-xs sm:text-sm hover:scale-105 transition-transform"
            >
              <span className="hidden sm:inline opacity-90">Solde:</span>
              <span className="sm:ml-2 font-bold">
                {walletBalance.toLocaleString()} F
              </span>
            </button>
          ) : (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth')}
              className="text-xs sm:text-sm border-pinbaoo-yellow text-pinbaoo-yellow hover:bg-pinbaoo-yellow hover:text-pinbaoo-dark"
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
              className="relative bg-transparent border-pinbaoo-yellow text-pinbaoo-yellow hover:bg-pinbaoo-yellow hover:text-pinbaoo-dark text-xs sm:text-sm px-2 sm:px-3"
            >
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Mon Coupon</span>
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-pinbaoo-green text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
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
            <SheetTitle>Mon Coupon</SheetTitle>
          </SheetHeader>
          <CouponPanel
            items={items}
            onRemoveItem={removeFromCoupon}
            onUpdateQuantity={updateQuantity}
            onPurchase={() => {
              toast({
                title: "Achat en cours...",
                description: "Fonctionnalité d'achat à venir",
              });
              setIsCouponOpen(false);
            }}
            onGenerateCode={() => {
              // Code generation is handled inside CouponPanel
            }}
          />
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Header;