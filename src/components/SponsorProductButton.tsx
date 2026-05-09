import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  productId: string;
  sponsoredUntil?: string | null;
  onUpdated?: () => void;
}

const COST_PER_DAY = 500;
const OPTIONS = [1, 3, 7, 14];

export const SponsorProductButton = ({ productId, sponsoredUntil, onUpdated }: Props) => {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);

  const isActive = sponsoredUntil && new Date(sponsoredUntil) > new Date();

  const handleBoost = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('sponsor_product', {
      p_product_id: productId,
      p_days: days,
    });
    setLoading(false);
    const result = data as any;
    if (error || !result?.success) {
      toast.error(result?.error || error?.message || 'Erreur');
      return;
    }
    toast.success(`Produit sponsorisé pour ${days} jour(s) !`);
    setOpen(false);
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isActive ? 'secondary' : 'default'} className="gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          {isActive ? 'Prolonger' : 'Sponsoriser'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-jinbao-gold" /> Booster ce produit
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mettez votre produit en haut de la liste pour augmenter votre visibilité.
            <br /><span className="font-medium text-foreground">Tarif : {COST_PER_DAY} FCFA / jour</span>
          </p>
          {isActive && (
            <p className="text-xs text-green-600">
              Actuellement sponsorisé jusqu'au {new Date(sponsoredUntil!).toLocaleDateString('fr-FR')}
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {OPTIONS.map((d) => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}j
              </Button>
            ))}
          </div>
          <div className="bg-muted/50 rounded p-2 text-sm flex justify-between">
            <span>Coût total</span>
            <span className="font-bold text-primary">{(days * COST_PER_DAY).toLocaleString()} F</span>
          </div>
          <Button onClick={handleBoost} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Payer ${(days * COST_PER_DAY).toLocaleString()} F depuis mon portefeuille`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SponsorProductButton;
