import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PriceEstimate = () => {
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [estimated, setEstimated] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState({ low: 0, mid: 0, high: 0 });

  const conditions = [
    { key: 'new', label: 'Neuf', emoji: '✨' },
    { key: 'likenew', label: 'Comme neuf', emoji: '👌' },
    { key: 'good', label: 'Bon état', emoji: '👍' },
    { key: 'used', label: 'Usagé', emoji: '🔧' },
  ];

  const handleEstimate = () => {
    // Simulated estimation based on a random range
    const base = Math.floor(Math.random() * 200000) + 30000;
    const factor = condition === 'new' ? 1 : condition === 'likenew' ? 0.85 : condition === 'good' ? 0.7 : 0.5;
    const mid = Math.round(base * factor);
    setEstimatedPrice({
      low: Math.round(mid * 0.8),
      mid,
      high: Math.round(mid * 1.2),
    });
    setEstimated(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">💰 Estimation de Prix</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {!estimated ? (
          <div className="space-y-5 animate-fade-in">
            {/* Intro */}
            <div className="text-center py-4">
              <span className="text-5xl mb-3 block">💰</span>
              <h2 className="text-base font-bold text-foreground">Combien vaut votre produit ?</h2>
              <p className="text-sm text-muted-foreground mt-1">Décrivez-le et on vous donne une estimation basée sur le marché JinBao.</p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nom du produit</label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ex: Samsung Galaxy S24 Ultra" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">État du produit</label>
                <div className="grid grid-cols-2 gap-2">
                  {conditions.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCondition(c.key)}
                      className={`p-3 rounded-xl border-2 text-left transition-colors ${
                        condition === c.key
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/30'
                      }`}
                    >
                      <span className="text-xl">{c.emoji}</span>
                      <p className={`text-sm font-semibold mt-1 ${condition === c.key ? 'text-primary' : 'text-foreground'}`}>
                        {c.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Détails (optionnel)</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Année d'achat, accessoires inclus, défauts..."
                  rows={3}
                />
              </div>

              <Button onClick={handleEstimate} className="w-full" disabled={!productName || !condition}>
                <Sparkles className="h-4 w-4 mr-1" />
                Estimer le prix
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Result */}
            <div className="text-center py-4">
              <span className="text-5xl mb-3 block">📊</span>
              <h2 className="text-base font-bold text-foreground">Estimation pour</h2>
              <p className="text-primary font-bold text-lg">{productName}</p>
            </div>

            {/* Price range card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm">Min</span>
                </div>
                <span className="font-bold text-foreground">{estimatedPrice.low.toLocaleString()} F</span>
              </div>

              <div className="flex items-center justify-between bg-primary/10 -mx-5 px-5 py-3">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-bold">Prix recommandé</span>
                </div>
                <span className="font-extrabold text-primary text-xl">{estimatedPrice.mid.toLocaleString()} F</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Max</span>
                </div>
                <span className="font-bold text-foreground">{estimatedPrice.high.toLocaleString()} F</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Estimation basée sur les ventes récentes sur JinBao. Les prix réels peuvent varier.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEstimated(false)} className="flex-1">
                Nouvelle estimation
              </Button>
              <Button onClick={() => navigate('/quick-sale')} className="flex-1">
                Vendre maintenant
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceEstimate;
