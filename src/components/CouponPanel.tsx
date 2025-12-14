import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, ShoppingCart, Code, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const handleWhatsAppShare = () => {
    if (!couponCode) {
      toast({
        title: "Code requis",
        description: "Générez d'abord un code de partage",
        variant: "destructive",
      });
      return;
    }
    
    const message = encodeURIComponent(
      `🛒 Découvrez ma sélection JinBao !\n\n` +
      `📋 Code coupon : ${couponCode}\n\n` +
      `Chargez ce code sur JinBao Smart Market pour voir les produits !\n` +
      `👉 Premium Tech • Confiance • Efficacité`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleGenerateCode = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour générer un code",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    const code = `JINBAO${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    try {
      const { error } = await supabase
        .from('shared_coupons')
        .insert({
          code,
          items: JSON.parse(JSON.stringify(items)),
          creator_id: user.id,
        });

      if (error) throw error;

      setCouponCode(code);
      onGenerateCode();
      toast({
        title: "Code généré !",
        description: `Votre code coupon: ${code}`,
      });
    } catch (error) {
      console.error('Error generating coupon code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le code",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };


  if (items.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="text-muted-foreground mb-4">
          <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Votre coupon est vide</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Mon Coupon</h2>
        <Badge variant="secondary" className="bg-jinbao-red text-white text-xs sm:text-sm">
          {items.length} article{items.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Items List */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-3 p-2 sm:p-3 bg-muted rounded-lg">
            <img 
              src={item.image} 
              alt={item.name}
              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleProductClick(item.id)}
            />
            <div 
              className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleProductClick(item.id)}
            >
              <h4 className="font-medium text-foreground text-xs sm:text-sm truncate hover:text-jinbao-red transition-colors">{item.name}</h4>
              <p className="text-muted-foreground text-xs">
                {item.price.toLocaleString()} F × {item.quantity}
              </p>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-foreground text-xs sm:text-sm w-6 text-center">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:bg-destructive/20"
                onClick={() => onRemoveItem(item.id)}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-3 sm:my-4" />

      {/* Total */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <span className="text-base sm:text-lg font-semibold text-foreground">Total:</span>
        <span className="text-lg sm:text-2xl font-bold text-jinbao-red">
          {total.toLocaleString()} F
        </span>
      </div>

      {/* Code Section */}
      {couponCode && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-muted rounded-lg border border-jinbao-red/20">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Code Coupon:</p>
              <p className="font-mono text-jinbao-red font-bold text-sm sm:text-base">{couponCode}</p>
            </div>
            <Button
              onClick={handleWhatsAppShare}
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Partager sur WhatsApp
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 sm:space-y-3">
        <Button 
          onClick={onPurchase}
          className="buy-button w-full text-sm sm:text-base"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Acheter Maintenant
        </Button>
        
        <Button 
          onClick={handleGenerateCode}
          variant="outline"
          disabled={isGenerating}
          className="w-full border-jinbao-red text-jinbao-red hover:bg-jinbao-red hover:text-white text-sm sm:text-base"
        >
          <Code className="h-4 w-4 mr-2" />
          {isGenerating ? 'Génération...' : 'Générer Code de Partage'}
        </Button>
      </div>
    </Card>
  );
};

export default CouponPanel;