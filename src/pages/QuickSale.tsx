import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Zap, CheckCircle2, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const steps = [
  { id: 1, label: 'Photos', icon: Camera },
  { id: 2, label: 'Détails', icon: Zap },
  { id: 3, label: 'Prix', icon: CheckCircle2 },
];

const QuickSale = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - images.length);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setImages(prev => [...prev, ...newPreviews]);
    setImageFiles(prev => [...prev, ...newFiles]);
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop();
      const path = `listings/${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-media').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('product-media').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Connexion requise', description: 'Connectez-vous pour publier une annonce.', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    if (!title || !price) {
      toast({ title: 'Erreur', description: 'Remplissez le titre et le prix', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls = imageFiles.length > 0 ? await uploadImages() : [];

      const { error } = await supabase.from('quick_sale_listings' as any).insert({
        user_id: user.id,
        title,
        description: description || null,
        category: category || null,
        price: Number(price),
        images: uploadedUrls,
      } as any);

      if (error) throw error;

      toast({ title: '✅ Annonce publiée !', description: 'Votre produit est en ligne.' });
      navigate('/');
    } catch (err: any) {
      console.error('Submit error:', err);
      toast({ title: 'Erreur', description: err.message || 'Impossible de publier.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">⚡ Vente Rapide</h1>
        </div>
        <div className="flex items-center px-4 pb-3 gap-1">
          {steps.map((step) => (
            <div key={step.id} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1 w-full rounded-full transition-colors ${currentStep >= step.id ? 'bg-primary' : 'bg-muted'}`} />
              <span className={`text-[10px] font-medium ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6 pb-32">
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-foreground mb-1">Ajoutez des photos</h2>
              <p className="text-sm text-muted-foreground">5 photos max · La première sera la couverture</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted border-2 border-border overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {images.length < 5 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/10 transition-colors cursor-pointer">
                  <ImagePlus className="h-6 w-6 text-primary" />
                  <span className="text-[10px] font-medium text-primary">Ajouter</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
            <Button onClick={() => setCurrentStep(2)} className="w-full" disabled={images.length === 0}>
              Continuer
            </Button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-foreground mb-1">Décrivez votre produit</h2>
              <p className="text-sm text-muted-foreground">Un bon titre = plus de vues</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Titre</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: iPhone 13 Pro 128Go" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Catégorie</label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Téléphones, Vêtements..." />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="État, détails, raison de la vente..." rows={4} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">Retour</Button>
              <Button onClick={() => setCurrentStep(3)} className="flex-1" disabled={!title}>Continuer</Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-foreground mb-1">Fixez votre prix</h2>
              <p className="text-sm text-muted-foreground">Conseil : utilisez l'outil d'estimation IA</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Prix (FCFA)</label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: 150000" className="text-2xl font-bold h-14" />
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/estimate')} className="w-full">
              💰 Obtenir une estimation IA
            </Button>
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <h3 className="text-sm font-bold text-foreground">Résumé</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Titre</span>
                <span className="font-medium text-foreground">{title || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Photos</span>
                <span className="font-medium text-foreground">{images.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prix</span>
                <span className="font-bold text-primary">{price ? `${Number(price).toLocaleString()} F` : '—'}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">Retour</Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                {isSubmitting ? 'Publication...' : 'Publier'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickSale;
