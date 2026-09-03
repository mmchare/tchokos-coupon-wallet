import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChatPanel } from '@/components/ChatPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, RotateCcw, ClipboardList, MessageCircle, Search, X, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SupportConv {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  custom_order_id: string | null;
  last_message_at: string;
  is_resolved: boolean;
  buyer_name?: string;
  buyer_phone?: string | null;
  custom_order_name?: string | null;
  last_preview?: string;
  unread_count?: number;
}

type Filter = 'open' | 'resolved' | 'all';

const AdminSupport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [convs, setConvs] = useState<SupportConv[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('open');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [msgMatchIds, setMsgMatchIds] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    const { data } = await (supabase as any)
      .from('conversations')
      .select('*')
      .is('product_id', null)
      .order('last_message_at', { ascending: false })
      .limit(100);

    const rows = (data as SupportConv[]) || [];
    if (!rows.length) {
      setConvs([]);
      setLoading(false);
      return;
    }

    const buyerIds = Array.from(new Set(rows.map((c) => c.buyer_id)));
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone').in('id', buyerIds);
    const nameMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
    const phoneMap = new Map((profiles || []).map((p) => [p.id, p.phone]));

    const orderIds = rows.map((c) => c.custom_order_id).filter(Boolean) as string[];
    let orderMap = new Map<string, string>();
    if (orderIds.length) {
      const { data: orders } = await supabase.from('custom_orders').select('id, product_name').in('id', orderIds);
      orderMap = new Map((orders || []).map((o) => [o.id, o.product_name]));
    }

    const enriched = await Promise.all(
      rows.map(async (c) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, image_url')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .eq('is_read', false)
          .eq('sender_id', c.buyer_id);
        return {
          ...c,
          buyer_name: nameMap.get(c.buyer_id) || 'Utilisateur',
          custom_order_name: c.custom_order_id ? orderMap.get(c.custom_order_id) || 'Demande sur mesure' : null,
          last_preview: lastMsg?.content || (lastMsg?.image_url ? '📷 Photo' : ''),
          unread_count: count || 0,
        };
      })
    );
    setConvs(enriched);
    setLoading(false);
  };

  const toggleResolved = async (conv: SupportConv) => {
    const { error } = await (supabase as any).rpc('set_conversation_resolved', {
      p_conversation_id: conv.id,
      p_resolved: !conv.is_resolved,
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: !conv.is_resolved ? 'Conversation résolue ✅' : 'Conversation rouverte' });
    load();
  };

  const filtered = convs.filter((c) =>
    filter === 'all' ? true : filter === 'open' ? !c.is_resolved : c.is_resolved
  );
  const active = convs.find((c) => c.id === activeId);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support client</h1>
        <p className="text-sm text-muted-foreground">
          Toutes les conversations avec les clients, y compris les demandes sur mesure.
        </p>
      </div>

      <div className="flex gap-2">
        {(['open', 'resolved', 'all'] as Filter[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'open' ? 'À traiter' : f === 'resolved' ? 'Résolues' : 'Toutes'}
          </Button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4 h-[70vh]">
        <div className="border border-border rounded-xl overflow-y-auto bg-card">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Aucune conversation
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition ${
                  activeId === c.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex justify-between items-baseline gap-2">
                  <span className={`truncate ${c.unread_count ? 'font-bold' : 'font-medium'}`}>{c.buyer_name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                {c.custom_order_name && (
                  <Badge variant="secondary" className="mt-1 text-[10px] gap-1">
                    <ClipboardList className="w-3 h-3" />
                    {c.custom_order_name}
                  </Badge>
                )}
                <div className="flex justify-between items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground truncate">
                    {c.last_preview || 'Nouvelle conversation'}
                  </span>
                  {c.is_resolved ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    !!c.unread_count && (
                      <span className="shrink-0 bg-jinbao-red text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                        {c.unread_count}
                      </span>
                    )
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border border-border rounded-xl overflow-hidden flex flex-col bg-card">
          {active ? (
            <>
              <div className="flex items-center justify-between gap-2 p-3 border-b border-border">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{active.buyer_name}</div>
                  {active.custom_order_name && (
                    <div className="text-xs text-muted-foreground truncate">
                      Demande : {active.custom_order_name}
                    </div>
                  )}
                </div>
                <Button size="sm" variant={active.is_resolved ? 'outline' : 'default'} onClick={() => toggleResolved(active)}>
                  {active.is_resolved ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-1" /> Rouvrir
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Marquer résolu
                    </>
                  )}
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <ChatPanel conversationId={active.id} otherUserName={active.buyer_name} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Sélectionnez une conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
