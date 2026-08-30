import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Package, Globe, Truck, CheckCircle2, ImagePlus, X, Loader2, MessageCircle } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupportChat } from '@/hooks/useSupportChat';

const schema = z.object({
  product_name: z.string().trim().min(3, 'Décrivez le produit (3 caractères min)').max(150),
  product_link: z.string().trim().max(500).url('Lien invalide').optional().or(z.literal('')),
  details: z.string().trim().max(1000).optional().or(z.literal('')),
  whatsapp_number: z.string().trim().min(8, 'Numéro WhatsApp requis').max(20),
  budget_max: z.number().positive('Budget invalide').max(100000000).optional(),
});

type CustomOrderRow = {
  id: string;
  product_name: string;
  product_link: string | null;
  details: string | null;
  budget_max: number | null;
  status: string;
  admin_response: string | null;
  quote_amount: number | null;
  quote_delay_days: number | null;
  images: string[] | null;
  created_at: string;
};

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-amber-500/15 text-amber-600' },
  quoted: { label: 'Devis reçu', className: 'bg-primary/15 text-primary' },
  accepted: { label: 'Acceptée', className: 'bg-emerald-500/15 text-emerald-600' },
  rejected: { label: 'Refusée', className: 'bg-destructive/15 text-destructive' },
  completed: { label: 'Terminée', className: 'bg-emerald-500/15 text-emerald-600' },
};

const CustomOrder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { openSupportChat, opening } = useSupportChat();

  const [productLink, setProductLink] = useState('');
  const [productName, setProductName] = useState('');
  const [details, setDetails] = useState('');
  const [budget, setBudget] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requests, setRequests] = useState<CustomOrderRow[]>([]);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('custom_orders')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests((data as CustomOrderRow[]) || []);
  }, [user]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('custom-orders-user')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_orders', filter: `user_id=eq.${user.id}` }, () => loadRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadRequests]);

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles.slice(0, 4)) {
      const ext = file.name.split('.').pop();
      const path = `custom-orders/${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-media').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('product-media').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const parsed = schema.safeParse({
      product_name: productName,
      product_link: productLink,
      details,
      whatsapp_number: whatsapp,
      budget_max: budget ? Number(budget) : undefined,
    });
    if (!parsed.success) {
      toast({ title: 'Erreur', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const images = imageFiles.length ? await uploadImages() : [];
      const { error } = await supabase.from('custom_orders').insert({
        user_id: user.id,
        product_name: parsed.data.product_name,
        product_link: parsed.data.product_link || null,
        details: parsed.data.details || null,
        whatsapp_number: parsed.data.whatsapp_number,
        budget_max: parsed.data.budget_max ?? null,
        images,
        status: 'pending',
      });
      if (error) throw error;
      setSubmitted(true);
      setImageFiles([]);
      loadRequests();
    } catch (e) {
      toast({ title: 'Erreur', description: "L'envoi a échoué, réessayez.", variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const respondToQuote = async (id: string, accept: boolean) => {
    const { error } = await supabase
      .from('custom_orders')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: 'Action impossible', variant: 'destructive' });
      return;
    }
    toast({ title: accept ? 'Devis accepté' : 'Devis refusé', description: accept ? 'Notre équipe lance le sourcing.' : 'Demande clôturée.' });
    loadRequests();
  };

  const steps = [
    { icon: Package, label: 'Décrivez', desc: 'Ce que vous cherchez' },
    { icon: Globe, label: 'On source', desc: 'On trouve le meilleur prix' },
    { icon: Truck, label: 'Livraison', desc: 'Direct chez vous' },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Demande envoyée !</h1>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
          Notre équipe étudie votre demande et vous envoie un devis sous 24h. Vous serez notifié dans l'app.
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
        <Button onClick={() => { setSubmitted(false); setProductName(''); setProductLink(''); setDetails(''); setBudget(''); }} variant="outline" className="w-full max-w-sm mb-2">
          Voir mes demandes
        </Button>
        <Button onClick={() => navigate('/')} className="w-full max-w-sm">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1" aria-label="Retour">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">📋 Commande Sur Mesure</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
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

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">Nouvelle demande</h2>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block" htmlFor="co-name">Quel produit cherchez-vous ?</label>
            <Input id="co-name" value={productName} onChange={(e) => setProductName(e.target.value)} maxLength={150} placeholder="Ex: AirPods Pro 2ème génération" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block" htmlFor="co-link">Lien du produit (optionnel)</label>
            <Input id="co-link" value={productLink} onChange={(e) => setProductLink(e.target.value)} maxLength={500} placeholder="https://taobao.com/... ou AliExpress, etc." />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block" htmlFor="co-details">Détails & spécifications</label>
            <Textarea id="co-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder="Couleur, taille, quantité, ou toute précision..." rows={4} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Photos de référence (optionnel)</label>
            <div className="flex flex-wrap gap-2">
              {imageFiles.map((f, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={URL.createObjectURL(f)} alt={`Référence ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => setImageFiles(p => p.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-background/80 p-0.5" aria-label="Retirer la photo">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {imageFiles.length < 4 && (
                <label className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer">
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setImageFiles(p => [...p, ...Array.from(e.target.files || [])].slice(0, 4))} />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block" htmlFor="co-budget">Budget maximum (FCFA)</label>
            <Input id="co-budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex: 50000" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block" htmlFor="co-wa">Numéro WhatsApp</label>
            <Input id="co-wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={20} placeholder="Ex: 6XXXXXXXX" />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting || authLoading}>
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            {user ? 'Envoyer la demande' : 'Se connecter pour envoyer'}
          </Button>
        </div>

        {user && requests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground">Mes demandes</h2>
            {requests.map((r) => {
              const st = STATUS[r.status] || STATUS.pending;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{r.product_name}</h3>
                    <Badge className={st.className} variant="secondary">{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                    {r.budget_max ? ` · Budget ${Number(r.budget_max).toLocaleString()} F` : ''}
                  </p>
                  {r.admin_response && (
                    <p className="text-xs text-foreground bg-muted/50 rounded-lg p-2">💬 {r.admin_response}</p>
                  )}
                  {r.status === 'quoted' && (
                    <div className="space-y-2">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <p className="text-sm font-bold text-primary">Devis : {Number(r.quote_amount || 0).toLocaleString()} FCFA</p>
                        {r.quote_delay_days && <p className="text-xs text-muted-foreground">Délai estimé : {r.quote_delay_days} jours</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => respondToQuote(r.id, true)}>Accepter</Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => respondToQuote(r.id, false)}>Refuser</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center px-4">
          🔒 Paiement sécurisé · Vous ne payez qu'après validation du devis
        </p>
      </div>
    </div>
  );
};

export default CustomOrder;
