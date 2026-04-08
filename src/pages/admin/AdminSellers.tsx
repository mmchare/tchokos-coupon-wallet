import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Eye, Phone, FileText, Store, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminSellers = () => {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => { loadSellers(); }, []);

  const loadSellers = async () => {
    const { data } = await supabase
      .from('seller_profiles')
      .select('*, profiles:user_id(full_name, phone)')
      .order('created_at', { ascending: false });
    setSellers(data || []);
    setLoading(false);
  };

  const handleApprove = async (seller: any) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({ 
          verification_status: 'verified',
          verified_at: new Date().toISOString()
        })
        .eq('id', seller.id);
      if (error) throw error;
      toast({ title: 'Vendeur approuvé ✓', description: `${seller.shop_name} peut maintenant publier des produits` });
      setSelectedSeller(null);
      loadSellers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (seller: any) => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Motif requis', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({ 
          verification_status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', seller.id);
      if (error) throw error;
      toast({ title: 'Candidature rejetée' });
      setSelectedSeller(null);
      setRejectionReason('');
      loadSellers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const filtered = sellers.filter(s => {
    if (activeTab === 'pending') return s.verification_status === 'pending';
    if (activeTab === 'verified') return s.verification_status === 'verified';
    return s.verification_status === 'rejected';
  });

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6" /> Vendeurs
        </h1>
        <Badge>{sellers.length} total</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            En attente ({sellers.filter(s => s.verification_status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="verified" className="flex-1">
            Vérifiés ({sellers.filter(s => s.verification_status === 'verified').length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1">
            Refusés ({sellers.filter(s => s.verification_status === 'rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3 mt-3">
          {filtered.map(seller => (
            <Card key={seller.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-bold">{seller.shop_name || 'Sans nom'}</p>
                    <p className="text-sm text-muted-foreground">{(seller.profiles as any)?.full_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" /> {seller.chinese_phone}
                      {seller.chinese_phone_verified && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(seller.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedSeller(seller)}>
                    <Eye className="w-4 h-4 mr-1" /> Examiner
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">Aucun vendeur dans cette catégorie</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedSeller} onOpenChange={() => setSelectedSeller(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Examen de candidature</DialogTitle>
          </DialogHeader>
          {selectedSeller && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Boutique</span>
                  <span className="font-medium">{selectedSeller.shop_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Utilisateur</span>
                  <span>{(selectedSeller.profiles as any)?.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Téléphone chinois</span>
                  <span className="flex items-center gap-1">
                    {selectedSeller.chinese_phone}
                    {selectedSeller.chinese_phone_verified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </span>
                </div>
                {selectedSeller.shop_description && (
                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="text-sm mt-1">{selectedSeller.shop_description}</p>
                  </div>
                )}
              </div>

              {selectedSeller.residence_document_url && (
                <div>
                  <span className="text-sm text-muted-foreground">Document de résidence</span>
                  <a href={selectedSeller.residence_document_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-3 mt-1 bg-muted rounded-lg hover:bg-muted/80 transition">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm">Voir le document</span>
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </a>
                </div>
              )}

              {selectedSeller.verification_status === 'pending' && (
                <>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => handleApprove(selectedSeller)} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                      Approuver
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Motif du refus..."
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      rows={2}
                    />
                    <Button variant="destructive" className="w-full" onClick={() => handleReject(selectedSeller)} disabled={processing}>
                      <XCircle className="w-4 h-4 mr-1" /> Refuser
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSellers;
