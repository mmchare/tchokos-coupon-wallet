import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Search, Wrench, CheckCircle, XCircle, Loader2, CalendarIcon, X } from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    wallet_balance: number;
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
  
  // Date filter state
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  // Reconciliation state
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [searchRef, setSearchRef] = useState('');
  const [searchResult, setSearchResult] = useState<Transaction | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch wallet transactions
    const { data: txData } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        profiles:user_id (full_name, wallet_balance)
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

  const handleSearchTransaction = async () => {
    if (!searchRef.trim()) return;
    
    setIsSearching(true);
    setSearchResult(null);

    // Search by transaction ID (UUID) or by description containing the reference
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        profiles:user_id (full_name, wallet_balance)
      `)
      .or(`id.eq.${searchRef.trim()},description.ilike.%${searchRef.trim()}%`)
      .limit(1)
      .maybeSingle();

    if (error) {
      toast({
        title: "Erreur de recherche",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setSearchResult(data as Transaction);
    } else {
      toast({
        title: "Transaction non trouvée",
        description: "Aucune transaction ne correspond à cette référence",
        variant: "destructive",
      });
    }

    setIsSearching(false);
  };

  const handleReconcile = async () => {
    if (!searchResult) return;
    
    setIsReconciling(true);

    try {
      // 1. Update transaction status to completed
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .update({ status: 'completed' })
        .eq('id', searchResult.id);

      if (txError) throw txError;

      // 2. Get current wallet balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', searchResult.user_id)
        .single();

      if (profileError) throw profileError;

      // 3. Credit the wallet
      const newBalance = Number(profile.wallet_balance) + Number(searchResult.amount);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', searchResult.user_id);

      if (updateError) throw updateError;

      // 4. Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: 'RECONCILE_TRANSACTION',
        p_target_type: 'wallet_transaction',
        p_target_id: searchResult.id,
        p_details: {
          amount: searchResult.amount,
          user_id: searchResult.user_id,
          previous_balance: profile.wallet_balance,
          new_balance: newBalance
        }
      });

      // 5. Send notification to user
      await supabase
        .from('notifications')
        .insert({
          user_id: searchResult.user_id,
          message_type: 'CAMPAGNE',
          message_body: `Votre recharge de ${Number(searchResult.amount).toLocaleString()} F a été validée manuellement. Votre nouveau solde est de ${newBalance.toLocaleString()} F.`
        });

      toast({
        title: "Transaction réconciliée",
        description: `${Number(searchResult.amount).toLocaleString()} F crédités avec succès. L'utilisateur a été notifié.`,
      });

      // Refresh data
      setSearchResult(null);
      setSearchRef('');
      setReconcileOpen(false);
      fetchData();

    } catch (error: any) {
      toast({
        title: "Erreur de réconciliation",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsReconciling(false);
  };

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const totalRecharges = transactions
    .filter(t => t.type === 'credit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalDebits = transactions
    .filter(t => t.type === 'debit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pendingTransactions = transactions.filter(t => t.status === 'pending');

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const filteredTransactions = transactions.filter(t => {
    // Type/status filter
    let passesTypeFilter = true;
    if (filter === 'pending') passesTypeFilter = t.status === 'pending';
    else if (filter !== 'all') passesTypeFilter = t.type === filter;
    
    // Date filter
    let passesDateFilter = true;
    if (dateFrom || dateTo) {
      const txDate = new Date(t.created_at);
      const from = dateFrom ? startOfDay(dateFrom) : new Date(0);
      const to = dateTo ? endOfDay(dateTo) : new Date();
      passesDateFilter = isWithinInterval(txDate, { start: from, end: to });
    }
    
    return passesTypeFilter && passesDateFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground">Suivi des transactions et revenus</p>
        </div>
        
        {/* Reconciliation Button */}
        <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Wrench className="h-4 w-4" />
              Réconcilier une transaction
              {pendingTransactions.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingTransactions.length}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Réconcilier une transaction</DialogTitle>
              <DialogDescription>
                Recherchez une transaction par ID ou référence Notchpay pour la débloquer manuellement
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="ID transaction ou référence Notchpay..."
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchTransaction()}
                />
                <Button onClick={handleSearchTransaction} disabled={isSearching || !searchRef.trim()}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {/* Search Result */}
              {searchResult && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{searchResult.profiles?.full_name || 'Utilisateur'}</p>
                        <p className="text-sm text-muted-foreground">ID: {searchResult.id.slice(0, 8)}...</p>
                      </div>
                      <Badge variant={searchResult.status === 'pending' ? 'secondary' : searchResult.status === 'completed' ? 'default' : 'destructive'}>
                        {searchResult.status === 'pending' ? 'En attente' : searchResult.status === 'completed' ? 'Complété' : 'Échoué'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Montant</p>
                        <p className="font-bold text-green-500">+{Number(searchResult.amount).toLocaleString()} F</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Méthode</p>
                        <p>{searchResult.payment_method || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Solde actuel</p>
                        <p>{Number(searchResult.profiles?.wallet_balance || 0).toLocaleString()} F</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p>{format(new Date(searchResult.created_at), 'dd/MM/yy HH:mm')}</p>
                      </div>
                    </div>

                    {searchResult.description && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Description</p>
                        <p className="text-xs break-all">{searchResult.description}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {searchResult.status === 'pending' ? (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          className="flex-1 gap-2" 
                          onClick={handleReconcile}
                          disabled={isReconciling}
                        >
                          {isReconciling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Valider et créditer
                        </Button>
                      </div>
                    ) : searchResult.status === 'completed' ? (
                      <p className="text-sm text-green-500 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Cette transaction est déjà complétée
                      </p>
                    ) : (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <XCircle className="h-4 w-4" />
                        Cette transaction a échoué
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Pending Transactions Quick List */}
              {pendingTransactions.length > 0 && !searchResult && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Transactions en attente ({pendingTransactions.length})</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {pendingTransactions.slice(0, 5).map((tx) => (
                      <button
                        key={tx.id}
                        onClick={() => {
                          setSearchRef(tx.id);
                          setSearchResult(tx);
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors text-sm"
                      >
                        <div className="flex justify-between">
                          <span>{tx.profiles?.full_name || 'Utilisateur'}</span>
                          <span className="text-green-500 font-medium">+{Number(tx.amount).toLocaleString()} F</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'dd/MM HH:mm')} • {tx.id.slice(0, 8)}...
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-10 w-10 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {totalRecharges.toLocaleString()} F
                </p>
                <p className="text-sm text-muted-foreground">Total recharges</p>
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
                <p className="text-sm text-muted-foreground">Total débits</p>
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
        {pendingTransactions.length > 0 && (
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Loader2 className="h-10 w-10 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-yellow-500">
                    {pendingTransactions.length}
                  </p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-bold">Historique des transactions</h2>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Du'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Au'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Clear date filter */}
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={clearDateFilter}>
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Type filter */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="credit">Recharges</SelectItem>
              <SelectItem value="debit">Débits</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                <TableHead>Statut</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune transaction trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className={tx.status === 'pending' ? 'bg-yellow-500/5' : ''}>
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
                    <TableCell>
                      <Badge variant={tx.status === 'pending' ? 'secondary' : tx.status === 'completed' ? 'default' : 'destructive'}>
                        {tx.status === 'pending' ? 'En attente' : tx.status === 'completed' ? 'OK' : 'Échoué'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
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
