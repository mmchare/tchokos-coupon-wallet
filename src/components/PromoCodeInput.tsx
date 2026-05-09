import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, X, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AppliedPromo {
  promo_code_id: string;
  code: string;
  discount_amount: number;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  description?: string | null;
}

interface PromoCodeInputProps {
  userId: string | undefined;
  orderTotal: number;
  applied: AppliedPromo | null;
  onApply: (promo: AppliedPromo | null) => void;
}

const PromoCodeInput = ({ userId, orderTotal, applied, onApply }: PromoCodeInputProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!userId) {
      toast.error('Connectez-vous pour utiliser un code promo');
      return;
    }
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        p_code: trimmed,
        p_user_id: userId,
        p_order_total: orderTotal,
      });

      if (error) throw error;
      const result = data as any;

      if (!result?.valid) {
        toast.error(result?.error || 'Code invalide');
        return;
      }

      onApply({
        promo_code_id: result.promo_code_id,
        code: result.code,
        discount_amount: Number(result.discount_amount),
        discount_type: result.discount_type,
        discount_value: Number(result.discount_value),
        description: result.description,
      });
      toast.success(`Code appliqué : -${Number(result.discount_amount).toLocaleString()} F`);
      setCode('');
    } catch (e: any) {
      toast.error(e.message || 'Erreur de validation');
    } finally {
      setLoading(false);
    }
  };

  if (applied) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-lg p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-green-500 text-white rounded-full p-1 shrink-0">
            <Check className="h-3 w-3" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400 truncate">
              {applied.code}
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">
              -{applied.discount_amount.toLocaleString()} F
              {applied.discount_type === 'percent' && ` (${applied.discount_value}%)`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onApply(null)}
          className="text-green-700 hover:text-green-900 hover:bg-green-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Tag className="h-3 w-3" /> Code promo
      </label>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ENTREZ VOTRE CODE"
          className="uppercase"
          maxLength={32}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApply())}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={loading || !code.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Appliquer'}
        </Button>
      </div>
    </div>
  );
};

export default PromoCodeInput;
