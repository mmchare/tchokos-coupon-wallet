import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, ChevronRight, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Order {
  id: string;
  user_id: string;
  product_id: string | null;
  total_amount: number;
  status: string;
  logistics_step: number;
  city: string;
  delivery_address: string;
  whatsapp_number: string;
  created_at: string;
  products?: {
    name: string;
    images: string[] | null;
  } | null;
  profiles?: {
    full_name: string;
    phone: string;
  } | null;
}

const LOGISTICS_STEPS = [
  { step: 1, label: 'Commande confirmée' },
  { step: 2, label: 'Préparation en Chine' },
  { step: 3, label: 'Expédition internationale' },
  { step: 4, label: 'Livraison locale' },
];

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        products (name, images),
        profiles:user_id (full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateOrderStep = async (orderId: string, newStep: number) => {
    const { error } = await supabase
      .from('orders')
      .update({ logistics_step: newStep })
      .eq('id', orderId);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour la commande", variant: "destructive" });
      return;
    }

    // Log action
    await supabase.rpc('log_admin_action', {
      p_action: 'UPDATE_ORDER_STATUS',
      p_target_type: 'order',
      p_target_id: orderId,
      p_details: { new_step: newStep, step_label: LOGISTICS_STEPS.find(s => s.step === newStep)?.label }
    });

    toast({ title: "Succès", description: "Statut mis à jour" });
    fetchOrders();
  };

  const handleBatchUpdate = async (newStep: number) => {
    if (selectedOrders.length === 0) {
      toast({ title: "Attention", description: "Sélectionnez des commandes", variant: "destructive" });
      return;
    }

    for (const orderId of selectedOrders) {
      await supabase
        .from('orders')
        .update({ logistics_step: newStep })
        .eq('id', orderId);

      await supabase.rpc('log_admin_action', {
        p_action: 'BATCH_UPDATE_ORDER',
        p_target_type: 'order',
        p_target_id: orderId,
        p_details: { new_step: newStep, batch_size: selectedOrders.length }
      });
    }

    toast({ title: "Succès", description: `${selectedOrders.length} commande(s) mise(s) à jour` });
    setSelectedOrders([]);
    fetchOrders();
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const toggleSelect = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.products?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || o.logistics_step.toString() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commandes</h1>
        <p className="text-muted-foreground">Gérez les commandes et la logistique</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {LOGISTICS_STEPS.map(step => (
              <SelectItem key={step.step} value={step.step.toString()}>
                {step.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Batch Actions */}
      {selectedOrders.length > 0 && (
        <Card className="bg-jinbao-red/10 border-jinbao-red/30">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium">
                {selectedOrders.length} commande(s) sélectionnée(s)
              </span>
              <div className="flex gap-2">
                {LOGISTICS_STEPS.map(step => (
                  <Button
                    key={step.step}
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchUpdate(step.step)}
                  >
                    → {step.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Livraison</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune commande trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleSelect(order.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {order.products?.images?.[0] && (
                          <img
                            src={order.products.images[0]}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium line-clamp-1">{order.products?.name || 'Produit'}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.profiles?.full_name || 'Client'}</p>
                        <a
                          href={`https://wa.me/${order.whatsapp_number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-jinbao-blue flex items-center gap-1 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {order.whatsapp_number}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.total_amount.toLocaleString()} F
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{order.city}</p>
                        <p className="text-muted-foreground line-clamp-1">{order.delivery_address}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.logistics_step === 4 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {LOGISTICS_STEPS.find(s => s.step === order.logistics_step)?.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={order.logistics_step.toString()}
                        onValueChange={(value) => updateOrderStep(order.id, parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOGISTICS_STEPS.map(step => (
                            <SelectItem key={step.step} value={step.step.toString()}>
                              Étape {step.step}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrders;
