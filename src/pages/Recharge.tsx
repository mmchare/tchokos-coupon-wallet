import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Recharge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'momo' | 'orange' | null>(null);

  const presetAmounts = [1000, 5000, 10000, 25000, 50000, 100000];

  const handleRecharge = () => {
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

    toast({
      title: "Recharge initiée !",
      description: `Un code de validation a été envoyé au ${phoneNumber}`,
    });

    // Simuler le succès après 2 secondes
    setTimeout(() => {
      toast({
        title: "Recharge réussie !",
        description: `${amount} F ont été ajoutés à votre compte`,
      });
      navigate('/');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Recharge de compte</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Méthode de paiement */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Méthode de paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedMethod('momo')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMethod === 'momo'
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <Smartphone className="h-8 w-8 mx-auto mb-2 text-accent" />
                  <p className="text-foreground font-semibold">MTN MoMo</p>
                </button>
                <button
                  onClick={() => setSelectedMethod('orange')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMethod === 'orange'
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <Wallet className="h-8 w-8 mx-auto mb-2 text-accent" />
                  <p className="text-foreground font-semibold">Orange Money</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Montant */}
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
                    className="border-border hover:border-accent hover:bg-accent/10"
                  >
                    {preset.toLocaleString()} F
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Numéro de téléphone */}
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
                  className="bg-input border-border text-foreground placeholder-muted-foreground"
                />
              </div>
            </CardContent>
          </Card>

          {/* Résumé */}
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

          {/* Bouton de recharge */}
          <Button
            onClick={handleRecharge}
            disabled={!amount || !selectedMethod || !phoneNumber}
            className="coupon-button w-full"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Recharger mon compte
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Recharge;
