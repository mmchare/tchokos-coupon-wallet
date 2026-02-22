import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gavel, Clock, TrendingUp, XCircle } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AuctionProduct {
  id: string;
  name: string;
  price: number;
  auction_end_date: string | null;
  images: string[] | null;
  is_auction: boolean;
}

interface Bid {
  id: string;
  product_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  profiles?: {
    full_name: string;
  } | null;
}

const AdminAuctions = () => {
  const [auctions, setAuctions] = useState<AuctionProduct[]>([]);
  const [bids, setBids] = useState<Record<string, Bid[]>>({});
  const [maxBids, setMaxBids] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAuctions = async () => {
    setIsLoading(true);

    // Fetch auction products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('is_auction', true)
      .order('auction_end_date', { ascending: true });

    if (products) {
      setAuctions(products);

      // Fetch bids for each auction
      const bidsMap: Record<string, Bid[]> = {};
      const maxBidsMap: Record<string, number> = {};

      for (const product of products) {
        const { data: productBids } = await supabase
          .from('bids')
          .select(`
            *,
            profiles:user_id (full_name)
          `)
          .eq('product_id', product.id)
          .order('amount', { ascending: false });

        if (productBids) {
          bidsMap[product.id] = productBids as Bid[];
          maxBidsMap[product.id] = productBids[0]?.amount || product.price;
        }
      }

      setBids(bidsMap);
      setMaxBids(maxBidsMap);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const endAuction = async (product: AuctionProduct) => {
    if (!confirm(`Mettre fin à l'enchère "${product.name}" ?`)) return;

    const { error } = await supabase
      .from('products')
      .update({
        is_auction: false,
        price: maxBids[product.id] || product.price
      })
      .eq('id', product.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de terminer l'enchère", variant: "destructive" });
      return;
    }

    // Log action
    await supabase.rpc('log_admin_action', {
      p_action: 'END_AUCTION',
      p_target_type: 'auction',
      p_target_id: product.id,
      p_details: { 
        product_name: product.name, 
        final_price: maxBids[product.id] || product.price,
        total_bids: bids[product.id]?.length || 0
      }
    });

    toast({ title: "Succès", description: "Enchère terminée" });
    fetchAuctions();
  };

  const activeAuctions = auctions.filter(a => a.auction_end_date && !isPast(new Date(a.auction_end_date)));
  const expiredAuctions = auctions.filter(a => !a.auction_end_date || isPast(new Date(a.auction_end_date)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Enchères</h1>
        <p className="text-muted-foreground">Suivi en temps réel des enchères</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Gavel className="h-10 w-10 text-primary" />
              <div>
                <p className="text-2xl font-bold">{activeAuctions.length}</p>
                <p className="text-sm text-muted-foreground">Enchères actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-10 w-10 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(bids).flat().length}
                </p>
                <p className="text-sm text-muted-foreground">Total enchères placées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-10 w-10 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{expiredAuctions.length}</p>
                <p className="text-sm text-muted-foreground">Enchères expirées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auctions Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Prix de départ</TableHead>
                <TableHead>Prix max actuel</TableHead>
                <TableHead>Nb. enchères</TableHead>
                <TableHead>Temps restant</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : auctions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucune enchère trouvée
                  </TableCell>
                </TableRow>
              ) : (
                auctions.map((auction) => {
                  const isExpired = auction.auction_end_date && isPast(new Date(auction.auction_end_date));
                  
                  return (
                    <TableRow key={auction.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {auction.images?.[0] && (
                            <img
                              src={auction.images[0]}
                              alt={auction.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          )}
                          <span className="font-medium">{auction.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{auction.price.toLocaleString()} F</TableCell>
                      <TableCell className="text-primary font-bold">
                        {(maxBids[auction.id] || auction.price).toLocaleString()} F
                      </TableCell>
                      <TableCell>{bids[auction.id]?.length || 0}</TableCell>
                      <TableCell>
                        {auction.auction_end_date ? (
                          isExpired ? (
                            <span className="text-destructive">Expiré</span>
                          ) : (
                            <span className="text-green-500">
                              {formatDistanceToNow(new Date(auction.auction_end_date), { 
                                locale: fr, 
                                addSuffix: true 
                              })}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Non défini</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => endAuction(auction)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Terminer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Bids */}
      {Object.entries(bids).some(([_, b]) => b.length > 0) && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h3 className="font-bold mb-4">Dernières enchères placées</h3>
            <div className="space-y-2">
              {Object.entries(bids)
                .flatMap(([productId, productBids]) =>
                  productBids.slice(0, 3).map(bid => ({
                    ...bid,
                    productName: auctions.find(a => a.id === productId)?.name
                  }))
                )
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 10)
                .map(bid => (
                  <div key={bid.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <div>
                      <span className="font-medium">{bid.profiles?.full_name}</span>
                      <span className="text-muted-foreground"> a enchéri sur </span>
                      <span className="font-medium">{bid.productName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-primary font-bold">{bid.amount.toLocaleString()} F</span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(bid.created_at), 'dd/MM HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAuctions;
