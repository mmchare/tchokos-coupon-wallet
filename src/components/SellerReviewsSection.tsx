import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  sellerId: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string;
}

export const SellerReviewsSection = ({ sellerId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibleOrder, setEligibleOrder] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('seller_reviews')
      .select('id,rating,comment,reviewer_name,created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    setReviews(data || []);

    if (user) {
      // find a delivered order from this user with a product belonging to this seller, not yet reviewed
      const { data: prods } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId);
      const productIds = (prods || []).map((p) => p.id);
      if (productIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, logistics_step, status')
          .eq('user_id', user.id)
          .in('product_id', productIds);
        const delivered = (orders || []).find(
          (o) => o.logistics_step >= 4 || ['delivered', 'completed'].includes(o.status)
        );
        if (delivered) {
          const { data: existing } = await supabase
            .from('seller_reviews')
            .select('id')
            .eq('order_id', delivered.id)
            .eq('reviewer_id', user.id)
            .maybeSingle();
          if (!existing) setEligibleOrder(delivered.id);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [sellerId, user?.id]);

  const submit = async () => {
    if (!user || !eligibleOrder || rating === 0) return;
    setSubmitting(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    const { error } = await supabase.from('seller_reviews').insert({
      seller_id: sellerId,
      reviewer_id: user.id,
      order_id: eligibleOrder,
      rating,
      comment: comment.trim() || null,
      reviewer_name: profile?.full_name || 'Acheteur',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Merci !', description: 'Votre avis a été publié.' });
    setRating(0);
    setComment('');
    setEligibleOrder(null);
    load();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Avis ({reviews.length})</h3>

      {eligibleOrder && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Notez ce vendeur</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} type="button">
                  <Star
                    className={`w-7 h-7 ${
                      n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Partagez votre expérience (optionnel)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <Button onClick={submit} disabled={rating === 0 || submitting} className="w-full">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Publier l'avis
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aucun avis pour le moment
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.reviewer_name || 'Acheteur'}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-3.5 h-3.5 ${
                        n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
                      }`}
                    />
                  ))}
                </div>
                {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
