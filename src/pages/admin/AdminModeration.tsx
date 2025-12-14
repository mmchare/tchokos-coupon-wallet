import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Star, Trash2, Check, X, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  is_verified_client: boolean;
  created_at: string;
  product?: {
    name: string;
  };
}

const AdminModeration = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        product:products(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les avis",
        variant: "destructive"
      });
    } else {
      setReviews(data as Review[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleVerify = async (reviewId: string) => {
    setProcessingId(reviewId);
    const { error } = await supabase
      .from('reviews')
      .update({ is_verified_client: true })
      .eq('id', reviewId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de vérifier l'avis",
        variant: "destructive"
      });
    } else {
      setReviews(prev => prev.map(r => 
        r.id === reviewId ? { ...r, is_verified_client: true } : r
      ));
      toast({
        title: "Avis vérifié",
        description: "L'avis a été marqué comme vérifié"
      });

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: 'VERIFY_REVIEW',
        p_target_type: 'review',
        p_target_id: reviewId,
        p_details: { verified: true }
      });
    }
    setProcessingId(null);
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;

    setProcessingId(reviewId);
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'avis",
        variant: "destructive"
      });
    } else {
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      toast({
        title: "Avis supprimé",
        description: "L'avis a été supprimé avec succès"
      });

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: 'DELETE_REVIEW',
        p_target_type: 'review',
        p_target_id: reviewId,
        p_details: { deleted: true }
      });
    }
    setProcessingId(null);
  };

  const filteredReviews = reviews.filter(review => 
    review.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (review.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingReviews = reviews.filter(r => !r.is_verified_client).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Modération</h1>
        <p className="text-muted-foreground">Modération des avis utilisateurs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total des avis</p>
                <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-vibrant-yellow">{pendingReviews}</p>
              </div>
              <Star className="h-8 w-8 text-vibrant-yellow" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vérifiés</p>
                <p className="text-2xl font-bold text-green-500">{reviews.length - pendingReviews}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par utilisateur, produit ou commentaire..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border text-foreground"
        />
      </div>

      {/* Reviews Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucun avis trouvé
              </h3>
              <p className="text-muted-foreground">
                Les avis des utilisateurs apparaîtront ici
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Utilisateur</TableHead>
                  <TableHead className="text-muted-foreground">Produit</TableHead>
                  <TableHead className="text-muted-foreground">Note</TableHead>
                  <TableHead className="text-muted-foreground">Commentaire</TableHead>
                  <TableHead className="text-muted-foreground">Statut</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id} className="border-border">
                    <TableCell className="text-foreground text-sm">
                      {format(new Date(review.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      {review.user_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {review.product?.name || 'Produit supprimé'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating
                                ? 'fill-vibrant-yellow text-vibrant-yellow'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground max-w-xs truncate">
                      {review.comment}
                    </TableCell>
                    <TableCell>
                      {review.is_verified_client ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          Vérifié
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-vibrant-yellow/10 text-vibrant-yellow border-vibrant-yellow/20">
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!review.is_verified_client && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleVerify(review.id)}
                            disabled={processingId === review.id}
                            className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                            title="Vérifier"
                          >
                            {processingId === review.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(review.id)}
                          disabled={processingId === review.id}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminModeration;