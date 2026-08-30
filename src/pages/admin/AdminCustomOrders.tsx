import { useEffect, useState, useCallback } from 'react';
import { Loader2, ClipboardList, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type Row = {
  id: string;
  user_id: string;
  product_name: string;
  product_link: string | null;
  details: string | null;
  budget_max: number | null;
  whatsapp_number: string | null;
  images: string[] | null;
  status: string;
  admin_response: string | null;
  quote_amount: number | null;
  quote_delay_days: number | null;
  created_at: string;
};

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-amber-500/15 text-amber-600' },
  quoted: { label: 'Devis envoyé', className: 'bg-primary/15 text-primary' },
  accepted: { label: 'Acceptée', className: 'bg-emerald-500/15 text-emerald-600' },
  rejected: { label: 'Refusée', className: 'bg-destructive/15 text-destructive' },
  completed: { label: 'Terminée', className: 'bg-emerald-500/15 text-emerald-600' },
};

const FILTERS = ['pending', 'quoted', 'accepted', 'rejected', 'completed'] as const;

const AdminCustomOrders = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [drafts, setDrafts] = useState<Record<string, { amount: string; delay: string; response: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('custom_orders')
      .select('*')
      .order('created_at', { ascending: false });
    setRows((data as Row[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-custom-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_orders' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const draftOf = (r: Row) => drafts[r.id] || {
    amount: r.quote_amount ? String(r.quote_amount) : '',
    delay: r.quote_delay_days ? String(r.quote_delay_days) : '',
    response: r.admin_response || '',
  };

  const setDraft = (id: string, patch: Partial<{ amount: string; delay: string; response: string }>, base: Row) => {
    setDrafts(prev => ({ ...prev, [id]: { ...draftOf(base), ...prev[id], ...patch } }));
  };

  const sendQuote = async (r: Row) => {
    const d = draftOf(r);
    const amount = Number(d.amount);
    if (!amount || amount <= 0) {
      toast({ title: 'Montant requis', description: 'Saisissez un montant de devis valide.', variant: 'destructive' });
      return;
    }
    setSaving(r.id);
    const { error } = await supabase.from('custom_orders').update({
      quote_amount: amount,
      quote_delay_days: d.delay ? Number(d.delay) : null,
      admin_response: d.response || null,
      quoted_at: new Date().toISOString(),
      status: 'quoted',
    }).eq('id', r.id);
    setSaving(null);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Devis envoyé', description: 'Le client a été notifié.' });
    load();
  };

  const setStatus = async (r: Row, status: string) => {
    setSaving(r.id);
    const { error } = await supabase.from('custom_orders').update({ status }).eq('id', r.id);
    setSaving(null);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const filtered = rows.filter(r => r.status === filter);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-jinbao-red" />
        <h1 className="text-2xl font-bold text-foreground">Commandes sur mesure</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {STATUS[f].label} ({rows.filter(r => r.status === f).length})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucune demande dans cette catégorie.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => {
            const d = draftOf(r);
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{r.product_name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('fr-FR')}
                      {r.budget_max ? ` · Budget max ${Number(r.budget_max).toLocaleString()} FCFA` : ''}
                    </p>
                  </div>
                  <Badge variant="secondary" className={STATUS[r.status]?.className}>{STATUS[r.status]?.label || r.status}</Badge>
                </div>

                {r.details && <p className="text-sm text-foreground whitespace-pre-wrap">{r.details}</p>}

                <div className="flex flex-wrap gap-3 text-xs">
                  {r.product_link && (
                    <a href={r.product_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                      Lien produit <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {r.whatsapp_number && (
                    <a href={`https://wa.me/${r.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      WhatsApp : {r.whatsapp_number}
                    </a>
                  )}
                </div>

                {r.images && r.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {r.images.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                        <img src={src} alt={`Référence ${i + 1}`} loading="lazy" className="w-16 h-16 object-cover rounded-lg border border-border" />
                      </a>
                    ))}
                  </div>
                )}

                {(r.status === 'pending' || r.status === 'quoted') && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Montant du devis (FCFA)" value={d.amount} onChange={(e) => setDraft(r.id, { amount: e.target.value }, r)} />
                      <Input type="number" placeholder="Délai (jours)" value={d.delay} onChange={(e) => setDraft(r.id, { delay: e.target.value }, r)} />
                    </div>
                    <Textarea rows={2} placeholder="Message au client (optionnel)" value={d.response} onChange={(e) => setDraft(r.id, { response: e.target.value }, r)} />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={saving === r.id} onClick={() => sendQuote(r)}>
                        {saving === r.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {r.status === 'quoted' ? 'Mettre à jour le devis' : 'Envoyer le devis'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={saving === r.id} onClick={() => setStatus(r, 'rejected')}>Refuser</Button>
                    </div>
                  </div>
                )}

                {r.status === 'accepted' && (
                  <Button size="sm" variant="outline" disabled={saving === r.id} onClick={() => setStatus(r, 'completed')}>
                    Marquer comme terminée
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminCustomOrders;
