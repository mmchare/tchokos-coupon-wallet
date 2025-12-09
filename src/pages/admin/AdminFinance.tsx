import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string | null;
  payment_method: string | null;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  } | null;
}

interface Order {
  id: string;
  total_amount: number;
  created_at: string;
}

const AdminFinance = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Fetch wallet transactions
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (txData) {
        setTransactions(txData as Transaction[]);
      }

      // Fetch orders for revenue calculation
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, total_amount, created_at')
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const totalRecharges = transactions
    .filter(t => t.type === 'credit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalDebits = transactions
    .filter(t => t.type === 'debit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance</h1>
        <p className="text-muted-foreground">Suivi des transactions et revenus</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-10 w-10 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {totalRecharges.toLocaleString()} F
                </p>
                <p className="text-sm text-muted-foreground">Total recharges (Feexpay)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-jinbao-red/20 to-red-600/20 border-jinbao-red/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingDown className="h-10 w-10 text-jinbao-red" />
              <div>
                <p className="text-2xl font-bold text-jinbao-red">
                  {totalDebits.toLocaleString()} F
                </p>
                <p className="text-sm text-muted-foreground">Total débits (Achats)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-jinbao-blue/20 to-blue-600/20 border-jinbao-blue/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <DollarSign className="h-10 w-10 text-jinbao-blue" />
              <div>
                <p className="text-2xl font-bold text-jinbao-blue">
                  {totalRevenue.toLocaleString()} F
                </p>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Historique des transactions</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="credit">Recharges</SelectItem>
            <SelectItem value="debit">Débits</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucune transaction trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {tx.type === 'credit' ? (
                        <span className="flex items-center gap-1 text-green-500">
                          <ArrowDownLeft className="h-4 w-4" />
                          Recharge
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-jinbao-red">
                          <ArrowUpRight className="h-4 w-4" />
                          Débit
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {tx.profiles?.full_name || 'Utilisateur'}
                    </TableCell>
                    <TableCell className={tx.type === 'credit' ? 'text-green-500' : 'text-jinbao-red'}>
                      {tx.type === 'credit' ? '+' : '-'}{Number(tx.amount).toLocaleString()} F
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tx.description || '-'}
                    </TableCell>
                    <TableCell>
                      {tx.payment_method || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
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

export default AdminFinance;
