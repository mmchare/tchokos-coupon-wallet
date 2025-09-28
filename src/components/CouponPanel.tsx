import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Share2, Minus, Plus, ShoppingCart, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CouponItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CouponPanelProps {
  items: CouponItem[];
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onPurchase: () => void;
  onGenerateCode: () => void;
}

const CouponPanel = ({ 
  items, 
  onRemoveItem, 
  onUpdateQuantity, 
  onPurchase, 
  onGenerateCode 
}: CouponPanelProps) => {
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleGenerateCode = () => {
    const code = `TCH${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setCouponCode(code);
    
    // Sauvegarder le coupon dans le localStorage pour partage
    const couponData = {
      code,
      items,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(`coupon_${code}`, JSON.stringify(couponData));
    
    onGenerateCode();
    toast({
      title: "Code généré !",
      description: `Votre code coupon: ${code}`,
    });
  };

  const handleShareCode = () => {
    if (couponCode) {
      navigator.clipboard.writeText(couponCode);
      toast({
        title: "Code copié !",
        description: "Le code a été copié dans le presse-papiers",
      });
    }
  };

  if (items.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="text-gray-400 mb-4">
          <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Votre coupon est vide</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-white">Mon Coupon</h2>
        <Badge variant="secondary" className="bg-accent text-white text-xs sm:text-sm">
          {items.length} article{items.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Items List */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-3 p-2 sm:p-3 bg-gray-900 rounded-lg">
            <img 
              src={item.image} 
              alt={item.name}
              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white text-xs sm:text-sm truncate">{item.name}</h4>
              <p className="text-gray-400 text-xs">
                {item.price.toLocaleString()} F × {item.quantity}
              </p>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 border-gray-600 text-gray-400 hover:bg-gray-800"
                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-white text-xs sm:text-sm w-6 text-center">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 border-gray-600 text-gray-400 hover:bg-gray-800"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-400 hover:bg-red-900/20"
                onClick={() => onRemoveItem(item.id)}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-3 sm:my-4 bg-gray-800" />

      {/* Total */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <span className="text-base sm:text-lg font-semibold text-white">Total:</span>
        <span className="text-lg sm:text-2xl font-bold text-accent">
          {total.toLocaleString()} F
        </span>
      </div>

      {/* Code Section */}
      {couponCode && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-900 rounded-lg border border-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-400 mb-1">Code Coupon:</p>
              <p className="font-mono text-accent font-bold text-sm sm:text-base">{couponCode}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareCode}
              className="border-accent text-accent hover:bg-accent hover:text-white"
            >
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 sm:space-y-3">
        <Button 
          onClick={onPurchase}
          className="coupon-button w-full text-sm sm:text-base"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Acheter Maintenant
        </Button>
        
        <Button 
          onClick={handleGenerateCode}
          variant="outline"
          className="w-full border-accent text-accent hover:bg-accent hover:text-white text-sm sm:text-base"
        >
          <Code className="h-4 w-4 mr-2" />
          Générer Code de Partage
        </Button>
      </div>
    </Card>
  );
};

export default CouponPanel;