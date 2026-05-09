import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tag, Plus, Trash2, Loader2, Calendar, Users, Percent } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_user: number;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

interface Props {
  sellerProfileId: string;
}

export const SellerPromoCodesPanel = ({ sellerProfileId }: Props) => {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    min_order_amount: '0',
    max_uses: '',
    max_uses_per_user: '1',
    expires_at: '',
    description: '',
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('seller_id', sellerProfileId)
      .order('created_at', { ascending: false });
    if (error) toast.error('Erreur chargement codes');
    else setCodes((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [sellerProfileId]);

  const handleCreate = async () => {
    const code = form.code.trim().toUpperCase();
    const value = parseFloat(form.discount_value);
    if (!code || code.length < 3) return toast.error('Code trop court');
    if (!value || value <= 0) return toast.error('Valeur invalide');
    if (form.discount_type === 'percent' && value > 100) return toast.error('Pourcentage max 100');

    setCreating(true);
    const { error } = await supabase.from('promo_codes').insert({
      seller_id: sellerProfileId,
      code,
      discount_type: form.discount_type,
      discount_value: value,
      min_order_amount: parseFloat(form.min_order_amount) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      max_uses_per_user: parseInt(form.max_uses_per_user) || 1,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      description: form.description.trim() || null,
      is_active: true,
    });
    setCreating(false);

    if (error) {
      toast.error(error.message.includes('unique') ? 'Ce code existe déjà' : error.message);
      return;
    }
    toast.success('Code promo créé !');
    setShowCreate(false);
    setForm({ code: '', discount_type: 'percent', discount_value: '', min_order_amount: '0', max_uses: '', max_uses_per_user: '1', expires_at: '', description: '' });
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id);
    if (error) toast.error('Erreur');
    else { toast.success(!current ? 'Code activé' : 'Code désactivé'); load(); }
  };

  const deleteCode = async (id: string) => {
    if (!confirm('Supprimer ce code promo ?')) return;
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (error) toast.error('Erreur');
    else { toast.success('Code supprimé'); load(); }
  };

  const isExpired = (c: PromoCode) => c.expires_at && new Date(c.expires_at) < new Date();
  const isExhausted = (c: PromoCode) => c.max_uses !== null && c.current_uses >= c.max_uses;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" /> Mes codes promo
          </h3>
          <p className="text-xs text-muted-foreground">Boostez vos ventes avec des codes promotionnels</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" /> Créer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau code promo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="EX: PROMO10"
                  maxLength={32}
                  className="uppercase font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Type *</Label>
                  <Select value={form.discount_type} onValueChange={(v: any) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">% Pourcentage</SelectItem>
                      <SelectItem value="fixed">F FCFA fixe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valeur *</Label>
                  <Input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    placeholder={form.discount_type === 'percent' ? '10' : '5000'}
                  />
                </div>
              </div>
              <div>
                <Label>Montant min. de commande (FCFA)</Label>
                <Input
                  type="number"
                  value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Max utilisations totales</Label>
                  <Input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    placeholder="Illimité"
                  />
                </div>
                <div>
                  <Label>Par utilisateur</Label>
                  <Input
                    type="number"
                    value={form.max_uses_per_user}
                    onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Date d'expiration</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Description (optionnel)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Promo de lancement"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer le code'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /></div>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-sm text-muted-foreground">
            Aucun code promo. Créez-en un pour augmenter vos ventes.
          </CardContent>
        </Card>
      ) : (
        codes.map((c) => {
          const expired = isExpired(c);
          const exhausted = isExhausted(c);
          const inactive = !c.is_active || expired || exhausted;
          return (
            <Card key={c.id} className={inactive ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="font-mono font-bold text-primary text-base truncate">{c.code}</code>
                    {expired && <Badge variant="destructive" className="text-[10px]">Expiré</Badge>}
                    {exhausted && <Badge variant="destructive" className="text-[10px]">Épuisé</Badge>}
                    {!c.is_active && <Badge variant="secondary" className="text-[10px]">Désactivé</Badge>}
                  </div>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={() => toggleActive(c.id, c.is_active)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <Percent className="h-3 w-3 text-primary" />
                  {c.discount_type === 'percent'
                    ? `${c.discount_value}% de réduction`
                    : `-${c.discount_value.toLocaleString()} FCFA`}
                  {c.min_order_amount > 0 && (
                    <span className="text-muted-foreground"> · min {c.min_order_amount.toLocaleString()} F</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Utilisé {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ''} fois
                </div>
                {c.expires_at && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Expire le {new Date(c.expires_at).toLocaleDateString('fr-FR')}
                  </div>
                )}
                {c.description && <p className="text-muted-foreground italic">{c.description}</p>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCode(c.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 mt-1"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default SellerPromoCodesPanel;
