import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Users, MessageSquare, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  wallet_balance: number;
}

interface Campaign {
  id: string;
  title: string;
  message: string;
  segment: string;
  recipients_count: number;
  created_at: string;
}

const AdminCampaigns = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    segment: 'all'
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, wallet_balance');

      if (profilesData) {
        setProfiles(profilesData);
      }

      // Fetch past campaigns from admin_logs
      const { data: logsData } = await supabase
        .from('admin_logs')
        .select('*')
        .eq('action', 'SEND_CAMPAIGN')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsData) {
        const campaignsList = logsData.map(log => ({
          id: log.id,
          title: (log.details as any)?.title || 'Sans titre',
          message: (log.details as any)?.message || '',
          segment: (log.details as any)?.segment || 'all',
          recipients_count: (log.details as any)?.recipients_count || 0,
          created_at: log.created_at
        }));
        setCampaigns(campaignsList);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const getFilteredRecipients = () => {
    switch (formData.segment) {
      case 'balance_5k':
        return profiles.filter(p => Number(p.wallet_balance) >= 5000);
      case 'balance_10k':
        return profiles.filter(p => Number(p.wallet_balance) >= 10000);
      case 'balance_0':
        return profiles.filter(p => Number(p.wallet_balance) === 0);
      default:
        return profiles;
    }
  };

  const handleSendCampaign = async () => {
    if (!formData.title || !formData.message) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le titre et le message",
        variant: "destructive"
      });
      return;
    }

    const recipients = getFilteredRecipients();

    if (recipients.length === 0) {
      toast({
        title: "Attention",
        description: "Aucun destinataire pour ce segment",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`Envoyer cette notification à ${recipients.length} utilisateur(s) ?`)) {
      return;
    }

    setIsSending(true);

    try {
      // Create notifications for each recipient
      const notifications = recipients.map(recipient => ({
        user_id: recipient.id,
        message_type: 'CAMPAGNE',
        message_body: `${formData.title}: ${formData.message}`,
        is_read: false
      }));

      // Insert all notifications
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        throw notifError;
      }

      // Log the campaign action
      await supabase.rpc('log_admin_action', {
        p_action: 'SEND_CAMPAIGN',
        p_target_type: 'campaign',
        p_target_id: null,
        p_details: {
          title: formData.title,
          message: formData.message,
          segment: formData.segment,
          recipients_count: recipients.length,
          recipient_ids: recipients.map(r => r.id)
        }
      });

      toast({
        title: "Campagne envoyée !",
        description: `${recipients.length} utilisateur(s) ont été notifiés`,
      });

      // Reset form
      setFormData({ title: '', message: '', segment: 'all' });

      // Refresh campaigns list
      const newCampaign: Campaign = {
        id: Date.now().toString(),
        title: formData.title,
        message: formData.message,
        segment: formData.segment,
        recipients_count: recipients.length,
        created_at: new Date().toISOString()
      };
      setCampaigns([newCampaign, ...campaigns]);

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la campagne",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const segmentLabels: Record<string, string> = {
    'all': 'Tous les utilisateurs',
    'balance_5k': 'Solde ≥ 5 000 F',
    'balance_10k': 'Solde ≥ 10 000 F',
    'balance_0': 'Solde = 0 F'
  };

  const recipientsPreview = getFilteredRecipients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Campagnes Push/SMS</h1>
        <p className="text-muted-foreground">Envoyez des notifications à vos utilisateurs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-10 w-10 text-jinbao-blue" />
              <div>
                <p className="text-2xl font-bold">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Bell className="h-10 w-10 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{recipientsPreview.length}</p>
                <p className="text-sm text-muted-foreground">Destinataires sélectionnés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <MessageSquare className="h-10 w-10 text-primary" />
              <div>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-sm text-muted-foreground">Campagnes envoyées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compose Campaign */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Nouvelle campagne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Titre de la notification</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Nouvelle promo sur JinBao !"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Ex: Profitez de -20% sur tous les smartphones ce week-end !"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.message.length}/160 caractères (SMS)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Segment de destinataires</label>
            <Select
              value={formData.segment}
              onValueChange={(value) => setFormData({ ...formData, segment: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les utilisateurs ({profiles.length})</SelectItem>
                <SelectItem value="balance_5k">
                  Solde ≥ 5 000 F ({profiles.filter(p => Number(p.wallet_balance) >= 5000).length})
                </SelectItem>
                <SelectItem value="balance_10k">
                  Solde ≥ 10 000 F ({profiles.filter(p => Number(p.wallet_balance) >= 10000).length})
                </SelectItem>
                <SelectItem value="balance_0">
                  Solde = 0 F ({profiles.filter(p => Number(p.wallet_balance) === 0).length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSendCampaign}
            disabled={isSending || !formData.title || !formData.message}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Envoi en cours...' : `Envoyer à ${recipientsPreview.length} utilisateur(s)`}
          </Button>
        </CardContent>
      </Card>

      {/* Past Campaigns */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Historique des campagnes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Destinataires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucune campagne envoyée
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">{campaign.title}</TableCell>
                    <TableCell>{segmentLabels[campaign.segment] || campaign.segment}</TableCell>
                    <TableCell>{campaign.recipients_count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCampaigns;
