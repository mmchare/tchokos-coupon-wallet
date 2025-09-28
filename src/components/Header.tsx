import { ShoppingBag, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  walletBalance: number;
  couponItems: number;
  onMenuClick?: () => void;
}

const Header = ({ walletBalance, couponItems, onMenuClick }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden text-white hover:bg-gray-800 h-8 w-8"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wider">
              TCHOKOS
            </h1>
          </div>

          {/* Wallet Balance - Mobile Optimized */}
          <div className="wallet-balance animate-fade-in text-xs sm:text-sm">
            <span className="hidden sm:inline opacity-90">Solde:</span>
            <span className="sm:ml-2 font-bold">
              {walletBalance.toLocaleString()} F
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Coupon - Mobile Optimized */}
            <Button 
              variant="outline"
              size="sm"
              className="relative bg-transparent border-accent text-accent hover:bg-accent hover:text-white text-xs sm:text-sm px-2 sm:px-3"
            >
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Mon Coupon</span>
              {couponItems > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-accent text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                  {couponItems}
                </span>
              )}
            </Button>

            {/* Profile */}
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-gray-800 h-8 w-8 sm:h-10 sm:w-10"
            >
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;