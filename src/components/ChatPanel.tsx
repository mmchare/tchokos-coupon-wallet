import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Languages, Paperclip, X, Check, CheckCheck, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_translated: string | null;
  original_language: string | null;
  image_url: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;

  is_read: boolean;
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
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_id !== user?.id) {
            translateIfNeeded(newMsg);
            // Mark immediately as read since chat is open
            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then();
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
    setMessages((data as Message[]) || []);
    setLoading(false);

    // Mark unread incoming messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .neq('sender_id', user?.id || '');
  };

  const translateIfNeeded = async (msg: Message) => {
    if (msg.content_translated || !msg.content) return;
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Fichier trop lourd', description: 'Maximum 10 Mo', variant: 'destructive' });
      return;
    }
    const isImage = file.type.startsWith('image/');
    setPendingImage({ file, preview: isImage ? URL.createObjectURL(file) : '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `chat/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('product-media').upload(path, file, { contentType: file.type });
    if (error) {
      console.error(error);
      toast({ title: 'Erreur upload', description: error.message, variant: 'destructive' });
      return null;
    }
    return supabase.storage.from('product-media').getPublicUrl(path).data.publicUrl;
  };

  const send = async () => {
    if ((!input.trim() && !pendingImage) || !user) return;
    setSending(true);
    const text = input.trim();
    const imageToSend = pendingImage;
    setInput('');
    setPendingImage(null);

    let uploadedUrl: string | null = null;
    const isImage = !!imageToSend?.file.type.startsWith('image/');
    if (imageToSend) {
      setUploading(true);
      uploadedUrl = await uploadImage(imageToSend.file);
      setUploading(false);
      if (!uploadedUrl) {
        setSending(false);
        setInput(text);
        setPendingImage(imageToSend);
        return;
      }
    }

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: text,
        image_url: isImage ? uploadedUrl : null,
        ...(imageToSend && !isImage
          ? { file_url: uploadedUrl, file_name: imageToSend.file.name, file_type: imageToSend.file.type }
          : {}),
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setInput(text);
    } else if (inserted && text) {
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
                    {m.image_url && (
                      <a href={m.image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={m.image_url}
                          alt="pièce jointe"
                          className="rounded-lg mb-1 max-h-60 object-cover"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {m.file_url && (
                      <a
                        href={m.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-background/20 px-2 py-1.5 mb-1 underline-offset-2 hover:underline"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate max-w-[180px]">{m.file_name || 'Fichier joint'}</span>
                      </a>
                    )}

                    {display && <div className="whitespace-pre-wrap break-words">{display}</div>}
                    <div className="flex items-center justify-end gap-2 mt-1">
                      {m.content_translated && (
                        <button
                          onClick={() => setShowTranslated((s) => ({ ...s, [m.id]: !s[m.id] }))}
                          className="flex items-center gap-1 text-[10px] opacity-70 hover:opacity-100"
                        >
                          <Languages className="w-3 h-3" />
                          {isTranslated ? 'Original' : 'Traduction'}
                        </button>
                      )}
                      {mine && (
                        <span className="opacity-70" title={m.is_read ? 'Lu' : 'Envoyé'}>
                          {m.is_read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {pendingImage && (
        <div className="border-t border-border p-2 flex items-center gap-2 bg-muted/30">
          <div className="relative">
            {pendingImage.preview ? (
              <img src={pendingImage.preview} alt="aperçu" className="h-16 w-16 object-cover rounded-md" />
            ) : (
              <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground truncate">
            {pendingImage.preview ? 'Photo prête à envoyer' : pendingImage.file.name}
          </span>
        </div>
      )}

      <div className="border-t border-border p-3 flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || uploading}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Écrivez en français ou en chinois..."
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || (!input.trim() && !pendingImage)} size="icon">
          {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
