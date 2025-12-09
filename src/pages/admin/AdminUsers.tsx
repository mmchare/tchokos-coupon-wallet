import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Search, Wallet, Users, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  wallet_balance: number;
  created_at: string;
}

interface ReferralCode {
  code: string;
  user_id: string;
}

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [referralCodes, setReferralCodes] = useState<Record<string, string>>({});
  const [referralCounts, setReferralCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesData) {
        setProfiles(profilesData);
      }

      // Fetch referral codes
      const { data: codesData } = await supabase
        .from('referral_codes')
        .select('code, user_id');

      if (codesData) {
        const codesMap: Record<string, string> = {};
        codesData.forEach(c => {
          codesMap[c.user_id] = c.code;
        });
        setReferralCodes(codesMap);
      }

      // Fetch referral counts
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('referrer_id');

      if (referralsData) {
        const countsMap: Record<string, number> = {};
        referralsData.forEach(r => {
          countsMap[r.referrer_id] = (countsMap[r.referrer_id] || 0) + 1;
        });
        setReferralCounts(countsMap);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const filteredProfiles = profiles.filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  const totalBalance = profiles.reduce((sum, p) => sum + Number(p.wallet_balance), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
        <p className="text-muted-foreground">Gestion des utilisateurs et des soldes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-10 w-10 text-jinbao-blue" />
              <div>
                <p className="text-2xl font-bold">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Wallet className="h-10 w-10 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalBalance.toLocaleString()} F</p>
                <p className="text-sm text-muted-foreground">Total des soldes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Gift className="h-10 w-10 text-jinbao-red" />
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(referralCounts).reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total parrainages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou téléphone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Solde</TableHead>
                <TableHead>Code parrainage</TableHead>
                <TableHead>Filleuls</TableHead>
                <TableHead>Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.full_name}</TableCell>
                    <TableCell>{profile.phone}</TableCell>
                    <TableCell>
                      <span className={Number(profile.wallet_balance) > 0 ? 'text-green-500' : ''}>
                        {Number(profile.wallet_balance).toLocaleString()} F
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {referralCodes[profile.id] || '-'}
                      </code>
                    </TableCell>
                    <TableCell>{referralCounts[profile.id] || 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(profile.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
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

export default AdminUsers;
