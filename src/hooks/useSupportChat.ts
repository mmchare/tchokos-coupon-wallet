import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Ouvre (ou crée) une conversation privée avec un responsable JinBao.
 * Optionnellement envoie un premier message de contexte.
 */
export function useSupportChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [opening, setOpening] = useState(false);

  const openSupportChat = useCallback(
    async (firstMessage?: string, customOrderId?: string) => {
      if (!user) {
        sessionStorage.setItem('redirectAfterAuth', window.location.pathname + window.location.search);
        toast({ title: 'Connexion requise', description: 'Connectez-vous pour parler à un responsable' });
        navigate('/auth');
        return;
      }
      setOpening(true);
      try {
        const { data, error } = await (supabase as any).rpc('get_or_create_support_conversation', {
          p_custom_order_id: customOrderId ?? null,
        });
        if (error || !data) throw error || new Error('no conversation');
        const conversationId = data as string;


        if (firstMessage?.trim()) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId);
          if (!count) {
            await supabase.from('messages').insert({
              conversation_id: conversationId,
              sender_id: user.id,
              content: firstMessage.trim(),
            });
          }
        }

        navigate(`/messages?c=${conversationId}`);
      } catch (e) {
        console.error(e);
        toast({
          title: 'Chat indisponible',
          description: "Impossible de joindre un responsable pour le moment.",
          variant: 'destructive',
        });
      } finally {
        setOpening(false);
      }
    },
    [user, navigate, toast]
  );

  return { openSupportChat, opening };
}
