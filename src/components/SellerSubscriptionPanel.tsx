import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Crown, Check, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatBalance } from '@/lib/formatBalance';

interface Props {
  sellerProfile: {
    id: string;
    subscription_tier?: 'free' | 'premium';
    subscription_expires_at?: string | null;
  };
  walletBalance: number;
  onUpdated: () => void;
}

const PREMIUM_PRICE = 5000;

export default function SellerSubscriptionPanel({ sellerProfile, walletBalance, onUpdated }: Props) {
  const { toast } = useToast();
  const [activeSub, setActiveSub] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  const tier = sellerProfile.subscription_tier || 'free';
  const expiresAt = sellerProfile.subscription_expires_at;
  const isActive = tier === 'premium' && expiresAt && new Date(expiresAt) > new Date();
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)) : 0;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('seller_subscriptions')
        .select('*')
        .eq('seller_id', sellerProfile.id)
        .eq('status', 'active')
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveSub(data);
      if (data) setAutoRenew(data.auto_renew);
    })();
  }, [sellerProfile.id]);

  const subscribe = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('subscribe_seller_premium', { p_auto_renew: autoRenew });
    setLoading(false);
    if (error || !(data as any)?.success) {
      toast({ title: 'Erreur', description: (data as any)?.error || error?.message || 'Échec', variant: 'destructive' });
      return;
    }
    toast({ title: '🎉 Premium activé !', description: 'Commission réduite à 10% pour 30 jours.' });
    onUpdated();
  };

  const toggleAutoRenew = async (v: boolean) => {
    setAutoRenew(v);
    if (!v && activeSub) {
      await supabase.rpc('cancel_premium_auto_renew');
      toast({ title: 'Renouvellement automatique désactivé' });
    }
  };

  return (
    <div className="space-y-3">
      {isActive ? (
        <Card className="border-jinbao-gold/40 bg-gradient-to-br from-jinbao-gold/10 to-jinbao-red/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-jinbao-gold" />
              <span className="font-bold">Premium actif</span>
              <Badge className="bg-jinbao-gold text-black ml-auto">Commission 10%</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Expire le <strong className="text-foreground">{new Date(expiresAt!).toLocaleDateString('fr-FR')}</strong>
              {' '}({daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''})
            </p>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <p className="text-sm font-medium">Renouvellement automatique</p>
                <p className="text-xs text-muted-foreground">Débite {formatBalance(PREMIUM_PRICE)} chaque mois</p>
              </div>
              <Switch checked={autoRenew} onCheckedChange={toggleAutoRenew} />
            </div>
            <Button onClick={subscribe} disabled={loading || walletBalance < PREMIUM_PRICE} variant="outline" className="w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Prolonger 30 jours ({formatBalance(PREMIUM_PRICE)})
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-jinbao-gold/40 bg-gradient-to-br from-jinbao-gold/10 to-jinbao-red/5">
          <CardContent className="p-4 space-y-4">
            <div className="text-center">
              <Crown className="w-10 h-10 text-jinbao-gold mx-auto mb-2" />
              <h3 className="text-lg font-bold">Passez Premium</h3>
              <p className="text-2xl font-extrabold text-jinbao-gold mt-1">{formatBalance(PREMIUM_PRICE)}<span className="text-sm font-normal text-muted-foreground"> / mois</span></p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Commission 10%</strong> au lieu de 20% (Free)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Badge Premium sur votre boutique</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Renouvellement auto via portefeuille</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Annulable à tout moment</span>
              </li>
            </ul>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm">Activer le renouvellement auto</span>
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            </div>
            <Button
              onClick={subscribe}
              disabled={loading || walletBalance < PREMIUM_PRICE}
              className="w-full bg-jinbao-gold hover:bg-jinbao-gold/90 text-black"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
              {walletBalance < PREMIUM_PRICE
                ? `Solde insuffisant (${formatBalance(walletBalance)})`
                : 'Activer Premium'}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Paiement débité de votre portefeuille vendeur
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3">
          <p className="text-xs font-medium mb-2 text-muted-foreground">Comparaison</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border border-border rounded-lg p-2">
              <p className="font-bold mb-1">Free</p>
              <p className="text-muted-foreground">Commission 20%</p>
              <p className="text-muted-foreground">Gratuit</p>
            </div>
            <div className="border border-jinbao-gold/40 rounded-lg p-2 bg-jinbao-gold/5">
              <p className="font-bold mb-1 flex items-center gap-1"><Crown className="w-3 h-3 text-jinbao-gold" /> Premium</p>
              <p className="text-jinbao-gold font-medium">Commission 10%</p>
              <p className="text-muted-foreground">{formatBalance(PREMIUM_PRICE)}/mois</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
