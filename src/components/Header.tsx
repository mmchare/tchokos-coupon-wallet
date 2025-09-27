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
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden text-white hover:bg-gray-800"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white tracking-wider">
              TCHOKOS
            </h1>
          </div>

          {/* Wallet Balance */}
          <div className="wallet-balance animate-fade-in">
            <span className="text-sm opacity-90">Solde:</span>
            <span className="ml-2 font-bold">
              {walletBalance.toLocaleString()} FCFA
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Coupon */}
            <Button 
              variant="outline"
              size="sm"
              className="relative bg-transparent border-accent text-accent hover:bg-accent hover:text-white"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Mon Coupon
              {couponItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {couponItems}
                </span>
              )}
            </Button>

            {/* Profile */}
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-gray-800"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;