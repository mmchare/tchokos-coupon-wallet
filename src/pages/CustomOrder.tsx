import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Package, Globe, Truck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const CustomOrder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [productLink, setProductLink] = useState('');
  const [productName, setProductName] = useState('');
  const [details, setDetails] = useState('');
  const [budget, setBudget] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!productName) {
      toast({ title: 'Erreur', description: 'Décrivez le produit souhaité', variant: 'destructive' });
      return;
    }
    setSubmitted(true);
  };

  const steps = [
    { icon: Package, label: 'Décrivez', desc: 'Ce que vous cherchez' },
    { icon: Globe, label: 'On sourcer', desc: 'On trouve le meilleur prix' },
    { icon: Truck, label: 'Livraison', desc: 'Direct chez vous' },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Demande envoyée !</h2>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
          Notre équipe va étudier votre demande et vous contacter dans les 24h avec un devis.
        </p>
        <div className="rounded-xl border border-border bg-card p-4 w-full max-w-sm space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Produit</span>
            <span className="font-medium text-foreground">{productName}</span>
          </div>
          {budget && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium text-primary">{Number(budget).toLocaleString()} F</span>
            </div>
          )}
        </div>
        <Button onClick={() => navigate('/')} className="w-full max-w-sm">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">📋 Commande Sur Mesure</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* How it works */}
        <div className="flex gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex-1 text-center p-3 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <step.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-bold text-foreground">{step.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Quel produit cherchez-vous ?</label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: AirPods Pro 2ème génération"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Lien du produit (optionnel)</label>
            <Input
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              placeholder="https://amazon.com/... ou AliExpress, etc."
            />
            <p className="text-[10px] text-muted-foreground mt-1">Collez un lien Amazon, AliExpress, Alibaba...</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Détails & spécifications</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Couleur, taille, quantité, ou toute précision..."
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Budget maximum (FCFA)</label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Ex: 50000"
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!productName}>
            <Send className="h-4 w-4 mr-1" />
            Envoyer la demande
          </Button>
        </div>

        {/* Trust note */}
        <p className="text-xs text-muted-foreground text-center px-4">
          🔒 Paiement sécurisé · Vous ne payez qu'après validation du devis
        </p>
      </div>
    </div>
  );
};

export default CustomOrder;
