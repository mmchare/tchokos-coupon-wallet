import { useState, useEffect } from 'react';
import {
  CheckCircle, Package, Plane, Truck, Home, MessageCircle, Clock, XCircle, Loader2, Sparkles, Ship,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import OrderEstimatedDelivery from './OrderEstimatedDelivery';
import OrderStatusHistory from './OrderStatusHistory';
import OrderShareButton from './OrderShareButton';
import OrderShippingMap from './OrderShippingMap';

interface TrackingJinBaoCardProps {
  order: {
    id: string;
    status: string;
    logistics_step: number;
    total_amount: number;
    city: string;
    delivery_address: string;
    whatsapp_number: string;
    created_at: string;
    current_step_started_at?: string | null;
    estimated_delivery_at?: string | null;
    product_name?: string | null;
    product_image?: string | null;
    shipping_mode?: string;
    product?: { name: string; images: string[] | null } | null;
  };
  onOrderCancelled?: () => void;
}

// Estimated duration of each step in days (used for in-step micro-progress)
const STEP_DURATIONS_DAYS: Record<number, number> = {
  1: 1,    // Confirmation -> Préparation
  2: 3,    // Préparation -> Expédition
  3: 12,   // Expédition internationale
  4: 2,    // Livraison locale
};

const SUBSTEPS_SEA: Record<number, string[]> = {
  1: ['Paiement validé', 'Commande transmise au vendeur', 'Vendeur notifié'],
  2: ['Produit emballé', 'Contrôle qualité JinBao', 'Remis au transitaire'],
  3: ['Embarquement à Guangzhou', 'En mer — Océan Indien', 'Escale Djibouti', 'Arrivée Port de Douala', 'Dédouanement CAMCIS'],
  4: ['Pris en charge livreur', 'En route vers vous', 'Livré'],
};

const SUBSTEPS_AIR: Record<number, string[]> = {
  1: ['Paiement validé', 'Commande transmise au vendeur', 'Vendeur notifié'],
  2: ['Produit emballé', 'Contrôle qualité JinBao', 'Remis au cargo'],
  3: ['Embarquement Aéroport Baiyun', 'En vol vers le Cameroun', 'Atterrissage Douala', 'Dédouanement express'],
  4: ['Pris en charge livreur', 'En route vers vous', 'Livré'],
};

const TrackingJinBaoCard = ({ order, onOrderCancelled }: TrackingJinBaoCardProps) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every minute for live progress
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const shippingMode = (order.shipping_mode as 'sea' | 'air') || 'sea';
  const SUBSTEPS = shippingMode === 'air' ? SUBSTEPS_AIR : SUBSTEPS_SEA;

  const canCancelOrder = () => {
    if (order.status === 'cancelled' || order.status === 'delivered') return false;
    if (order.logistics_step >= 3) return false;
    const hoursDiff = (Date.now() - new Date(order.created_at).getTime()) / 3_600_000;
    return hoursDiff <= 2;
  };

  const getRemainingTime = () => {
    const minutesRemaining = 120 - (Date.now() - new Date(order.created_at).getTime()) / 60_000;
    if (minutesRemaining <= 0) return null;
    const h = Math.floor(minutesRemaining / 60);
    const m = Math.floor(minutesRemaining % 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Vous devez être connecté'); return; }
      const { data, error } = await supabase.functions.invoke('cancel-order', {
        body: { order_id: order.id, user_id: user.id }
      });
      if (error) throw error;
      if (data.success) {
        toast.success(`Commande annulée ! ${order.total_amount.toLocaleString()} FCFA remboursés`);
        onOrderCancelled?.();
      } else { toast.error(data.error || 'Erreur lors de l\'annulation'); }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    } finally { setIsCancelling(false); }
  };

  const steps = [
    { step: 1, icon: CheckCircle, title: 'Confirmée' },
    { step: 2, icon: Package, title: 'Préparation' },
    { step: 3, icon: shippingMode === 'air' ? Plane : Ship, title: shippingMode === 'air' ? 'En vol' : 'En mer' },
    { step: 4, icon: Truck, title: 'Livraison' },
  ];

  const getStepStatus = (s: number) =>
    s < order.logistics_step ? 'completed' : s === order.logistics_step ? 'current' : 'pending';

  // Live in-step progression (0..1) based on elapsed time
  const stepStartedAt = order.current_step_started_at ? new Date(order.current_step_started_at).getTime() : new Date(order.created_at).getTime();
  const stepDurationMs = (STEP_DURATIONS_DAYS[order.logistics_step] || 1) * 86_400_000;
  const inStepProgress = order.status === 'cancelled' ? 0
    : order.status === 'delivered' || order.logistics_step === 4 && order.status === 'delivered'
    ? 1
    : Math.min(0.95, Math.max(0.05, (now - stepStartedAt) / stepDurationMs));

  // Active substep based on inStepProgress
  const currentSubsteps = SUBSTEPS[order.logistics_step] || [];
  const activeSubstep = Math.min(currentSubsteps.length - 1, Math.floor(inStepProgress * currentSubsteps.length));

  // Overall progress 0..100
  const overallProgress = order.status === 'cancelled' ? 0
    : Math.min(100, ((order.logistics_step - 1) / 4) * 100 + (inStepProgress / 4) * 100);

  const getStatusBadge = () => {
    switch (order.status) {
      case 'confirmed': return <Badge className="bg-jinbao-blue text-white">Confirmée</Badge>;
      case 'processing': return <Badge className="bg-orange-500 text-white">En traitement</Badge>;
      case 'shipped': return <Badge className="bg-purple-500 text-white">Expédiée</Badge>;
      case 'delivered': return <Badge className="bg-green-500 text-white">Livrée</Badge>;
      case 'cancelled': return <Badge variant="destructive">Annulée</Badge>;
      default: return <Badge variant="secondary">{order.status}</Badge>;
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const openWhatsApp = () => {
    const message = encodeURIComponent(`Bonjour JinBao, je souhaite des infos sur ma commande #${order.id.slice(0, 8).toUpperCase()}`);
    window.open(`https://wa.me/237678373080?text=${message}`, '_blank');
  };

  const productName = order.product_name || order.product?.name || 'Produit';
  const productImage = order.product_image || order.product?.images?.[0];

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* Branded Tracking JinBao header */}
      <div className="relative bg-gradient-to-r from-primary via-primary to-jinbao-gold/80 p-3 text-primary-foreground">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-white/15 backdrop-blur-sm rounded-full p-1.5 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider opacity-90 leading-none">Suivi en direct</p>
              <h3 className="font-bold text-sm leading-tight truncate">Tracking JinBao 🐲</h3>
            </div>
          </div>
          {getStatusBadge()}
        </div>
        {/* Live overall progress bar */}
        <div className="mt-2.5">
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-jinbao-gold rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_hsl(var(--jinbao-gold)/0.6)]"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-[10px] mt-1 opacity-90">{Math.round(overallProgress)}% du parcours</p>
        {order.estimated_delivery_at && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] bg-white/15 backdrop-blur-sm rounded px-2 py-1">
            {shippingMode === 'air' ? <Plane className="h-3 w-3" /> : <Ship className="h-3 w-3" />}
            <span className="opacity-90">Livraison estimée :</span>
            <strong>{new Date(order.estimated_delivery_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
          </div>
        )}
      </div>
      </div>

      <CardHeader className="pb-3 pt-3">
        <div className="flex items-center gap-3">
          {productImage && (
            <img src={productImage} alt={productName} className="w-12 h-12 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-sm text-muted-foreground truncate">{productName}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Order Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Montant</p>
            <p className="font-semibold text-primary">{order.total_amount.toLocaleString()} F</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ville</p>
            <p className="font-medium text-foreground">{order.city}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Date de commande
            </p>
            <p className="font-medium text-foreground">{formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Estimated Delivery */}
        <OrderEstimatedDelivery
          logisticsStep={order.logistics_step}
          createdAt={order.created_at}
          status={order.status}
        />

        {/* Timeline Progress (4 main steps) */}
        <div className="relative pt-2">
          <div className="flex justify-between items-center">
            {steps.map((step) => {
              const Icon = step.icon;
              const status = getStepStatus(step.step);
              return (
                <div key={step.step} className="flex flex-col items-center relative z-10">
                  <div className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all
                    ${status === 'completed' ? 'bg-jinbao-blue text-white' : ''}
                    ${status === 'current' ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse' : ''}
                    ${status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <p className={`
                    text-[10px] sm:text-xs mt-1 text-center
                    ${status === 'completed' ? 'text-jinbao-blue font-medium' : ''}
                    ${status === 'current' ? 'text-primary font-medium' : ''}
                    ${status === 'pending' ? 'text-muted-foreground' : ''}
                  `}>
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="absolute top-5 sm:top-6 left-4 right-4 h-1 bg-muted rounded-full -z-0">
            <div
              className="h-full bg-gradient-to-r from-jinbao-blue to-primary rounded-full transition-all duration-1000"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Sub-steps for current major step */}
        {order.status !== 'cancelled' && currentSubsteps.length > 0 && (
          <div className="bg-muted/40 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Étape {order.logistics_step} en détail
            </p>
            <div className="space-y-1.5">
              {currentSubsteps.map((label, i) => {
                const done = i < activeSubstep;
                const active = i === activeSubstep;
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`
                      w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors
                      ${done ? 'bg-jinbao-blue text-white' : ''}
                      ${active ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : ''}
                      ${!done && !active ? 'bg-muted-foreground/20' : ''}
                    `}>
                      {done && <CheckCircle className="w-2.5 h-2.5" />}
                    </div>
                    <span className={`
                      ${done ? 'text-muted-foreground line-through' : ''}
                      ${active ? 'text-foreground font-medium' : ''}
                      ${!done && !active ? 'text-muted-foreground' : ''}
                    `}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            <Progress value={inStepProgress * 100} className="h-1 mt-1.5" />
          </div>
        )}

        {/* Geographic Map */}
        <OrderShippingMap
          logisticsStep={order.logistics_step}
          status={order.status}
          shippingMode={shippingMode}
        />

        {/* Status History */}
        <OrderStatusHistory orderId={order.id} />

        {/* Delivery Address */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Home className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground">Adresse de livraison</p>
              <p className="text-foreground line-clamp-2">{order.delivery_address}</p>
            </div>
          </div>
        </div>

        {/* Cancel */}
        {canCancelOrder() && (
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <p className="font-medium text-orange-700 dark:text-orange-400">Annulation possible</p>
                <p className="text-orange-600 dark:text-orange-500 text-xs">Temps restant : {getRemainingTime()}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isCancelling}>
                    {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><XCircle className="h-4 w-4 mr-1" />Annuler</>)}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Annuler cette commande ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. {order.total_amount.toLocaleString()} FCFA seront remboursés sur votre portefeuille.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Non, garder</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelOrder}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Oui, annuler et rembourser
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Share + WhatsApp */}
        <div className="space-y-2">
          <OrderShareButton orderId={order.id} />
          <Button
            onClick={openWhatsApp}
            variant="outline"
            className="w-full border-green-500 text-green-600 hover:bg-green-500/10"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Contacter JinBao
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackingJinBaoCard;

