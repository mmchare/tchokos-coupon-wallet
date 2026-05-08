import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Flag, Loader2, Check, X, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Report {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
}

const REASON_LABELS: Record<string, string> = {
  fake: 'Contrefaçon',
  scam: 'Arnaque',
  inappropriate: 'Inapproprié',
  wrong_info: 'Trompeur',
  other: 'Autre',
};

const AdminReports = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    setProcessingId(id);
    const { error } = await supabase
      .from('reports')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    setProcessingId(null);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Mis à jour' });
    load();
  };

  const suspendSeller = async (report: Report) => {
    setProcessingId(report.id);
    let sellerId = report.target_id;
    if (report.target_type === 'product') {
      const { data: p } = await supabase.from('products').select('seller_id').eq('id', report.target_id).maybeSingle();
      sellerId = p?.seller_id || '';
    }
    if (!sellerId) { setProcessingId(null); return; }
    const { error } = await supabase
      .from('seller_profiles')
      .update({ is_suspended: true })
      .eq('id', sellerId);
    if (!error) {
      await supabase.from('reports').update({ status: 'actioned', reviewed_at: new Date().toISOString() }).eq('id', report.id);
      toast({ title: 'Vendeur suspendu' });
      load();
    } else {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
    setProcessingId(null);
  };

  const filtered = reports.filter((r) => tab === 'all' || r.status === tab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flag className="w-6 h-6 text-jinbao-red" /> Signalements
        </h1>
        <p className="text-muted-foreground text-sm">Gérez les signalements des utilisateurs</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">En attente ({reports.filter(r => r.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="reviewed">Examinés</TabsTrigger>
          <TabsTrigger value="actioned">Action prise</TabsTrigger>
          <TabsTrigger value="dismissed">Rejetés</TabsTrigger>
          <TabsTrigger value="all">Tous</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun signalement</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{r.target_type === 'product' ? 'Produit' : 'Vendeur'}</Badge>
                          <Badge>{REASON_LABELS[r.reason] || r.reason}</Badge>
                          <Badge variant="secondary">{r.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{r.target_id}</p>
                        {r.details && <p className="text-sm">{r.details}</p>}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => update(r.id, 'reviewed')} disabled={processingId === r.id}>
                          <Check className="w-4 h-4 mr-1" /> Marquer examiné
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => update(r.id, 'dismissed')} disabled={processingId === r.id}>
                          <X className="w-4 h-4 mr-1" /> Rejeter
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => suspendSeller(r)} disabled={processingId === r.id}>
                          <Ban className="w-4 h-4 mr-1" /> Suspendre vendeur
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReports;
