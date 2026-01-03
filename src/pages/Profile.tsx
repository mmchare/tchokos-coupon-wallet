import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Phone, MapPin, Edit2, CreditCard, LogOut, Gift, Copy, Check, Lock, Package, ChevronRight, Heart, Link, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminPasswordModal from '@/components/AdminPasswordModal';
import AddressManager from '@/components/AddressManager';

const Profile = () => {
  const { t } = useTranslation();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
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
        address: (profile as any).delivery_address || ''
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

      // Fetch orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setOrderCount(ordersCount || 0);

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
        phone: formData.phone,
        delivery_address: formData.address
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('profile.updateError'),
        variant: "destructive"
      });
      return;
    }

    setIsEditing(false);
    await refreshProfile();
    toast({
      title: t('profile.profileUpdated'),
      description: t('profile.infoSaved'),
    });
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: t('auth.logout'),
      description: t('profile.seeYouSoon'),
    });
    navigate('/auth');
  };

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({
        title: t('profile.codeCopied'),
        description: t('profile.shareWithFriends'),
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getReferralLink = () => {
    if (!referralCode) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth?ref=${referralCode}`;
  };

  const copyReferralLink = () => {
    const link = getReferralLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast({
        title: t('profile.linkCopied'),
        description: t('profile.shareWithFriends'),
      });
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const shareReferralLink = async () => {
    const link = getReferralLink();
    if (link && navigator.share) {
      try {
        await navigator.share({
          title: t('profile.shareTitle'),
          text: t('profile.shareText'),
          url: link,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-jinbao-red border-t-transparent"></div>
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
              <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Code de parrainage */}
          <Card className="bg-gradient-to-r from-jinbao-red/10 to-jinbao-blue/10 border-jinbao-red/30">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <Gift className="h-5 w-5 mr-2 text-jinbao-red" />
                {t('profile.myReferralCode')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-jinbao-red tracking-widest">
                    {referralCode || t('common.loading')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {referralCount} {t('profile.referralCount')}
                  </p>
                </div>
                <Button
                  onClick={copyReferralCode}
                  variant="outline"
                  className="border-jinbao-red text-jinbao-red hover:bg-jinbao-red hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
              </div>

              {/* Referral Link */}
              <div className="bg-background/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-foreground flex items-center">
                  <Link className="h-4 w-4 mr-2 text-jinbao-blue" />
                  {t('profile.referralLink')}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={getReferralLink()}
                    readOnly
                    className="bg-input border-border text-foreground text-sm flex-1"
                  />
                  <Button
                    onClick={copyReferralLink}
                    variant="outline"
                    size="icon"
                    className="border-jinbao-blue text-jinbao-blue hover:bg-jinbao-blue hover:text-white shrink-0"
                  >
                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={shareReferralLink}
                    variant="default"
                    size="icon"
                    className="bg-jinbao-red hover:bg-jinbao-red/90 text-white shrink-0"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {t('profile.referralBonus')} <span className="text-jinbao-red font-semibold">{t('profile.referralBonusAmount')}</span> {t('profile.referralBonusDesc')} <span className="text-jinbao-blue font-semibold">{t('profile.friendBonusAmount')}</span> {t('profile.friendBonusDesc')}
              </p>
            </CardContent>
          </Card>

          {/* Informations personnelles */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">{t('profile.personalInfo')}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="text-jinbao-red hover:bg-jinbao-red/10"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? t('common.save') : t('common.edit')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  {t('auth.fullName')}
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
                  {t('auth.phone')}
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
                  {t('profile.deliveryAddress')}
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  disabled={!isEditing}
                  placeholder={t('profile.enterAddress')}
                  className="bg-input border-border text-foreground"
                />
              </div>
            </CardContent>
          </Card>

          {/* Adresses de livraison */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-jinbao-blue" />
                {t('profile.myAddresses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddressManager />
            </CardContent>
          </Card>

          {/* Lien vers favoris */}
          <Card 
            className="bg-card border-border cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/favorites')}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-vibrant-red" />
                  <span className="font-medium text-foreground">{t('profile.myFavorites')}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-jinbao-red to-red-600 border-0 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">{t('profile.walletBalance')}</p>
                    <p className="text-2xl font-bold">{profile.wallet_balance.toLocaleString()} F</p>
                  </div>
                  <CreditCard className="h-8 w-8 opacity-80" />
                </div>
                <Button
                  onClick={() => navigate('/recharge')}
                  variant="secondary"
                  className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  {t('profile.recharge')}
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="bg-card border-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/orders')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">{t('profile.ordersCount')}</p>
                    <p className="text-2xl font-bold text-foreground">{orderCount}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-8 w-8 text-jinbao-blue" />
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">{t('profile.referralsCount')}</p>
                    <p className="text-2xl font-bold text-foreground">{referralCount}</p>
                  </div>
                  <Gift className="h-8 w-8 text-jinbao-red" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">{t('profile.memberSince')}</p>
                    <p className="text-xl font-bold text-foreground capitalize">{memberSince}</p>
                  </div>
                  <User className="h-8 w-8 text-jinbao-blue" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Access - Only visible for admins */}
          {isAdmin && (
            <div className="pt-8 border-t border-border">
              <button
                onClick={() => setShowAdminModal(true)}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <Lock className="h-4 w-4" />
                <span>{t('profile.adminAccess')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Admin Password Modal */}
        <AdminPasswordModal
          open={showAdminModal}
          onOpenChange={setShowAdminModal}
          onSuccess={() => navigate('/admin')}
        />
      </main>
    </div>
  );
};

export default Profile;