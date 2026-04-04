import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, Plane, Truck, Home, Clock, ArrowLeft, Loader2, CalendarClock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import OrderShippingMap from '@/components/OrderShippingMap';

const TrackOrder = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchOrder();
  }, [token]);

  const fetchOrder = async () => {
    setLoading(true);
    // Find the share record
    const { data: share, error: shareError } = await supabase
      .from('order_tracking_shares')
      .select('order_id, expires_at')
      .eq('share_token', token!)
      .maybeSingle();

    if (shareError || !share) {
      setError('Lien de suivi invalide ou expiré');
      setLoading(false);
      return;
    }

    if (new Date(share.expires_at) < new Date()) {
      setError('Ce lien de suivi a expiré');
      setLoading(false);
      return;
    }

    // Fetch order (public SELECT is not enabled, but we use the share token pattern)
    // We need an edge function or RPC for this. For now, use the share to show basic info.
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, status, logistics_step, city, created_at, product_name, product_image, total_amount')
      .eq('id', share.order_id)
      .maybeSingle();

    if (orderError || !orderData) {
      setError('Commande introuvable');
      setLoading(false);
      return;
    }

    setOrder(orderData);

    // Fetch history
    const { data: historyData } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', share.order_id)
      .order('created_at', { ascending: true });

    setHistory(historyData || []);
    setLoading(false);

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`track-${share.order_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${share.order_id}`,
      }, (payload) => {
        setOrder((prev: any) => prev ? { ...prev, ...payload.new } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const steps = [
    { step: 1, icon: CheckCircle, title: "Confirmée" },
    { step: 2, icon: Package, title: "Préparation" },
    { step: 3, icon: Plane, title: "Expédition" },
    { step: 4, icon: Truck, title: "Livraison" },
  ];

  const stepInfoMap: Record<number, string> = {
    1: 'Commande confirmée',
    2: 'Préparation en Chine',
    3: 'Expédition internationale',
    4: 'Livraison locale',
  };

  const getStepStatus = (stepNumber: number) => {
    if (!order) return 'pending';
    if (stepNumber < order.logistics_step) return 'completed';
    if (stepNumber === order.logistics_step) return 'current';
    return 'pending';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Lien invalide</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Suivi de commande</h1>
              <p className="text-xs text-muted-foreground">JinBao — Powered by DINA</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {order.product_image && (
                  <img src={order.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div>
                  <CardTitle className="text-base">#{order.id.slice(0, 8).toUpperCase()}</CardTitle>
                  <p className="text-sm text-muted-foreground">{order.product_name || 'Produit'}</p>
                </div>
              </div>
              <Badge className={
                order.status === 'delivered' ? 'bg-green-500 text-white' :
                order.status === 'cancelled' ? 'bg-destructive text-destructive-foreground' :
                'bg-primary text-primary-foreground'
              }>
                {order.status === 'confirmed' ? 'Confirmée' :
                 order.status === 'delivered' ? 'Livrée' :
                 order.status === 'cancelled' ? 'Annulée' :
                 order.status === 'shipped' ? 'Expédiée' : order.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Estimated Delivery */}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                <CalendarClock className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium text-primary">Livraison estimée</p>
                  <p className="text-sm font-semibold text-foreground">
                    {(() => {
                      const d = new Date(order.created_at);
                      const min = new Date(d); min.setDate(min.getDate() + 14);
                      const max = new Date(d); max.setDate(max.getDate() + 21);
                      return `${min.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${max.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* Shipping Map */}
            <OrderShippingMap logisticsStep={order.logistics_step} status={order.status} />

            {/* Timeline */}
            <div className="relative pt-2">
              <div className="flex justify-between items-center">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const status = getStepStatus(step.step);
                  return (
                    <div key={step.step} className="flex flex-col items-center relative z-10">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${status === 'completed' ? 'bg-jinbao-blue text-white' : ''}
                        ${status === 'current' ? 'bg-primary text-primary-foreground animate-pulse' : ''}
                        ${status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-[10px] mt-1 text-center max-w-16 ${
                        status === 'completed' ? 'text-jinbao-blue font-medium' :
                        status === 'current' ? 'text-primary font-medium' :
                        'text-muted-foreground'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-6 left-5 right-5 h-1 bg-muted rounded-full -z-0">
                <div 
                  className="h-full bg-jinbao-blue rounded-full transition-all duration-500"
                  style={{ width: `${((order.logistics_step - 1) / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Ville</p>
                <p className="font-medium text-foreground">{order.city}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Commandé le</p>
                <p className="font-medium text-foreground">{formatDate(order.created_at)}</p>
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Historique
                </p>
                <div className="pl-2 border-l-2 border-primary/20 space-y-2.5">
                  {history.map((entry, i) => (
                    <div key={entry.id} className="relative pl-4">
                      <div className={`absolute left-[-5px] top-1 w-2 h-2 rounded-full ${
                        i === history.length - 1 ? 'bg-primary' : 'bg-muted-foreground/40'
                      }`} />
                      <p className={`text-xs ${i === history.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {entry.notes || (entry.new_step ? stepInfoMap[entry.new_step] : 'Mise à jour')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(entry.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ce suivi est mis à jour en temps réel 🔄
        </p>
      </main>
    </div>
  );
};

export default TrackOrder;
