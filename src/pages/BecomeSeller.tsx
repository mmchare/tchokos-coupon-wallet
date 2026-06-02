import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Store, Phone, FileCheck, ShieldCheck, Upload, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

const BecomeSeller = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  const [formData, setFormData] = useState({
    chinese_phone: '',
    shop_name: '',
    shop_description: '',
    residence_document_url: ''
  });

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      sessionStorage.setItem('redirectAfterAuth', '/become-seller');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchSellerProfile();
  }, [user]);

  const fetchSellerProfile = async () => {
    const { data } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();
    
    if (data) {
      setSellerProfile(data);
      setPhoneVerified(data.chinese_phone_verified);
    }
    setLoadingProfile(false);
  };

  const handleSendOtp = async () => {
    if (!formData.chinese_phone.startsWith('+86')) {
      toast({ title: 'Erreur', description: 'Le numéro doit commencer par +86', variant: 'destructive' });
      return;
    }
    setSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: formData.chinese_phone }
      });
      if (error) throw error;
      setOtpSent(true);
      toast({ title: 'Code envoyé', description: `Un code de vérification a été envoyé au ${formData.chinese_phone}` });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible d\'envoyer le code', variant: 'destructive' });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone: formData.chinese_phone, code: otpCode }
      });
      if (error) throw error;
      if (data?.verified) {
        setPhoneVerified(true);
        toast({ title: 'Vérifié ✓', description: 'Votre numéro chinois a été vérifié avec succès' });
      } else {
        toast({ title: 'Code invalide', description: 'Le code est incorrect ou expiré', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Fichier trop volumineux', description: 'Max 5 Mo', variant: 'destructive' });
      return;
    }
    setUploadingDoc(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `seller-docs/${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-media').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
      setFormData(prev => ({ ...prev, residence_document_url: publicUrl }));
      toast({ title: 'Document uploadé ✓' });
    } catch (err: any) {
      toast({ title: 'Erreur upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async () => {
    if (!phoneVerified) {
      toast({ title: 'Vérification requise', description: 'Veuillez vérifier votre numéro chinois', variant: 'destructive' });
      return;
    }
    if (!formData.residence_document_url) {
      toast({ title: 'Document requis', description: 'Veuillez uploader une preuve de résidence', variant: 'destructive' });
      return;
    }
    if (!formData.shop_name.trim()) {
      toast({ title: 'Nom de boutique requis', variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('seller_profiles').insert({
        user_id: user!.id,
        chinese_phone: formData.chinese_phone,
        chinese_phone_verified: true,
        residence_document_url: formData.residence_document_url,
        shop_name: formData.shop_name,
        shop_description: formData.shop_description,
        verification_status: 'pending'
      });
      if (error) throw error;
      toast({ title: 'Candidature envoyée ! 🎉', description: 'Notre équipe va examiner votre dossier sous 24-48h' });
      fetchSellerProfile();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Already a verified seller
  if (sellerProfile?.verification_status === 'verified') {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-bold">Espace Vendeur</h1>
        </div>
        <div className="p-4 space-y-4">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold">Vous êtes un vendeur vérifié !</h2>
              <p className="text-muted-foreground">Accédez à votre dashboard pour gérer vos produits et ventes.</p>
              <Button onClick={() => navigate('/seller')} className="w-full">
                <Store className="w-4 h-4 mr-2" /> Accéder au Dashboard Vendeur
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Application pending
  if (sellerProfile?.verification_status === 'pending') {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-bold">Candidature Vendeur</h1>
        </div>
        <div className="p-4 space-y-4">
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-6 text-center space-y-3">
              <Clock className="w-16 h-16 text-yellow-500 mx-auto" />
              <h2 className="text-xl font-bold">Candidature en cours d'examen</h2>
              <p className="text-muted-foreground">Notre équipe vérifie vos documents. Vous serez notifié sous 24-48h.</p>
              <Badge variant="outline" className="border-yellow-500 text-yellow-500">En attente de validation</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Application rejected
  if (sellerProfile?.verification_status === 'rejected') {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-bold">Candidature Vendeur</h1>
        </div>
        <div className="p-4 space-y-4">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center space-y-3">
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h2 className="text-xl font-bold">Candidature refusée</h2>
              <p className="text-muted-foreground">{sellerProfile.rejection_reason || 'Votre candidature n\'a pas été retenue. Contactez le support pour plus d\'informations.'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Devenir vendeur — JinBao"
        description="Vendez vos trouvailles chinoises à des acheteurs camerounais sur JinBao : vérification OTP, escrow sécurisé et commissions transparentes."
        path="/become-seller"
      />
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-bold">Devenir Vendeur</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Intro */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-primary" />
              <h2 className="font-bold text-lg">Vendez sur JinBao 🇨🇳</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Résidant en Chine ? Listez vos trouvailles et vendez directement aux acheteurs africains. Commission : 20% par vente.
            </p>
          </CardContent>
        </Card>

        {/* Step 1: Chinese Phone */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              Numéro chinois (+86)
            </CardTitle>
            <CardDescription>Vérification par SMS obligatoire</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="+8613800138000"
                value={formData.chinese_phone}
                onChange={e => setFormData(prev => ({ ...prev, chinese_phone: e.target.value }))}
                disabled={phoneVerified}
              />
              {!phoneVerified && (
                <Button onClick={handleSendOtp} disabled={sendingOtp || !formData.chinese_phone} size="sm">
                  {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
                </Button>
              )}
              {phoneVerified && <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 self-center" />}
            </div>
            {otpSent && !phoneVerified && (
              <div className="flex gap-2">
                <Input
                  placeholder="Code à 6 chiffres"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  maxLength={6}
                />
                <Button onClick={handleVerifyOtp} disabled={verifyingOtp || otpCode.length < 4} size="sm">
                  {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vérifier'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Document */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
              Preuve de résidence
            </CardTitle>
            <CardDescription>Visa, Business License ou carte d'identité chinoise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.residence_document_url ? (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <FileCheck className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-500 font-medium">Document uploadé</span>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                {uploadingDoc ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cliquez pour uploader (max 5 Mo)</span>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleDocUpload} disabled={uploadingDoc} />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Shop Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
              Votre Boutique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Nom de votre boutique"
              value={formData.shop_name}
              onChange={e => setFormData(prev => ({ ...prev, shop_name: e.target.value }))}
            />
            <Textarea
              placeholder="Décrivez votre activité (optionnel)"
              value={formData.shop_description}
              onChange={e => setFormData(prev => ({ ...prev, shop_description: e.target.value }))}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button 
          className="w-full h-12 text-base font-bold"
          onClick={handleSubmit}
          disabled={submitting || !phoneVerified || !formData.residence_document_url || !formData.shop_name.trim()}
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
          Soumettre ma candidature
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          En soumettant, vous acceptez les <span className="text-primary cursor-pointer" onClick={() => navigate('/terms')}>conditions générales</span> de vente JinBao.
        </p>
      </div>
    </div>
  );
};

export default BecomeSeller;
