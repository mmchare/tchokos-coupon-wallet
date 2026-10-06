import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Zap, Wallet, MonitorPlay, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db, DigitalProduct as DP, durationLabel, formatFcfa } from '@/lib/digital';

const DigitalProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const [base, setBase] = useState<DP | null>(null);
  const [variants, setVariants] = useState<DP[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [profileType, setProfileType] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await db.from('digital_products').select('*').eq('id', id).maybeSingle();
      if (p) {
        setBase(p);
        const { data: v } = await db.from('digital_products').select('*').eq('platform', p.platform).eq('is_active', true).order('price_fcfa');
        setVariants(v || [p]);
        setDuration(p.duration_months);
        setProfileType(p.profile_type);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => { if (profile?.phone && !whatsapp) setWhatsapp(profile.phone); }, [profile]);
  useEffect(() => { refreshProfile(); }, []);

  const durations = useMemo(() => [...new Set(variants.map(v => v.duration_months))].sort((a, b) => a - b), [variants]);
  const types = useMemo(() => [...new Set(variants.filter(v => v.duration_months === duration).map(v => v.profile_type))], [variants, duration]);
  const selected = variants.find(v => v.duration_months === duration && v.profile_type === profileType)
    || variants.find(v => v.duration_months === duration) || null;

  useEffect(() => { if (selected && selected.profile_type !== profileType) setProfileType(selected.profile_type); }, [selected]);

  const balance = Number(profile?.wallet_balance ?? 0);
  const insufficient = !!selected && balance < Number(selected.price_fcfa);

  const pay = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!selected) return;
    setBusy(true);
    const { data, error } = await db.rpc('purchase_digital_product', { p_product_id: selected.id, p_whatsapp: whatsapp });
    setBusy(false);
    if (error || !data?.success) {
      toast({ title: data?.code === 'out_of_stock' ? 'Rupture de stock' : 'Achat impossible', description: data?.error || error?.message, variant: 'destructive' });
      await refreshProfile();
      return;
    }
    await refreshProfile();
    toast({ title: 'Abonnement activé 🎉', description: 'Vos identifiants sont disponibles dans Mes abonnements.' });
    navigate('/subscriptions');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!base) return <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background"><p className="text-muted-foreground">Offre introuvable</p><Button onClick={() => navigate('/')}>Accueil</Button></div>;

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="font-bold text-foreground truncate">{base.platform}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden">
            {base.logo_url ? <img src={base.logo_url} alt={base.platform} className="h-full w-full object-contain" /> : <MonitorPlay className="h-10 w-10 text-muted-foreground" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{selected?.title || base.title}</h2>
            <Badge variant="secondary" className="mt-1 gap-1"><Zap className="h-3 w-3" />Livraison instantanée</Badge>
          </div>
        </div>

        {(selected?.description || base.description) && <p className="text-sm text-muted-foreground whitespace-pre-line">{selected?.description || base.description}</p>}

        <div className="space-y-2">
          <Label>Durée</Label>
          <div className="flex flex-wrap gap-2">
            {durations.map(d => (
              <Button key={d} type="button" variant={d === duration ? 'default' : 'outline'} size="sm" onClick={() => setDuration(d)}>{durationLabel(d)}</Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Type de profil</Label>
          <div className="flex flex-wrap gap-2">
            {types.map(t => (
              <Button key={t} type="button" variant={t === profileType ? 'default' : 'outline'} size="sm" onClick={() => setProfileType(t)}>
                {t === 'partagé' ? 'Profil partagé' : 'Compte complet'}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa">Numéro WhatsApp</Label>
          <Input id="wa" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+237 6XX XX XX XX" maxLength={20} />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Prix</span><span className="font-bold text-foreground">{selected ? formatFcfa(selected.price_fcfa) : '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4" />Mon solde</span><span className={insufficient ? 'text-destructive font-semibold' : 'text-foreground font-semibold'}>{user ? formatFcfa(balance) : '—'}</span></div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1"><ShieldCheck className="h-3 w-3" />Produit numérique : pas d'expédition, ni douane, ni IMEI.</p>
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-2xl mx-auto">
          {user && insufficient ? (
            <Button className="w-full" size="lg" onClick={() => navigate(`/recharge?return=${encodeURIComponent(`/digital/${selected!.id}`)}`)}>
              Recharger ({formatFcfa(Number(selected!.price_fcfa) - balance)} manquants)
            </Button>
          ) : (
            <Button className="w-full" size="lg" disabled={busy || !selected} onClick={pay}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
              {user ? 'Payer avec mon portefeuille' : 'Se connecter pour acheter'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalProduct;
