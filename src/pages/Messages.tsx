import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChatPanel } from '@/components/ChatPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConvRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  last_message_at: string;
  other_name?: string;
  last_preview?: string;
}

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeId = params.get('c');

  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
    const channel = supabase
      .channel('conv-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (!convs) { setLoading(false); return; }

    // enrich with other party name
    const otherIds = Array.from(new Set(convs.map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id))));
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', otherIds);
    const nameMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));

    // last message preview
    const enriched: ConvRow[] = await Promise.all(
      convs.map(async (c) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
        return { ...c, other_name: nameMap.get(otherId) || 'Utilisateur', last_preview: lastMsg?.content || '' };
      })
    );
    setConversations(enriched);
    setLoading(false);
  };

  const active = conversations.find((c) => c.id === activeId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border p-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => (activeId ? setParams({}) : navigate(-1))}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold">{active ? active.other_name : 'Messages'}</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation list */}
        <div className={`${activeId ? 'hidden md:block' : 'block'} w-full md:w-80 border-r border-border overflow-y-auto`}>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Aucune conversation pour le moment
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setParams({ c: c.id })}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition ${
                  activeId === c.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex justify-between items-baseline">
                  <div className="font-medium truncate">{c.other_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: fr })}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.last_preview || 'Nouvelle conversation'}</div>
              </button>
            ))
          )}
        </div>

        {/* Chat area */}
        <div className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {active ? (
            <ChatPanel conversationId={active.id} otherUserName={active.other_name} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Sélectionnez une conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
