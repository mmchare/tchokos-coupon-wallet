import { useState } from 'react';
import { Share2, Copy, Check, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderShareButtonProps {
  orderId: string;
}

const OrderShareButton = ({ orderId }: OrderShareButtonProps) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  const createShareLink = async () => {
    setLoading(true);
    try {
      // Check if share already exists
      const { data: existing } = await supabase
        .from('order_tracking_shares')
        .select('*')
        .eq('order_id', orderId)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (existing) {
        const url = `${window.location.origin}/track/${existing.share_token}`;
        setShareUrl(url);
        setShareId(existing.id);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('order_tracking_shares')
        .insert({ order_id: orderId })
        .select()
        .single();

      if (error) throw error;

      const url = `${window.location.origin}/track/${data.share_token}`;
      setShareUrl(url);
      setShareId(data.id);
    } catch (err) {
      console.error('Error creating share link:', err);
      toast.error('Erreur lors de la création du lien');
    }
    setLoading(false);
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const shareViaWhatsApp = () => {
    if (!shareUrl) return;
    const message = encodeURIComponent(`Suivez ma commande JinBao en temps réel : ${shareUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const deleteShareLink = async () => {
    if (!shareId) return;
    await supabase.from('order_tracking_shares').delete().eq('id', shareId);
    setShareUrl(null);
    setShareId(null);
    toast.success('Lien de partage supprimé');
  };

  if (!shareUrl) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={createShareLink}
        disabled={loading}
        className="text-xs text-muted-foreground"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
        ) : (
          <Share2 className="h-3.5 w-3.5 mr-1" />
        )}
        Partager le suivi
      </Button>
    );
  }

  return (
    <div className="bg-muted/50 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <Share2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground truncate flex-1">{shareUrl}</p>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" onClick={copyLink} className="h-7 text-xs flex-1">
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? 'Copié' : 'Copier'}
        </Button>
        <Button size="sm" onClick={shareViaWhatsApp} className="h-7 text-xs flex-1 bg-green-600 hover:bg-green-700 text-white">
          WhatsApp
        </Button>
        <Button size="sm" variant="ghost" onClick={deleteShareLink} className="h-7 w-7 p-0 text-muted-foreground">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default OrderShareButton;
