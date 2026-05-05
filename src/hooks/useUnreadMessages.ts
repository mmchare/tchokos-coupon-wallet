import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = async () => {
    if (!user) return setUnreadCount(0);
    // Get all conversation ids the user participates in
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    if (!convs || convs.length === 0) return setUnreadCount(0);
    const ids = convs.map((c) => c.id);
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .eq('is_read', false)
      .neq('sender_id', user.id);
    setUnreadCount(count || 0);
  };

  useEffect(() => {
    if (!user) return;
    refresh();
    const channel = supabase
      .channel('unread-msgs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return { unreadCount, refresh };
};
