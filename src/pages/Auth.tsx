import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';

type AuthStep = 'phone' | 'otp' | 'profile';

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [affiliationCode, setAffiliationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Format phone to E.164 format
  const formatPhoneE164 = (phone: string) => {
    let formatted = phone.replace(/\s/g, '');
    if (!formatted.startsWith('+')) {
      if (formatted.startsWith('237')) {
        formatted = '+' + formatted;
      } else {
        formatted = '+237' + formatted;
      }
    }
    return formatted;
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un numéro de téléphone valide",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const formattedPhone = formatPhoneE164(phoneNumber);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Code envoyé ! 📱",
        description: "Vérifiez vos SMS pour le code de vérification",
      });
      
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'envoyer le code SMS",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer le code à 6 chiffres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneE164(phoneNumber);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: 'sms',
      });

      if (error) {
        throw error;
      }

      // Check if user has a profile (new user needs to complete profile)
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user.id)
          .single();

        if (!profile?.full_name) {
          // New user - needs to complete profile
          setStep('profile');
        } else {
          // Existing user - redirect to home
          toast({
            title: "Connexion réussie !",
            description: "Bienvenue sur JinBao Smart Market",
          });
          navigate('/');
        }
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      toast({
        title: "Code incorrect",
        description: err.message || "Le code de vérification est incorrect",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!fullName || fullName.length < 2) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer votre nom ou pseudo",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      const formattedPhone = formatPhoneE164(phoneNumber);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: formattedPhone,
        })
        .eq('id', currentUser.id);

      if (profileError) {
        throw profileError;
      }

      // Handle referral code if provided
      if (affiliationCode) {
        const { data: referralData } = await supabase
          .from('referral_codes')
          .select('user_id')
          .eq('code', affiliationCode.toUpperCase())
          .single();

        if (referralData) {
          await supabase.from('referrals').insert({
            referrer_id: referralData.user_id,
            referred_id: currentUser.id,
          });

          // Add welcome bonus
          await supabase
            .from('profiles')
            .update({ wallet_balance: 1000 })
            .eq('id', currentUser.id);
        }
      }

      toast({
        title: "Bienvenue sur JinBao ! 🎉",
        description: affiliationCode ? "Votre compte a été créé avec succès. Bonus de bienvenue : 1 000 FCAF !" : "Votre compte a été créé avec succès.",
      });
      navigate('/');
    } catch (err: any) {
      console.error('Complete profile error:', err);
      toast({
        title: "Erreur",
        description: err.message || "Une erreur s'est produite",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtpCode('');
    await handleSendOTP();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-jinbao-red border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="jinbao-logo text-5xl mb-2">JinBao</h1>
          <p className="text-muted-foreground text-sm mb-1 uppercase tracking-widest font-medium">
            Smart Market
          </p>
          <p className="text-muted-foreground text-xs">
            Premium Tech • Confiance • Efficacité
          </p>
        </div>

        {/* Step: Phone Number */}
        {step === 'phone' && (
          <Card className="bg-card border-border animate-slide-up">
            <CardHeader>
              <CardTitle className="text-foreground text-center">
                Connexion par SMS
              </CardTitle>
              <p className="text-muted-foreground text-center text-sm">
                Entrez votre numéro, nous vous enverrons un code par SMS
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSendOTP}
                disabled={isLoading}
                className="buy-button w-full"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Recevoir le code SMS
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: OTP Verification */}
        {step === 'otp' && (
          <Card className="bg-card border-border animate-slide-up">
            <CardHeader>
              <CardTitle className="text-foreground text-center">
                Vérification
              </CardTitle>
              <p className="text-muted-foreground text-center text-sm">
                Entrez le code à 6 chiffres envoyé au {formatPhoneE164(phoneNumber)}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => setOtpCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                onClick={handleVerifyOTP}
                disabled={isLoading || otpCode.length !== 6}
                className="buy-button w-full"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Vérification...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Vérifier le code
                  </>
                )}
              </Button>

              <div className="flex justify-between text-sm">
                <button
                  onClick={() => {
                    setStep('phone');
                    setOtpCode('');
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Modifier le numéro
                </button>
                <button
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isLoading}
                  className={`transition-colors ${
                    resendCooldown > 0 
                      ? 'text-muted-foreground cursor-not-allowed' 
                      : 'text-jinbao-red hover:underline'
                  }`}
                >
                  {resendCooldown > 0 
                    ? `Renvoyer dans ${resendCooldown}s` 
                    : 'Renvoyer le code'}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Profile Completion (New Users Only) */}
        {step === 'profile' && (
          <Card className="bg-card border-border animate-slide-up">
            <CardHeader>
              <CardTitle className="text-foreground text-center">
                Finalisation du profil
              </CardTitle>
              <p className="text-muted-foreground text-center text-sm">
                Dernière étape avant de commencer !
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Full Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nom / Pseudo <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Comment devons-nous vous appeler ?"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-input border-border text-foreground placeholder-muted-foreground"
                />
              </div>

              {/* Affiliation Code Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Code de parrainage <span className="text-muted-foreground">(optionnel)</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ex: JINBAO2024"
                  value={affiliationCode}
                  onChange={(e) => setAffiliationCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="bg-input border-border text-foreground placeholder-muted-foreground uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Entrez le code d'un ami pour recevoir <span className="text-jinbao-blue font-semibold">1 000 FCAF</span> de bonus !
                </p>
              </div>

              <Button 
                onClick={handleCompleteProfile}
                disabled={isLoading}
                className="buy-button w-full"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Commencer l'aventure
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-muted-foreground text-sm">
          <p>En continuant, vous acceptez nos</p>
          <p>
            <span className="text-jinbao-red hover:underline cursor-pointer">Conditions d'utilisation</span>
            {' '} et {' '}
            <span className="text-jinbao-red hover:underline cursor-pointer">Politique de confidentialité</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
