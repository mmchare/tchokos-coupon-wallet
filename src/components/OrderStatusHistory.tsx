import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Package, Plane, Truck, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatusHistoryEntry {
  id: string;
  previous_step: number | null;
  new_step: number | null;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
}

const stepInfo: Record<number, { icon: React.ElementType; label: string }> = {
  1: { icon: CheckCircle, label: 'Commande confirmée' },
  2: { icon: Package, label: 'Préparation en Chine' },
  3: { icon: Plane, label: 'Expédition internationale' },
  4: { icon: Truck, label: 'Livraison locale' },
};

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmée',
  processing: 'En traitement',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

interface OrderStatusHistoryProps {
  orderId: string;
}

const OrderStatusHistory = ({ orderId }: OrderStatusHistoryProps) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expanded && history.length === 0) {
      fetchHistory();
    }
  }, [expanded]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setHistory(data as StatusHistoryEntry[]);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEntryLabel = (entry: StatusHistoryEntry) => {
    if (entry.notes) return entry.notes;
    if (entry.new_step && stepInfo[entry.new_step]) {
      return stepInfo[entry.new_step].label;
    }
    if (entry.new_status) {
      return statusLabels[entry.new_status] || entry.new_status;
    }
    return 'Mise à jour';
  };

  const getEntryIcon = (entry: StatusHistoryEntry) => {
    if (entry.new_step && stepInfo[entry.new_step]) {
      const Info = stepInfo[entry.new_step].icon;
      return <Info className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between text-muted-foreground hover:text-foreground text-xs"
      >
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Historique des statuts
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      {expanded && (
        <div className="mt-2 pl-2 border-l-2 border-primary/20 space-y-3">
          {loading ? (
            <p className="text-xs text-muted-foreground py-2 pl-3">Chargement...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 pl-3">Aucun historique disponible</p>
          ) : (
            history.map((entry, index) => (
              <div key={entry.id} className="relative pl-5">
                {/* Dot */}
                <div className={`absolute left-[-5px] top-1 w-2 h-2 rounded-full ${
                  index === history.length - 1 ? 'bg-primary' : 'bg-muted-foreground/40'
                }`} />
                <div className="flex items-start gap-2">
                  <div className={`flex-shrink-0 ${index === history.length - 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {getEntryIcon(entry)}
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${index === history.length - 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {getEntryLabel(entry)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(entry.created_at)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default OrderStatusHistory;
