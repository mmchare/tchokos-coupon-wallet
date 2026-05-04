import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Store, Star, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  productId: string;
  sellerId: string;
}

export const ProductSellerCard = ({ productId, sellerId }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [seller, setSeller] = useState<any>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!sellerId) return;
    supabase
      .from('seller_profiles')
      .select('id, user_id, shop_name, rating, total_sales, verification_status')
      .eq('id', sellerId)
      .maybeSingle()
      .then(({ data }) => setSeller(data));
  }, [sellerId]);

  if (!seller || seller.verification_status !== 'verified') return null;

  const startChat = async () => {
    if (!user) { navigate('/auth'); return; }
    if (seller.user_id === user.id) return;
    setStarting(true);
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('seller_id', seller.user_id)
      .eq('product_id', productId)
      .maybeSingle();

    let convId = existing?.id;
    if (!convId) {
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ buyer_id: user.id, seller_id: seller.user_id, product_id: productId })
        .select('id')
        .single();
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        setStarting(false);
        return;
      }
      convId = created.id;
    }
    navigate(`/messages?c=${convId}`);
  };

  return (
    <Card className="p-4 mt-3 bg-card border-border">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/seller/${seller.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
            {(seller.shop_name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold truncate">{seller.shop_name || 'Vendeur JinBao'}</span>
              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{Number(seller.rating || 0).toFixed(1)}</span>
              <span>{seller.total_sales || 0} ventes</span>
            </div>
          </div>
        </button>
        {seller.user_id !== user?.id && (
          <Button size="sm" onClick={startChat} disabled={starting} className="gap-1">
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Contacter
          </Button>
        )}
      </div>
    </Card>
  );
};
