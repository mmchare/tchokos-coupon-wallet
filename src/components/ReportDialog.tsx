import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Flag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Props {
  targetType: 'product' | 'seller';
  targetId: string;
  variant?: 'icon' | 'button';
}

const REASONS = [
  { value: 'fake', label: 'Produit contrefait' },
  { value: 'scam', label: 'Arnaque / fraude' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'wrong_info', label: 'Informations trompeuses' },
  { value: 'other', label: 'Autre' },
];

export const ReportDialog = ({ targetType, targetId, variant = 'icon' }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!reason) return;
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Signalement envoyé', description: 'Notre équipe va examiner votre signalement.' });
    setOpen(false);
    setReason('');
    setDetails('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="ghost" size="icon" title="Signaler">
            <Flag className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <Flag className="w-4 h-4" /> Signaler
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler {targetType === 'product' ? 'ce produit' : 'ce vendeur'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <RadioGroupItem value={r.value} id={r.value} />
                <Label htmlFor={r.value} className="cursor-pointer">{r.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            placeholder="Détails (optionnel)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <Button onClick={submit} disabled={!reason || submitting} className="w-full">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Envoyer le signalement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
