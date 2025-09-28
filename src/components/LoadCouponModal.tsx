import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface CouponItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface LoadCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCoupon: (items: CouponItem[]) => void;
}

const LoadCouponModal = ({ isOpen, onClose, onLoadCoupon }: LoadCouponModalProps) => {
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLoadCoupon = () => {
    if (!couponCode.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un code coupon",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Récupérer le coupon depuis le localStorage
      const savedCoupon = localStorage.getItem(`coupon_${couponCode.toUpperCase()}`);
      
      if (!savedCoupon) {
        toast({
          title: "Code invalide",
          description: "Ce code coupon n'existe pas ou a expiré",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const couponData = JSON.parse(savedCoupon);
      onLoadCoupon(couponData.items);
      
      toast({
        title: "Coupon chargé !",
        description: `${couponData.items.length} article(s) ajouté(s) à votre coupon`,
      });
      
      setCouponCode('');
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le coupon",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Charger un Code Coupon</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Code Coupon
            </label>
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="TCH..."
              className="bg-gray-900 border-gray-700 text-white"
              maxLength={12}
            />
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleLoadCoupon}
              disabled={isLoading}
              className="flex-1 bg-accent hover:bg-accent/90"
            >
              {isLoading ? 'Chargement...' : 'Charger le Coupon'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-400 hover:bg-gray-800"
            >
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoadCouponModal;