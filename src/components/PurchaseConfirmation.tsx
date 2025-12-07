import { CheckCircle, Package, Plane, Truck, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PurchaseConfirmationProps {
  productName: string;
  onClose: () => void;
}

const PurchaseConfirmation = ({ productName, onClose }: PurchaseConfirmationProps) => {
  const steps = [
    {
      icon: CheckCircle,
      title: "Commande confirmée",
      description: "Votre paiement a été validé",
      status: "completed" as const,
    },
    {
      icon: Package,
      title: "Préparation en Chine",
      description: "Vérification & emballage par PINBAOO",
      status: "current" as const,
    },
    {
      icon: Plane,
      title: "Expédition internationale",
      description: "En route vers le Cameroun",
      status: "pending" as const,
    },
    {
      icon: Truck,
      title: "Livraison locale",
      description: "Remise en main propre",
      status: "pending" as const,
    },
  ];

  return (
    <div className="flex flex-col items-center text-center p-4 sm:p-6 animate-fade-in">
      {/* Success Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-pinbaoo-green/20 flex items-center justify-center mb-4 sm:mb-6">
        <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-pinbaoo-green" />
      </div>

      {/* Dynamic Message */}
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
        Félicitations ! 🎉
      </h2>
      <p className="text-muted-foreground mb-6 text-sm sm:text-base">
        Votre commande de <span className="text-pinbaoo-yellow font-semibold">{productName}</span> a été confirmée avec succès !
      </p>

      {/* Delivery Timeline Badge */}
      <Card className="bg-pinbaoo-yellow/10 border-pinbaoo-yellow/30 p-3 sm:p-4 mb-6 sm:mb-8 w-full">
        <div className="flex items-center justify-center gap-2">
          <Home className="w-5 h-5 text-pinbaoo-yellow" />
          <span className="text-sm sm:text-base font-semibold text-foreground">
            Délai de livraison : <span className="text-pinbaoo-yellow">10-14 jours max</span>
          </span>
        </div>
      </Card>

      {/* Timeline */}
      <div className="w-full max-w-sm">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
          Processus PINBAOO
        </h3>
        
        <div className="relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={index} className="flex items-start mb-0">
                <div className="flex flex-col items-center">
                  {/* Icon Circle */}
                  <div className={`
                    w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
                    ${step.status === 'completed' ? 'bg-pinbaoo-green text-white' : ''}
                    ${step.status === 'current' ? 'bg-pinbaoo-yellow text-pinbaoo-dark animate-pulse' : ''}
                    ${step.status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  
                  {/* Connecting Line */}
                  {!isLast && (
                    <div className={`
                      w-0.5 h-12 sm:h-14
                      ${step.status === 'completed' ? 'bg-pinbaoo-green' : 'bg-muted'}
                    `} />
                  )}
                </div>
                
                {/* Text Content */}
                <div className="ml-3 sm:ml-4 text-left pb-6">
                  <h4 className={`
                    font-semibold text-sm sm:text-base
                    ${step.status === 'completed' ? 'text-pinbaoo-green' : ''}
                    ${step.status === 'current' ? 'text-pinbaoo-yellow' : ''}
                    ${step.status === 'pending' ? 'text-muted-foreground' : ''}
                  `}>
                    {step.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Close Button */}
      <Button
        onClick={onClose}
        className="buy-button mt-6 w-full max-w-sm"
      >
        Continuer mes achats
      </Button>
    </div>
  );
};

export default PurchaseConfirmation;
