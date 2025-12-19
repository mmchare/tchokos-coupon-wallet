import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CreditCard, Smartphone, Wallet, ArrowUpRight, ArrowDownRight, Clock, RefreshCw, CheckCircle, XCircle, Loader2, ShieldOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

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

  // Poll for transaction status updates
  const pollTransactionStatus = async (transactionId: string) => {
    const maxAttempts = 30; // 5 minutes max (10 seconds interval)
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        setPaymentStatus('failed');
        toast({
          title: "Délai d'attente dépassé",
          description: "Le paiement n'a pas pu être confirmé. Vérifiez votre solde.",
          variant: "destructive"
        });
        return;
      }

      const { data: tx, error } = await supabase
        .from('wallet_transactions')
        .select('status')
        .eq('id', transactionId)
        .single();

      if (error) {
        console.error('Error checking transaction:', error);
        return;
      }

      if (tx.status === 'completed') {
        setPaymentStatus('success');
        await refreshProfile();
        await refreshTransactions();
        toast({
          title: "Recharge réussie !",
          description: `${parseInt(amount).toLocaleString()} F ont été ajoutés à votre compte`,
        });
        setAmount('');
        setIsProcessing(false);
        return;
      }

      if (tx.status === 'failed') {
        setPaymentStatus('failed');
        toast({
          title: "Paiement échoué",
          description: "Le paiement n'a pas pu être effectué. Veuillez réessayer.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      // Still pending, continue polling
      attempts++;
      setTimeout(checkStatus, 10000); // Check every 10 seconds
    };

    checkStatus();
  };

  const refreshTransactions = async () => {
    if (!user) return;
    const { data: newTransactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (newTransactions) {
      setTransactions(newTransactions as Transaction[]);
    }
  };

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
    setPaymentStatus('pending');
    setPaymentUrl(null);

    // IMPORTANT: many browsers block window.open if it's not done immediately on a user gesture.
    // So we open a blank tab synchronously, then redirect it once we receive the authorization_url.
    const paymentWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');

    try {
      const { data, error } = await supabase.functions.invoke('notchpay-payment', {
        body: {
          amount: parseInt(amount),
          phone_number: phoneNumber,
          payment_method: selectedMethod,
          user_id: user.id,
          description: `Recharge via ${selectedMethod === 'momo' ? 'MTN MoMo' : 'Orange Money'}`
        }
      });

      if (error) {
        console.error('Payment initiation error:', error);
        setPaymentStatus('failed');
        toast({
          title: "Erreur",
          description: "Impossible d'initier le paiement. Veuillez réessayer.",
          variant: "destructive"
        });
        if (paymentWindow) paymentWindow.close();
        setIsProcessing(false);
        return;
      }

      if (data?.error) {
        setPaymentStatus('failed');
        toast({
          title: "Erreur",
          description: data.error,
          variant: "destructive"
        });
        if (paymentWindow) paymentWindow.close();
        setIsProcessing(false);
        return;
      }

      // If Notchpay provides an authorization URL, load it in the pre-opened tab.
      if (data?.authorization_url) {
        setPaymentUrl(data.authorization_url);

        if (paymentWindow) {
          try {
            paymentWindow.location.href = data.authorization_url;
          } catch (e) {
            console.warn('Could not redirect pre-opened payment window, falling back to window.open', e);
            const opened = window.open(data.authorization_url, '_blank', 'noopener,noreferrer');
            if (!opened) {
              toast({
                title: "Action requise",
                description: "Appuyez sur 'Ouvrir la page de paiement' pour valider.",
              });
            }
          }
        } else {
          // Popup blocked even on user click (rare, but possible)
          toast({
            title: "Action requise",
            description: "Autorisez l'ouverture des popups puis appuyez sur 'Ouvrir la page de paiement'.",
          });
        }
      } else {
        // Some flows may not return an URL; in this case we don't need the tab.
        if (paymentWindow) paymentWindow.close();
      }

      toast({
        title: "Paiement initié !",
        description: `Confirmez le paiement sur votre téléphone ${phoneNumber}`,
      });

      // Start polling for transaction status
      if (data?.transaction_id) {
        pollTransactionStatus(data.transaction_id);
      }

    } catch (err) {
      console.error('Payment error:', err);
      setPaymentStatus('failed');
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive"
      });
      if (paymentWindow) paymentWindow.close();
      setIsProcessing(false);
    }
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') {
      return <Loader2 className="h-4 w-4 text-jinbao-blue animate-spin" />;
    }
    if (status === 'failed') {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    switch (type) {
      case 'recharge':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case 'purchase':
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-jinbao-blue" />;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Confirmé</span>;
      case 'pending':
        return <span className="text-xs text-jinbao-blue flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> En attente</span>;
      case 'failed':
        return <span className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> Échoué</span>;
      default:
        return null;
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-jinbao-red border-t-transparent"></div>
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
            <Card className="bg-gradient-to-br from-jinbao-red to-red-600 border-0 text-white">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-white/80 text-sm">Solde actuel</p>
                  <p className="text-4xl font-bold mt-1">
                    {profile?.wallet_balance?.toLocaleString() || 0} F
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status Indicator */}
            {paymentStatus !== 'idle' && (
              <Card className={`border-2 ${
                paymentStatus === 'pending' ? 'border-jinbao-blue bg-jinbao-blue/5' :
                paymentStatus === 'success' ? 'border-green-500 bg-green-500/5' :
                'border-destructive bg-destructive/5'
              }`}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    {paymentStatus === 'pending' && (
                      <>
                        <div className="flex items-center justify-center gap-3">
                          <Loader2 className="h-6 w-6 text-jinbao-blue animate-spin" />
                          <div>
                            <p className="font-semibold text-foreground">Paiement en cours...</p>
                            <p className="text-sm text-muted-foreground">Confirmez sur votre téléphone</p>
                          </div>
                        </div>

                        {paymentUrl && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => window.open(paymentUrl, '_blank', 'noopener,noreferrer')}
                            className="mt-2"
                          >
                            Ouvrir la page de paiement
                          </Button>
                        )}
                      </>
                    )}
                    {paymentStatus === 'success' && (
                      <>
                        <CheckCircle className="h-6 w-6 text-green-500" />
                        <div>
                          <p className="font-semibold text-foreground">Paiement réussi !</p>
                          <p className="text-sm text-muted-foreground">Votre solde a été mis à jour</p>
                        </div>
                      </>
                    )}
                    {paymentStatus === 'failed' && (
                      <>
                        <XCircle className="h-6 w-6 text-destructive" />
                        <div>
                          <p className="font-semibold text-foreground">Paiement échoué</p>
                          <p className="text-sm text-muted-foreground">Veuillez réessayer</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* VPN Warning */}
            <Alert className="border-amber-500 bg-amber-500/10">
              <ShieldOff className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-amber-600 dark:text-amber-400">Important - VPN & Localisation</AlertTitle>
              <AlertDescription className="text-muted-foreground text-sm">
                Les paiements NotchPay ne fonctionnent que depuis l'Afrique Centrale et de l'Ouest. 
                <strong className="block mt-1">Désactivez votre VPN</strong> avant d'effectuer un paiement pour éviter tout blocage.
              </AlertDescription>
            </Alert>

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
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-border hover:border-yellow-500/50'
                    } disabled:opacity-50`}
                  >
                    <Smartphone className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-foreground font-semibold">MTN MoMo</p>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('orange')}
                    disabled={isProcessing}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedMethod === 'orange'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-border hover:border-orange-500/50'
                    } disabled:opacity-50`}
                  >
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-orange-500" />
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
                      className="border-border hover:border-jinbao-red hover:bg-jinbao-red/10"
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
                    Numéro {selectedMethod === 'momo' ? 'MTN' : selectedMethod === 'orange' ? 'Orange' : ''}
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
                      <span>Frais Notchpay</span>
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
              className="bg-jinbao-red hover:bg-jinbao-red/90 text-white w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
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
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-jinbao-red border-t-transparent"></div>
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
                            {getTransactionIcon(transaction.type, transaction.status)}
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
                            {getStatusBadge(transaction.status)}
                          </div>
                        </div>
                        <div className={`font-bold ${
                          transaction.type === 'purchase' 
                            ? 'text-destructive' 
                            : transaction.status === 'completed'
                            ? 'text-green-500'
                            : 'text-muted-foreground'
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
