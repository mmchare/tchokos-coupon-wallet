import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_translated: string | null;
  original_language: string | null;
  created_at: string;
}

interface ChatPanelProps {
  conversationId: string;
  otherUserName?: string;
}

export const ChatPanel = ({ conversationId, otherUserName }: ChatPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTranslated, setShowTranslated] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    loadMessages();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
          // Auto-translate if not from us
          if ((payload.new as Message).sender_id !== user?.id) {
            translateIfNeeded(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => prev.map((m) => (m.id === (payload.new as Message).id ? (payload.new as Message) : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);

    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user?.id || '');
  };

  const translateIfNeeded = async (msg: Message) => {
    if (msg.content_translated) return;
    try {
      const { data } = await supabase.functions.invoke('translate-message', {
        body: { text: msg.content, targetLang: 'fr' },
      });
      if (data?.translated && data.translated !== msg.content) {
        await supabase
          .from('messages')
          .update({ content_translated: data.translated, original_language: data.sourceLang })
          .eq('id', msg.id);
      }
    } catch (e) {
      console.error('translate failed', e);
    }
  };

  const send = async () => {
    if (!input.trim() || !user) return;
    setSending(true);
    const text = input.trim();
    setInput('');

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, content: text })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setInput(text);
    } else if (inserted) {
      // Translate our message in background (so the recipient sees both)
      try {
        const { data } = await supabase.functions.invoke('translate-message', {
          body: { text },
        });
        if (data?.translated && data.translated !== text) {
          await supabase
            .from('messages')
            .update({ content_translated: data.translated, original_language: data.sourceLang })
            .eq('id', inserted.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border p-3">
        <div className="font-semibold">{otherUserName || 'Conversation'}</div>
        <div className="text-xs text-muted-foreground">Traduction automatique 🇨🇳 ↔ 🇫🇷</div>
      </div>
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Démarrez la conversation 👋
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              const isTranslated = showTranslated[m.id];
              const display = isTranslated && m.content_translated ? m.content_translated : m.content;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{display}</div>
                    {m.content_translated && (
                      <button
                        onClick={() => setShowTranslated((s) => ({ ...s, [m.id]: !s[m.id] }))}
                        className="flex items-center gap-1 text-[10px] opacity-70 hover:opacity-100 mt-1"
                      >
                        <Languages className="w-3 h-3" />
                        {isTranslated ? 'Voir original' : 'Voir traduction'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>
      <div className="border-t border-border p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Écrivez en français ou en chinois..."
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !input.trim()} size="icon">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
