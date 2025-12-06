import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CreditCard, Smartphone, Wallet, ArrowUpRight, ArrowDownRight, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Transaction {
  id: string;
  type: 'recharge' | 'purchase' | 'refund';
  amount: number;
  description: string | null;
  payment_method: string | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

const Recharge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'momo' | 'orange' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const presetAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
      setLoadingTransactions(false);
    };

    if (user) {
      fetchTransactions();
    }
  }, [user]);

  // Pre-fill phone from profile
  useEffect(() => {
    if (profile?.phone) {
      setPhoneNumber(profile.phone);
    }
  }, [profile]);

  const handleRecharge = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!selectedMethod) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une méthode de paiement",
        variant: "destructive"
      });
      return;
    }

    if (!amount || parseInt(amount) < 500) {
      toast({
        title: "Erreur",
        description: "Le montant minimum est de 500 F",
        variant: "destructive"
      });
      return;
    }

    if (!phoneNumber || phoneNumber.length < 8) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un numéro de téléphone valide",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    toast({
      title: "Recharge initiée !",
      description: `Un code de validation a été envoyé au ${phoneNumber}`,
    });

    // Simulate payment processing (in production, integrate with payment provider)
    setTimeout(async () => {
      const rechargeAmount = parseInt(amount);
      const paymentMethodLabel = selectedMethod === 'momo' ? 'MTN MoMo' : 'Orange Money';

      // Insert transaction
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          type: 'recharge',
          amount: rechargeAmount,
          description: `Recharge via ${paymentMethodLabel}`,
          payment_method: paymentMethodLabel,
          status: 'completed'
        });

      if (transactionError) {
        toast({
          title: "Erreur",
          description: "Impossible de traiter la recharge",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      // Update wallet balance
      const newBalance = (profile?.wallet_balance || 0) + rechargeAmount;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (updateError) {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le solde",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      // Refresh profile and transactions
      await refreshProfile();
      
      const { data: newTransactions } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (newTransactions) {
        setTransactions(newTransactions as Transaction[]);
      }

      toast({
        title: "Recharge réussie !",
        description: `${rechargeAmount.toLocaleString()} F ont été ajoutés à votre compte`,
      });

      setAmount('');
      setIsProcessing(false);
    }, 2000);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return <ArrowDownRight className="h-4 w-4 text-pinbaoo-green" />;
      case 'purchase':
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-pinbaoo-yellow" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'recharge':
        return 'Recharge';
      case 'purchase':
        return 'Achat';
      case 'refund':
        return 'Remboursement';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pinbaoo-yellow border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Mon Portefeuille</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column - Recharge form */}
          <div className="space-y-6">
            {/* Current balance */}
            <Card className="bg-gradient-to-br from-pinbaoo-green to-emerald-500 border-0 text-white">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-white/80 text-sm">Solde actuel</p>
                  <p className="text-4xl font-bold mt-1">
                    {profile?.wallet_balance?.toLocaleString() || 0} F
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Méthode de paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedMethod('momo')}
                    disabled={isProcessing}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedMethod === 'momo'
                        ? 'border-pinbaoo-yellow bg-pinbaoo-yellow/10'
                        : 'border-border hover:border-pinbaoo-yellow/50'
                    } disabled:opacity-50`}
                  >
                    <Smartphone className="h-8 w-8 mx-auto mb-2 text-pinbaoo-yellow" />
                    <p className="text-foreground font-semibold">MTN MoMo</p>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('orange')}
                    disabled={isProcessing}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedMethod === 'orange'
                        ? 'border-pinbaoo-yellow bg-pinbaoo-yellow/10'
                        : 'border-border hover:border-pinbaoo-yellow/50'
                    } disabled:opacity-50`}
                  >
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-pinbaoo-yellow" />
                    <p className="text-foreground font-semibold">Orange Money</p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Amount */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Montant à recharger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Montant personnalisé
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Entrez le montant"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={isProcessing}
                      className="bg-input border-border text-foreground placeholder-muted-foreground pr-12"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      F
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {presetAmounts.map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      onClick={() => setAmount(preset.toString())}
                      disabled={isProcessing}
                      className="border-border hover:border-pinbaoo-yellow hover:bg-pinbaoo-yellow/10"
                    >
                      {preset.toLocaleString()} F
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Phone number */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Numéro de téléphone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Numéro {selectedMethod === 'momo' ? 'MTN' : 'Orange'}
                  </label>
                  <Input
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isProcessing}
                    className="bg-input border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {amount && selectedMethod && (
              <Card className="bg-muted border-border">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Montant</span>
                      <span>{parseInt(amount).toLocaleString()} F</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Frais</span>
                      <span>0 F</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between text-foreground font-bold text-lg">
                      <span>Total</span>
                      <span>{parseInt(amount).toLocaleString()} F</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recharge button */}
            <Button
              onClick={handleRecharge}
              disabled={!amount || !selectedMethod || !phoneNumber || isProcessing}
              className="coupon-button w-full"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Recharger mon compte
                </>
              )}
            </Button>
          </div>

          {/* Right column - Transaction history */}
          <div>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                  Historique des transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTransactions ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-pinbaoo-yellow border-t-transparent"></div>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune transaction pour le moment</p>
                    <p className="text-sm mt-1">Effectuez votre première recharge !</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-full bg-background">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {getTransactionLabel(transaction.type)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.description || transaction.payment_method}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(transaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className={`font-bold ${
                          transaction.type === 'purchase' 
                            ? 'text-destructive' 
                            : 'text-pinbaoo-green'
                        }`}>
                          {transaction.type === 'purchase' ? '-' : '+'}
                          {Math.abs(transaction.amount).toLocaleString()} F
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Recharge;