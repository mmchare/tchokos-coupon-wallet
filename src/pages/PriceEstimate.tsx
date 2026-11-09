import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, TrendingUp, TrendingDown, Loader2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PriceEstimate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [productName, setProductName] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [estimated, setEstimated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState({ low: 0, mid: 0, high: 0 });
  const [reasoning, setReasoning] = useState('');
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  const conditions = [
    { key: 'new', label: 'Neuf', emoji: '✨' },
    { key: 'likenew', label: 'Comme neuf', emoji: '👌' },
    { key: 'good', label: 'Bon état', emoji: '👍' },
    { key: 'used', label: 'Usagé', emoji: '🔧' },
  ];

  const handleEstimate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-price-estimate', {
        body: { productName, condition, description },
      });

      if (error) throw error;

      setEstimatedPrice({ low: data.low, mid: data.mid, high: data.high });
      setReasoning(data.reasoning || '');
      setSimilarProducts(data.similarProducts || []);
      setEstimated(true);
    } catch (err: any) {
      console.error('Estimation error:', err);
      toast({
        title: 'Erreur',
        description: err.message || "Impossible d'estimer le prix. Réessayez.",
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 lg:max-w-6xl lg:mx-auto lg:px-8">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">💰 Estimation de Prix</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 lg:max-w-6xl lg:mx-auto lg:px-8 lg:py-10">
        {!estimated ? (
          <div className="space-y-5 animate-fade-in lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10 lg:items-start">
            <div className="text-center py-4 lg:text-left lg:py-10 lg:px-8 lg:rounded-2xl lg:bg-primary/10 lg:border lg:border-primary/20 lg:sticky lg:top-24">
              <span className="text-5xl mb-3 block lg:text-6xl">🤖</span>
              <h2 className="text-base font-bold text-foreground lg:text-2xl">Estimation IA intelligente</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Notre IA analyse les prix réels sur JinBao pour vous donner une estimation précise.
              </p>
              <ol className="hidden lg:block mt-6 space-y-3 text-sm text-foreground">
                <li><span className="font-bold text-primary mr-2">1.</span>Indiquez le nom exact du produit</li>
                <li><span className="font-bold text-primary mr-2">2.</span>Choisissez son état</li>
                <li><span className="font-bold text-primary mr-2">3.</span>Recevez un prix minimum, recommandé et maximum</li>
              </ol>
            </div>

            <div className="space-y-4 lg:p-8 lg:rounded-2xl lg:border lg:border-border lg:bg-card">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nom du produit</label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ex: Samsung Galaxy S24 Ultra" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">État du produit</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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

              <Button onClick={handleEstimate} className="w-full" disabled={!productName || !condition || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-1" />
                    Estimer avec l'IA
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
            <div className="text-center py-4 lg:col-span-2">
              <span className="text-5xl mb-3 block">📊</span>
              <h2 className="text-base font-bold text-foreground">Estimation pour</h2>
              <p className="text-primary font-bold text-lg">{productName}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-4 lg:row-span-2">
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

            {reasoning && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Analyse IA</span>
                </div>
                <p className="text-sm text-muted-foreground">{reasoning}</p>
              </div>
            )}

            {similarProducts.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">📦 Produits similaires sur JinBao</h3>
                <div className="space-y-2">
                  {similarProducts.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground truncate flex-1 mr-2">{p.name}</span>
                      <span className="font-bold text-foreground whitespace-nowrap">{Number(p.price).toLocaleString()} F</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center lg:col-span-2">
              Estimation basée sur l'IA et les données réelles de JinBao.
            </p>

            <div className="flex gap-3 lg:col-span-2 lg:max-w-md lg:mx-auto lg:w-full">
              <Button variant="outline" onClick={() => { setEstimated(false); setReasoning(''); setSimilarProducts([]); }} className="flex-1">
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
