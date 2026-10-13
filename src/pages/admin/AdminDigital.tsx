import { useEffect, useMemo, useState } from 'react';
import { Plus, Upload, AlertTriangle, Trash2, Pencil, Loader2, Eye, RotateCcw, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db, DigitalProduct, daysLeft, durationLabel, formatFcfa } from '@/lib/digital';
import { decodeSlot, encodeSlot, buildWhatsAppMessage, whatsAppLink } from '@/lib/slots';

interface Account { id: string; product_id: string; login: string; slots_total: number; slots_used: number; expires_at: string; status: string; slot_codes?: string[]; }
interface Order { id: string; user_id: string; product_id: string; account_id: string | null; slot_label: string | null; price_fcfa: number; status: string; expires_at: string; created_at: string; whatsapp_number: string | null; }
interface Ticket { id: string; order_id: string; user_id: string; message: string; status: string; created_at: string; }

const emptyProduct = {
  platform: '',
  title: '',
  description: '',
  logo_url: '',
  keywords: '',
  duration_months: 1,
  profile_type: 'partagé',
  price_fcfa: 0,
  is_active: true,
  create_account: false,
  account_login: '',
  account_password: '',
  account_slots_total: 1,
  account_expires_at: '',
  account_slots: Array.from({ length: 1 }, (_, i) => ({ name: `Profil ${i + 1}`, code: '' })),
};
const ACC_STATUSES = ['disponible', 'complet', 'expiré', 'en_panne'];

const AdminDigital = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [accForm, setAccForm] = useState<any | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvProduct, setCsvProduct] = useState('');
  const [csvText, setCsvText] = useState('');
  const [busy, setBusy] = useState(false);
  const [filterProduct, setFilterProduct] = useState('all');

  const load = async () => {
    const [p, a, o, t] = await Promise.all([
      db.from('digital_products').select('*').order('platform'),
      db.from('digital_accounts').select('id,product_id,login,slots_total,slots_used,expires_at,status,slot_codes').order('expires_at'),
      db.from('digital_orders').select('*').order('created_at', { ascending: false }).limit(300),
      db.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setProducts(p.data || []); setAccounts(a.data || []); setOrders(o.data || []); setTickets(t.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pName = (id: string) => { const p = products.find(x => x.id === id); return p ? `${p.platform} · ${p.title}` : '—'; };

  const expiringSoon = accounts.filter(a => a.status !== 'expiré' && a.status !== 'en_panne' && daysLeft(a.expires_at) < 5);
  const outOfStock = useMemo(() => products.filter(p => p.is_active && !accounts.some(a => a.product_id === p.id && a.status === 'disponible' && a.slots_used < a.slots_total && daysLeft(a.expires_at) > 0)), [accounts, products]);

  const saveProduct = async () => {
    const e = editing;
    if (!e.platform.trim() || !e.title.trim()) { toast({ title: 'Plateforme et titre requis', variant: 'destructive' }); return; }

    if (e.create_account) {
      const accountLogin = String(e.account_login || '').trim();
      const accountPassword = String(e.account_password || '').trim();
      const accountExpires = String(e.account_expires_at || '').trim();
      const accountSlots = ((e.account_slots || []) as Array<{ name?: string; code?: string }>).map((s, i) => ({
        name: String(s?.name || `Profil ${i + 1}`).trim(),
        code: String(s?.code || '').trim(),
      }));

      if (!accountLogin || !accountPassword || !accountExpires) {
        toast({ title: 'Compte associé incomplet', description: 'Email, mot de passe et expiration sont obligatoires.', variant: 'destructive' });
        return;
      }

      if (accountSlots.some(s => s.code && !/^\d{4,5}$/.test(s.code))) {
        toast({ title: 'Codes invalide', description: 'Chaque code de place doit contenir 4 ou 5 chiffres.', variant: 'destructive' });
        return;
      }
    }

    const row = {
      platform: e.platform.trim(), title: e.title.trim(), description: e.description || null, logo_url: e.logo_url || null,
      keywords: String(e.keywords || '').split(',').map((k: string) => k.trim()).filter(Boolean),
      duration_months: Number(e.duration_months) || 1, profile_type: e.profile_type, price_fcfa: Number(e.price_fcfa) || 0, is_active: e.is_active,
    };

    let productId = e.id;

    if (e.id) {
      const { error } = await db.from('digital_products').update(row).eq('id', e.id);
      if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    } else {
      const { data, error } = await db.from('digital_products').insert(row).select('id').single();
      if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
      productId = data?.id;
    }

    if (e.create_account && productId) {
      try {
        const accountSlots = ((e.account_slots || []) as Array<{ name?: string; code?: string }>).map((s, i) => ({
          name: String(s?.name || `Profil ${i + 1}`).trim(),
          code: String(s?.code || '').trim(),
        }));

        const slotCodes = accountSlots.map((s, i) => encodeSlot(s.name || `Profil ${i + 1}`, s.code));
        const { error: rpcError } = await db.rpc('admin_add_digital_account', {
          p_product_id: productId,
          p_login: String(e.account_login || '').trim(),
          p_password: String(e.account_password || '').trim(),
          p_slots_total: Number(e.account_slots_total) || 1,
          p_expires_at: new Date(String(e.account_expires_at || new Date().toISOString())).toISOString(),
          p_slot_codes: slotCodes.length ? slotCodes : null,
        });

        if (rpcError) throw rpcError;
        toast({ title: 'Compte créé', description: 'Le compte associé au produit a été ajouté.' });
      } catch (err: any) {
        console.error('Erreur création compte associé', err);
        toast({ title: 'Erreur compte', description: err?.message || 'Impossible de créer le compte associé', variant: 'destructive' });
      }
    }

    setEditing(null);
    load();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit ? (impossible s\'il a des commandes — désactivez-le plutôt)')) return;
    const { error } = await db.from('digital_products').delete().eq('id', id);
    if (error) toast({ title: 'Suppression impossible', description: 'Désactivez le produit à la place.', variant: 'destructive' });
    load();
  };

  const sendWhatsApp = async (o: Order) => {
    const { data, error } = await db.rpc('get_digital_credentials', { p_order_id: o.id });
    const c = data?.[0];
    if (error || !c) { toast({ title: 'Identifiants introuvables', description: error?.message, variant: 'destructive' }); return; }
    const s = decodeSlot(c.slot_code, o.slot_label || '');
    window.open(whatsAppLink(o.whatsapp_number, buildWhatsAppMessage({ service: pName(o.product_id), email: c.login, password: c.password, slotName: s.name, slotCode: s.code, expiresAt: o.expires_at })), '_blank');
  };

  const saveAccount = async () => {
    const f = accForm;
    const slots = (f.slots || []) as { name: string; code: string }[];
    if (slots.some(s => s.code && !/^\d{4,5}$/.test(s.code))) { toast({ title: 'Les codes doivent avoir 4 ou 5 chiffres', variant: 'destructive' }); return; }
    setBusy(true);
    const codes = slots.map((s, i) => encodeSlot(s.name || `Profil ${i + 1}`, s.code));
    const { error } = await db.rpc('admin_add_digital_account', { p_product_id: f.product_id, p_login: f.login, p_password: f.password, p_slots_total: Number(f.slots_total), p_expires_at: new Date(f.expires_at).toISOString(), p_slot_codes: codes.length ? codes : null });
    setBusy(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    setAccForm(null); load();
  };

  const importCsv = async () => {
    if (!csvProduct) { toast({ title: 'Choisissez un produit', variant: 'destructive' }); return; }
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).filter(l => !/^login[,;]/i.test(l));
    setBusy(true);
    let ok = 0; const errs: string[] = [];
    for (const [i, l] of lines.entries()) {
      const [login, password, slots, expires, codes] = l.split(/[;,]/).map(s => s?.trim());
      const d = new Date(expires);
      if (!login || !password || isNaN(d.getTime())) { errs.push(`Ligne ${i + 1}`); continue; }
      const slotCodes = codes ? codes.split('|').map(s => s.trim()).filter(Boolean).map((c, k) => { const [n, v] = c.includes(':') ? c.split(':') : [`Profil ${k + 1}`, c]; return encodeSlot(n, v); }) : null;
      const { error } = await db.rpc('admin_add_digital_account', { p_product_id: csvProduct, p_login: login, p_password: password, p_slots_total: Number(slots) || 1, p_expires_at: d.toISOString(), p_slot_codes: slotCodes });
      error ? errs.push(`Ligne ${i + 1}`) : ok++;
    }
    setBusy(false);
    toast({ title: `${ok} compte(s) importé(s)`, description: errs.length ? `Erreurs : ${errs.join(', ')}` : undefined, variant: errs.length ? 'destructive' : 'default' });
    setCsvOpen(false); setCsvText(''); load();
  };

  const setAccStatus = async (id: string, status: string) => {
    const { error } = await db.from('digital_accounts').update({ status }).eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else if (status === 'en_panne') toast({ title: 'Compte en panne', description: 'Les clients concernés sont listés dans Commandes : remboursez ou réaffectez.' });
    load();
  };

  const showPassword = async (id: string) => {
    const { data } = await db.rpc('admin_get_account_password', { p_account_id: id });
    if (data) { navigator.clipboard.writeText(data); toast({ title: 'Mot de passe copié', description: data }); }
  };

  const refund = async (id: string) => {
    if (!confirm('Rembourser ce client (au prorata du temps restant) sur son portefeuille ?')) return;
    const { data, error } = await db.rpc('admin_refund_digital_order', { p_order_id: id });
    toast(error || !data?.success ? { title: 'Erreur', description: data?.error || error?.message, variant: 'destructive' } : { title: `Remboursé : ${formatFcfa(data.amount)}` });
    load();
  };
  const reassign = async (id: string) => {
    const { data, error } = await db.rpc('admin_reassign_digital_order', { p_order_id: id });
    toast(error || !data?.success ? { title: 'Erreur', description: data?.error || error?.message, variant: 'destructive' } : { title: 'Client réaffecté à un nouveau compte' });
    load();
  };
  const setTicketStatus = async (id: string, status: string) => { await db.from('support_tickets').update({ status }).eq('id', id); load(); };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-10" />;

  const shownAccounts = filterProduct === 'all' ? accounts : accounts.filter(a => a.product_id === filterProduct);
  const brokenOrders = orders.filter(o => o.status === 'en_panne');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Produits numériques</h1>
        <p className="text-sm text-muted-foreground">Abonnements premium livrés instantanément</p>
      </div>

      {(expiringSoon.length > 0 || outOfStock.length > 0 || brokenOrders.length > 0) && (
        <div className="space-y-2">
          {expiringSoon.length > 0 && <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-foreground"><AlertTriangle className="h-4 w-4" /><span>Compte(s) expiring soon.</span></div>}
          {outOfStock.length > 0 && <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-foreground"><AlertTriangle className="h-4 w-4" /><span>Produit(s) sans compte disponible.</span></div>}
          {brokenOrders.length > 0 && <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-foreground"><AlertTriangle className="h-4 w-4" /><span>Commande(s) en panne.</span></div>}
        </div>
      )}

      <Tabs defaultValue="products">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="products">Produits ({products.length})</TabsTrigger>
          <TabsTrigger value="accounts">Comptes ({accounts.length})</TabsTrigger>
          <TabsTrigger value="orders">Commandes ({orders.length})</TabsTrigger>
          <TabsTrigger value="tickets">Tickets ({tickets.filter(t => t.status !== 'résolu').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-3">
          <Button onClick={() => setEditing({ ...emptyProduct })}><Plus className="h-4 w-4 mr-1" />Nouveau produit</Button>
          <div className="grid gap-2">
            {products.map(p => {
              const free = accounts.filter(a => a.product_id === p.id && a.status === 'disponible').reduce((s, a) => s + (a.slots_total - a.slots_used), 0);
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  {p.logo_url ? <img src={p.logo_url} alt="" className="h-10 w-10 rounded object-contain bg-muted" /> : <div className="h-10 w-10 rounded bg-muted" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.platform} · {p.title}</p>
                    <p className="text-xs text-muted-foreground">{durationLabel(p.duration_months)} · {p.profile_type} · {formatFcfa(p.price_fcfa)} · {free} place(s) libre(s)</p>
                  </div>
                  {!p.is_active && <Badge variant="secondary">Inactif</Badge>}
                  <Button size="icon" variant="ghost" onClick={() => setEditing({ ...p, keywords: p.keywords.join(', '), create_account: false, account_login: '', account_password: '', account_slots_total: 1, account_expires_at: '', account_slots: Array.from({ length: 1 }, (_, i) => ({ name: `Profil ${i + 1}`, code: '' })) })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteProduct(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button disabled={!products.length} onClick={() => setAccForm({ product_id: products[0]?.id, login: '', password: '', slots_total: 5, expires_at: '', slots: Array.from({ length: 5 }, (_, i) => ({ name: `Profil ${i + 1}`, code: '' })) })}><Plus className="h-4 w-4 mr-1" />Ajouter un compte</Button>
            <Button variant="outline" disabled={!products.length} onClick={() => setCsvOpen(true)}><Upload className="h-4 w-4 mr-1" />Import CSV</Button>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tous les produits</SelectItem>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.platform} · {p.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            {shownAccounts.map(a => {
              const d = daysLeft(a.expires_at);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-mono text-sm text-foreground">{a.login}</p>
                    <p className="text-xs text-muted-foreground">{pName(a.product_id)}</p>
                    {a.slot_codes && a.slot_codes.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{a.slot_codes.map((c, i) => { const s = decodeSlot(c, `Profil ${i + 1}`); return `${s.name}: ${s.code || '—'}`; }).join(' • ')}</p>
                    )}
                  </div>
                  <div className="flex gap-1" title={`${a.slots_used}/${a.slots_total} occupés`}>
                    {Array.from({ length: a.slots_total }).map((_, i) => <span key={i} className={`h-3 w-3 rounded-full ${i < a.slots_used ? 'bg-primary' : 'bg-muted'}`} />)}
                  </div>
                  <span className={`text-xs ${d < 5 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>Exp. {new Date(a.expires_at).toLocaleDateString('fr-FR')} ({d} j)</span>
                  <Select value={a.status} onValueChange={(v) => setAccStatus(a.id, v)}>
                    <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{ACC_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => showPassword(a.id)} title="Voir / copier le mot de passe"><Eye className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-2">
          {orders.map(o => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-card text-sm">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-foreground">{pName(o.product_id)} · {o.slot_label}</p>
                <p className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString('fr-FR')} · WhatsApp {o.whatsapp_number || '—'} · exp. {new Date(o.expires_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <span className="font-semibold text-foreground">{formatFcfa(o.price_fcfa)}</span>
              <Badge variant={o.status === 'en_panne' ? 'destructive' : o.status === 'actif' ? 'default' : 'secondary'}>{o.status}</Badge>
              {o.status === 'actif' && <Button size="sm" onClick={() => sendWhatsApp(o)}>Envoyer WhatsApp</Button>}
              {(o.status === 'en_panne' || o.status === 'actif') && (
                <>
                  <Button size="sm" variant="outline" onClick={() => refund(o.id)}><RotateCcw className="h-3 w-3 mr-1" />Rembourser</Button>
                  <Button size="sm" variant="outline" onClick={() => reassign(o.id)}><Shuffle className="h-3 w-3 mr-1" />Réaffecter</Button>
                </>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-2">
          {tickets.length === 0 && <p className="text-sm text-muted-foreground">Aucun ticket.</p>}
          {tickets.map(t => {
            const o = orders.find(x => x.id === t.order_id);
            return (
              <div key={t.id} className="p-3 rounded-lg border border-border bg-card text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString('fr-FR')} · {o ? pName(o.product_id) : `Commande #${t.order_id.slice(0, 8)}`} · WhatsApp {o?.whatsapp_number || '—'}</span>
                  <Select value={t.status} onValueChange={(v) => setTicketStatus(t.id, v)}>
                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{['ouvert', 'en_cours', 'résolu'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <p className="text-foreground whitespace-pre-line">{t.message}</p>
                {o && (o.status === 'actif' || o.status === 'en_panne') && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => reassign(o.id)}><Shuffle className="h-3 w-3 mr-1" />Réaffecter</Button>
                    <Button size="sm" variant="outline" onClick={() => refund(o.id)}><RotateCcw className="h-3 w-3 mr-1" />Rembourser</Button>
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Modifier' : 'Nouveau'} produit numérique</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Plateforme</Label><Input value={editing.platform} onChange={e => setEditing({ ...editing, platform: e.target.value })} placeholder="Netflix" /></div>
                <div><Label>Titre</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Premium 4K" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>URL du logo</Label><Input value={editing.logo_url || ''} onChange={e => setEditing({ ...editing, logo_url: e.target.value })} /></div>
              <div><Label>Mots-clés (séparés par des virgules)</Label><Input value={editing.keywords} onChange={e => setEditing({ ...editing, keywords: e.target.value })} placeholder="netflix,streaming,4k" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Durée (mois)</Label><Input type="number" min={1} value={editing.duration_months} onChange={e => setEditing({ ...editing, duration_months: e.target.value })} /></div>
                <div><Label>Profil</Label>
                  <Select value={editing.profile_type} onValueChange={v => setEditing({ ...editing, profile_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="partagé">partagé</SelectItem><SelectItem value="complet">complet</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Prix FCFA</Label><Input type="number" min={0} value={editing.price_fcfa} onChange={e => setEditing({ ...editing, price_fcfa: e.target.value })} /></div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2">
                  <Switch checked={!!editing.create_account} onCheckedChange={v => setEditing({ ...editing, create_account: v })} />
                  <Label>Créer un compte associé</Label>
                </div>

                {editing.create_account && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Email du compte</Label>
                        <Input type="email" value={editing.account_login || ''} onChange={e => setEditing({ ...editing, account_login: e.target.value })} placeholder="compte@gmail.com" />
                      </div>
                      <div>
                        <Label>Mot de passe du compte</Label>
                        <Input value={editing.account_password || ''} onChange={e => setEditing({ ...editing, account_password: e.target.value })} placeholder="Mot de passe" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Nombre de places</Label>
                        <Input type="number" min={1} max={10} value={editing.account_slots_total || 1} onChange={e => {
                          const n = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                          const slots = Array.from({ length: n }, (_, i) => ({
                            name: (editing.account_slots?.[i]?.name) || `Profil ${i + 1}`,
                            code: editing.account_slots?.[i]?.code || '',
                          }));
                          setEditing({ ...editing, account_slots_total: n, account_slots: slots });
                        }} />
                      </div>
                      <div>
                        <Label>Expiration</Label>
                        <Input type="date" value={editing.account_expires_at || ''} onChange={e => setEditing({ ...editing, account_expires_at: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Places : nom et code</Label>
                      {(editing.account_slots || []).map((s: any, i: number) => (
                        <div key={i} className="grid grid-cols-[1fr_110px] gap-2">
                          <Input value={s.name} placeholder={`Profil ${i + 1}`} onChange={e => {
                            const x = [...(editing.account_slots || [])];
                            x[i] = { ...x[i], name: e.target.value };
                            setEditing({ ...editing, account_slots: x });
                          }} />
                          <Input value={s.code} inputMode="numeric" maxLength={5} placeholder="Code" className="font-mono" onChange={e => {
                            const x = [...(editing.account_slots || [])];
                            x[i] = { ...x[i], code: e.target.value.replace(/\D/g, '').slice(0, 5) };
                            setEditing({ ...editing, account_slots: x });
                          }} />
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">Code de 4 ou 5 chiffres. Chaque client reçoit uniquement le nom et le code de sa place.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Actif</Label></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveProduct}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!accForm} onOpenChange={v => !v && setAccForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un compte</DialogTitle></DialogHeader>
          {accForm && (
            <div className="space-y-3">
              <div><Label>Produit</Label>
                <Select value={accForm.product_id} onValueChange={v => setAccForm({ ...accForm, product_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.platform} · {p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Email du compte</Label><Input type="email" value={accForm.login} onChange={e => setAccForm({ ...accForm, login: e.target.value })} placeholder="compte@gmail.com" /></div>
              <div><Label>Mot de passe du compte</Label><Input value={accForm.password} onChange={e => setAccForm({ ...accForm, password: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Nombre de places</Label><Input type="number" min={1} max={10} value={accForm.slots_total} onChange={e => { const n = Math.max(1, Math.min(10, Number(e.target.value) || 1)); const slots = Array.from({ length: n }, (_, i) => ({ name: accForm.slots?.[i]?.name || `Profil ${i + 1}`, code: accForm.slots?.[i]?.code || '' })); setAccForm({ ...accForm, slots_total: n, slots }); }} /></div>
                <div><Label>Expiration</Label><Input type="date" value={accForm.expires_at} onChange={e => setAccForm({ ...accForm, expires_at: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Places : nom et code PIN</Label>
                {(accForm.slots || []).map((s: any, i: number) => (
                  <div key={i} className="grid grid-cols-[1fr_110px] gap-2">
                    <Input value={s.name} placeholder={`Profil ${i + 1}`} onChange={e => { const x = [...accForm.slots]; x[i] = { ...s, name: e.target.value }; setAccForm({ ...accForm, slots: x }); }} />
                    <Input value={s.code} inputMode="numeric" maxLength={5} placeholder="Code" className="font-mono" onChange={e => { const x = [...accForm.slots]; x[i] = { ...s, code: e.target.value.replace(/\D/g, '').slice(0, 5) }; setAccForm({ ...accForm, slots: x }); }} />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Code de 4 ou 5 chiffres. Chaque client reçoit uniquement le nom et le code de sa place.</p>
              </div>
            </div>
          )}
          <DialogFooter><Button disabled={busy || !accForm?.login || !accForm?.password || !accForm?.expires_at} onClick={saveAccount}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Ajouter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import CSV de comptes</DialogTitle></DialogHeader>
          <Select value={csvProduct} onValueChange={setCsvProduct}>
            <SelectTrigger><SelectValue placeholder="Produit" /></SelectTrigger>
            <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.platform} · {p.title}</SelectItem>)}</SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Une ligne par compte : <code>login,motdepasse,places,AAAA-MM-JJ</code> — optionnel : <code>,Profil 1:1234|Profil 2:5678</code> (nom:code peut être ajouté).</p>
          <Input type="file" accept=".csv,text/csv" onChange={async e => { const f = e.target.files?.[0]; if (f) setCsvText(await f.text()); }} />
          <Textarea rows={6} value={csvText} onChange={e => setCsvText(e.target.value)} placeholder="compte1@mail.com,pass123,5,2026-12-31" />
          <DialogFooter><Button disabled={busy || !csvText.trim()} onClick={importCsv}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Importer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDigital;
