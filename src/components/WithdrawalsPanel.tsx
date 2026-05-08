import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Wallet, Loader2, ArrowDownToLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatBalance } from '@/lib/formatBalance';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  sellerId: string;
  availableBalance: number;
  onSuccess: () => void;
}

interface Withdrawal {
  id: string;
  amount: number;
  phone_number: string;
  payment_method: string;
  status: string;
  created_at: string;
  failure_reason: string | null;
}

export const WithdrawalsPanel = ({ sellerId, availableBalance, onSuccess }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<'momo' | 'orange'>('momo');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Withdrawal[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('seller_withdrawals')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(10);
    setHistory(data || []);
  };

  useEffect(() => {
    if (sellerId) loadHistory();
  }, [sellerId]);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1000) {
      toast({ title: 'Montant minimum: 1000 FCFA', variant: 'destructive' });
      return;
    }
    if (amt > availableBalance) {
      toast({ title: 'Solde insuffisant', variant: 'destructive' });
      return;
    }
    if (!phone || phone.length < 8) {
      toast({ title: 'Numéro invalide', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('seller-withdrawal', {
      body: { amount: amt, phone_number: phone, payment_method: method },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Erreur', description: (data as any)?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Retrait demandé', description: 'Votre demande sera traitée sous 24h.' });
    setOpen(false);
    setAmount('');
    setPhone('');
    onSuccess();
    loadHistory();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'En attente', cls: 'border-yellow-500 text-yellow-500' },
      processing: { label: 'En cours', cls: 'border-blue-500 text-blue-500' },
      completed: { label: 'Complété', cls: 'border-green-500 text-green-500' },
      failed: { label: 'Échoué', cls: 'border-destructive text-destructive' },
    };
    const v = map[s] || { label: s, cls: '' };
    return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
  };

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2" disabled={availableBalance < 1000}>
            <ArrowDownToLine className="w-4 h-4" />
            Retirer vers MoMo / Orange
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Demande de retrait
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg text-sm">
              Solde disponible : <span className="font-bold text-primary">{formatBalance(availableBalance)}</span>
            </div>

            <div>
              <Label>Méthode</Label>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="momo" id="momo" />
                  <Label htmlFor="momo">MTN MoMo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="orange" id="orange" />
                  <Label htmlFor="orange">Orange Money</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Numéro de téléphone</Label>
              <Input placeholder="6XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div>
              <Label>Montant (FCFA)</Label>
              <Input type="number" placeholder="1000" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Minimum 1000 FCFA</p>
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer le retrait
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {history.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold mt-4">Historique des retraits</h4>
          {history.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{formatBalance(w.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.payment_method === 'momo' ? 'MTN MoMo' : 'Orange Money'} • {w.phone_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(w.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {statusBadge(w.status)}
                </div>
                {w.failure_reason && (
                  <p className="text-xs text-destructive mt-1">{w.failure_reason}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
