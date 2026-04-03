import { CalendarClock } from 'lucide-react';

interface OrderEstimatedDeliveryProps {
  logisticsStep: number;
  createdAt: string;
  status: string;
}

/**
 * Estimated days per step (cumulative from order creation):
 * Step 1 (Confirmed) → 0 days
 * Step 2 (Prep in China) → 1-3 days
 * Step 3 (International shipping) → 7-14 days  
 * Step 4 (Local delivery) → 14-21 days
 */
const STEP_ESTIMATES: Record<number, { minDays: number; maxDays: number; label: string }> = {
  1: { minDays: 14, maxDays: 21, label: 'Livraison estimée' },
  2: { minDays: 12, maxDays: 18, label: 'Livraison estimée' },
  3: { minDays: 7, maxDays: 10, label: 'Arrivée prévue' },
  4: { minDays: 1, maxDays: 3, label: 'Livraison imminente' },
};

const OrderEstimatedDelivery = ({ logisticsStep, createdAt, status }: OrderEstimatedDeliveryProps) => {
  if (status === 'cancelled' || status === 'delivered') return null;

  const estimate = STEP_ESTIMATES[logisticsStep] || STEP_ESTIMATES[1];
  const orderDate = new Date(createdAt);
  
  const minDate = new Date(orderDate);
  minDate.setDate(minDate.getDate() + estimate.minDays);
  
  const maxDate = new Date(orderDate);
  maxDate.setDate(maxDate.getDate() + estimate.maxDays);

  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((minDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
      <div className="bg-primary/10 p-2 rounded-full">
        <CalendarClock className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-primary">{estimate.label}</p>
        <p className="text-sm font-semibold text-foreground">
          {formatShortDate(minDate)} — {formatShortDate(maxDate)}
        </p>
        {daysRemaining > 0 && (
          <p className="text-[10px] text-muted-foreground">
            ~{daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
          </p>
        )}
        {daysRemaining === 0 && logisticsStep >= 3 && (
          <p className="text-[10px] text-green-600 font-medium">Livraison très proche !</p>
        )}
      </div>
    </div>
  );
};

export default OrderEstimatedDelivery;
