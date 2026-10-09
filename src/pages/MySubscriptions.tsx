import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Eye, EyeOff, RefreshCw, LifeBuoy, MonitorPlay, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db, daysLeft, formatFcfa } from '@/lib/digital';
import { decodeSlot, buildWhatsAppMessage, whatsAppLink } from '@/lib/slots';

interface Order {
  id: string; product_id: string; slot_label: string | null; price_fcfa: number; status: string;
  starts_at: string; expires_at: string; whatsapp_number?: string | null;
  digital_products: { platform: string; title: string; logo_url: string | null } | null;
}

const statusLabel: Record<string, string> = { actif: 'Actif', 'expiré': 'Expiré', 'remboursé': 'Remboursé', en_panne: 'En panne' };

const SubscriptionCard = ({ o, onTicket }: { o: Order; onTicket: (o: Order) => void }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [creds, setCreds] = useState<{ login: string; password: string; slot_code: string | null } | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (o.status !== 'actif') return;
    db.rpc('get_digital_credentials', { p_order_id: o.id }).then(({ data }: any) => setCreds(data?.[0] || null));
  }, [o.id, o.status]);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast({ title: 'Copié' }); };
  const left = daysLeft(o.expires_at);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {o.digital_products?.logo_url ? <img src={o.digital_products.logo_url} alt="" className="h-full w-full object-contain" /> : <MonitorPlay className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{o.digital_products?.platform} · {o.digital_products?.title}</p>
          <p className="text-xs text-muted-foreground">{o.slot_label} · {formatFcfa(o.price_fcfa)}</p>
        </div>
        <Badge variant={o.status === 'actif' ? 'default' : 'secondary'}>{statusLabel[o.status] || o.status}</Badge>
      </div>

      {creds && (
        <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Identifiant</span>
            <span className="font-mono text-foreground truncate">{creds.login}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(creds.login)}><Copy className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Mot de passe</span>
            <span className="font-mono text-foreground truncate">{show ? creds.password : '••••••••'}</span>
            <div className="flex">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(creds.password)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          {(() => { const s = decodeSlot(creds.slot_code, o.slot_label || ''); return (<>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Votre profil</span>
              <span className="font-semibold text-foreground truncate">{s.name}</span>
              <span className="w-7" />
            </div>
            {s.code && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Code du profil</span>
                <span className="font-mono text-foreground truncate">{s.code}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(s.code)}><Copy className="h-4 w-4" /></Button>
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full" onClick={() => window.open(whatsAppLink(o.whatsapp_number, buildWhatsAppMessage({ service: `${o.digital_products?.platform} ${o.digital_products?.title}`, email: creds.login, password: creds.password, slotName: s.name, slotCode: s.code, expiresAt: o.expires_at })), '_blank')}>Recevoir sur WhatsApp</Button>
          </>); })()}
        </div>
      )}
      {o.status === 'en_panne' && <p className="text-xs text-destructive">Ce compte rencontre un problème. Notre équipe va vous rembourser ou vous attribuer un nouveau compte.</p>}

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Expire le {new Date(o.expires_at).toLocaleDateString('fr-FR')}</span>
        {o.status === 'actif' && <span className={left <= 3 ? 'text-destructive font-semibold' : 'text-foreground font-semibold'}>{left} jour{left > 1 ? 's' : ''} restant{left > 1 ? 's' : ''}</span>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(`/digital/${o.product_id}`)}><RefreshCw className="h-4 w-4 mr-1" />Renouveler</Button>
        <Button variant="outline" size="sm" onClick={() => onTicket(o)}><LifeBuoy className="h-4 w-4 mr-1" />Problème d'accès</Button>
      </div>
    </div>
  );
};

const MySubscriptions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(true);
  const [ticketFor, setTicketFor] = useState<Order | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading]);
  useEffect(() => {
    if (!user) return;
    db.from('digital_orders').select('*, digital_products(platform,title,logo_url)').order('created_at', { ascending: false })
      .then(({ data }: any) => { setOrders(data || []); setBusy(false); });
  }, [user]);

  const sendTicket = async () => {
    if (!ticketFor || !msg.trim() || !user) return;
    const { error } = await db.from('support_tickets').insert({ order_id: ticketFor.id, user_id: user.id, message: msg.trim().slice(0, 2000) });
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Ticket envoyé', description: 'Notre équipe vous répond rapidement.' });
    setTicketFor(null); setMsg('');
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="font-bold text-foreground">Mes abonnements</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 space-y-3">
        {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-10" /> :
          orders.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <MonitorPlay className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Aucun abonnement pour l'instant. Cherchez « Netflix » dans la barre de recherche.</p>
              <Button onClick={() => navigate('/')}>Découvrir</Button>
            </div>
          ) : orders.map(o => <SubscriptionCard key={o.id} o={o} onTicket={setTicketFor} />)}
      </main>

      <Dialog open={!!ticketFor} onOpenChange={(v) => !v && setTicketFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Problème d'accès</DialogTitle></DialogHeader>
          <Textarea value={msg} onChange={e => setMsg(e.target.value)} maxLength={2000} placeholder="Décrivez le problème (mot de passe refusé, profil occupé…)" rows={4} />
          <DialogFooter><Button onClick={sendTicket} disabled={!msg.trim()}>Envoyer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MySubscriptions;
