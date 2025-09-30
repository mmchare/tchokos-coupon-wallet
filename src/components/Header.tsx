import { ShoppingBag, User, Menu, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  walletBalance: number;
  couponItems: number;
  onMenuClick?: () => void;
}

const Header = ({ walletBalance, couponItems, onMenuClick }: HeaderProps) => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

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
            <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-wider">
              TCHOKOS
            </h1>
          </div>

          {/* Wallet Balance - Mobile Optimized */}
          <button 
            onClick={() => navigate('/recharge')}
            className="wallet-balance animate-fade-in text-xs sm:text-sm hover:scale-105 transition-transform"
          >
            <span className="hidden sm:inline opacity-90">Solde:</span>
            <span className="sm:ml-2 font-bold">
              {walletBalance.toLocaleString()} F
            </span>
          </button>

          {/* Actions */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Coupon - Mobile Optimized */}
            <Button 
              variant="outline"
              size="sm"
              className="relative bg-transparent border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs sm:text-sm px-2 sm:px-3"
            >
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Mon Coupon</span>
              {couponItems > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-accent text-accent-foreground text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                  {couponItems}
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
              onClick={() => navigate('/profile')}
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 sm:h-10 sm:w-10"
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