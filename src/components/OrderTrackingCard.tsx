import { CheckCircle, Package, Plane, Truck, Home, MessageCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OrderTrackingCardProps {
  order: {
    id: string;
    status: string;
    logistics_step: number;
    total_amount: number;
    city: string;
    delivery_address: string;
    whatsapp_number: string;
    created_at: string;
    product_name?: string | null;
    product_image?: string | null;
    product?: {
      name: string;
      images: string[] | null;
    } | null;
  };
}

const OrderTrackingCard = ({ order }: OrderTrackingCardProps) => {
  const steps = [
    {
      step: 1,
      icon: CheckCircle,
      title: "Commande confirmée",
      description: "Paiement validé",
    },
    {
      step: 2,
      icon: Package,
      title: "Préparation en Chine",
      description: "Vérification & emballage",
    },
    {
      step: 3,
      icon: Plane,
      title: "Expédition internationale",
      description: "En route vers le Cameroun",
    },
    {
      step: 4,
      icon: Truck,
      title: "Livraison locale",
      description: "Remise en main propre",
    },
  ];

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < order.logistics_step) return 'completed';
    if (stepNumber === order.logistics_step) return 'current';
    return 'pending';
  };

  const getStatusBadge = () => {
    switch (order.status) {
      case 'confirmed':
        return <Badge className="bg-jinbao-blue text-white">Confirmée</Badge>;
      case 'processing':
        return <Badge className="bg-orange-500 text-white">En traitement</Badge>;
      case 'shipped':
        return <Badge className="bg-purple-500 text-white">Expédiée</Badge>;
      case 'delivered':
        return <Badge className="bg-green-500 text-white">Livrée</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{order.status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      `Bonjour JinBao, je souhaite avoir des informations sur ma commande #${order.id.slice(0, 8).toUpperCase()}`
    );
    window.open(`https://wa.me/237655852010?text=${message}`, '_blank');
  };

  // Get the product name from either product_name field or joined product
  const displayProductName = order.product_name || order.product?.name || 'Produit';
  const displayProductImage = order.product_image || order.product?.images?.[0];

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            {displayProductImage && (
              <img 
                src={displayProductImage} 
                alt={displayProductName}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <CardTitle className="text-base text-foreground">
                Commande #{order.id.slice(0, 8).toUpperCase()}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {displayProductName}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Order Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Montant</p>
            <p className="font-semibold text-jinbao-red">{order.total_amount.toLocaleString()} F</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ville</p>
            <p className="font-medium text-foreground">{order.city}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Date de commande
            </p>
            <p className="font-medium text-foreground">{formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Timeline Progress */}
        <div className="relative pt-2">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const status = getStepStatus(step.step);
              const isLast = index === steps.length - 1;
              
              return (
                <div key={step.step} className="flex flex-col items-center relative z-10">
                  {/* Icon */}
                  <div className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center
                    ${status === 'completed' ? 'bg-jinbao-blue text-white' : ''}
                    ${status === 'current' ? 'bg-jinbao-red text-white animate-pulse' : ''}
                    ${status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  
                  {/* Label - Hidden on mobile for space */}
                  <p className={`
                    text-[10px] sm:text-xs mt-1 text-center max-w-16 sm:max-w-20
                    ${status === 'completed' ? 'text-jinbao-blue font-medium' : ''}
                    ${status === 'current' ? 'text-jinbao-red font-medium' : ''}
                    ${status === 'pending' ? 'text-muted-foreground' : ''}
                  `}>
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* Progress Bar */}
          <div className="absolute top-5 sm:top-6 left-4 right-4 h-1 bg-muted rounded-full -z-0">
            <div 
              className="h-full bg-jinbao-blue rounded-full transition-all duration-500"
              style={{ width: `${((order.logistics_step - 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Home className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-muted-foreground">Adresse de livraison</p>
              <p className="text-foreground line-clamp-2">{order.delivery_address}</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Contact */}
        <Button 
          onClick={openWhatsApp}
          variant="outline"
          className="w-full border-green-500 text-green-600 hover:bg-green-500/10"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Contacter JinBao pour cette commande
        </Button>
      </CardContent>
    </Card>
  );
};

export default OrderTrackingCard;
