import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Phone, MapPin, Edit2, CreditCard, LogOut, Gift, Copy, Check, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: ''
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load user data
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: ''
      });
    }
  }, [profile]);

  // Fetch referral code and admin status
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      // Fetch referral code
      const { data } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setReferralCode(data.code);
      }

      // Fetch referral count
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);
      
      setReferralCount(count || 0);

      // Check admin status using the secure database function
      const { data: adminCheck } = await supabase.rpc('is_admin');
      setIsAdmin(adminCheck === true);
    };

    fetchUserData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        phone: formData.phone
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil",
        variant: "destructive"
      });
      return;
    }

    setIsEditing(false);
    await refreshProfile();
    toast({
      title: "Profil mis à jour !",
      description: "Vos informations ont été enregistrées",
    });
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Déconnexion",
      description: "À bientôt sur DINA !",
    });
    navigate('/auth');
  };

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({
        title: "Code copié !",
        description: "Partagez-le avec vos amis",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pinbaoo-yellow border-t-transparent"></div>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Code de parrainage */}
          <Card className="bg-gradient-to-r from-pinbaoo-yellow/20 to-pinbaoo-green/20 border-pinbaoo-yellow/50">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <Gift className="h-5 w-5 mr-2 text-pinbaoo-yellow" />
                Mon Code de Parrainage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-pinbaoo-yellow tracking-widest">
                    {referralCode || 'Chargement...'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {referralCount} personne(s) ont utilisé votre code
                  </p>
                </div>
                <Button
                  onClick={copyReferralCode}
                  variant="outline"
                  className="border-pinbaoo-yellow text-pinbaoo-yellow hover:bg-pinbaoo-yellow hover:text-pinbaoo-dark"
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copié !' : 'Copier'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Partage ton code DINA et gagne <span className="text-pinbaoo-yellow font-semibold">5 000 FCAF</span> pour chaque ami qui valide sa première commande. Ton ami, lui, reçoit <span className="text-pinbaoo-green font-semibold">2 000 FCAF</span> de bienvenue pour l'essayer !
              </p>
            </CardContent>
          </Card>

          {/* Informations personnelles */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Informations personnelles</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="text-pinbaoo-yellow hover:bg-pinbaoo-yellow/10"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? 'Enregistrer' : 'Modifier'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  Nom complet
                </label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  Téléphone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={!isEditing}
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  Adresse de livraison
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  disabled={!isEditing}
                  placeholder="Entrez votre adresse"
                  className="bg-input border-border text-foreground"
                />
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-pinbaoo-green to-emerald-500 border-0 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Solde du portefeuille</p>
                    <p className="text-2xl font-bold">{profile.wallet_balance.toLocaleString()} F</p>
                  </div>
                  <CreditCard className="h-8 w-8 opacity-80" />
                </div>
                <Button
                  onClick={() => navigate('/recharge')}
                  variant="secondary"
                  className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  Recharger
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Filleuls</p>
                    <p className="text-2xl font-bold text-foreground">{referralCount}</p>
                  </div>
                  <Gift className="h-8 w-8 text-pinbaoo-yellow" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Membre depuis</p>
                    <p className="text-xl font-bold text-foreground capitalize">{memberSince}</p>
                  </div>
                  <User className="h-8 w-8 text-pinbaoo-yellow" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Access - Only visible for admins */}
          {isAdmin && (
            <div className="pt-8 border-t border-border">
              <button
                onClick={() => window.open('https://dashboard.dina.cm/login', '_blank')}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <Lock className="h-4 w-4" />
                <span>Accès Admin</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;