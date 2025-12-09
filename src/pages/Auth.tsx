import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, ArrowRight, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type AuthStep = 'phone' | 'otp' | 'profile';

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signUp, signIn, loading } = useAuth();
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [affiliationCode, setAffiliationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Generate email from phone number (for internal auth)
  const phoneToEmail = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `${cleanPhone}@jinbao.app`;
  };

  // Simulate OTP generation
  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    return otp;
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
    
    // Simulate sending OTP via SMS
    const otp = generateOTP();
    
    // In production, this would call an SMS API
    // For demo, we show the OTP in a toast
    setTimeout(() => {
      toast({
        title: "Code envoyé par SMS ! 📱",
        description: `Votre code de vérification est : ${otp}`,
      });
      setStep('otp');
      setIsLoading(false);
    }, 1500);
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

    if (otpCode !== generatedOtp) {
      toast({
        title: "Code incorrect",
        description: "Le code de vérification est incorrect",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const email = phoneToEmail(phoneNumber);
    const tempPassword = `jinbao_${phoneNumber}_secure`;

    // Try to sign in first (existing user)
    const { error: signInError } = await signIn(email, tempPassword);

    if (signInError) {
      // User doesn't exist, proceed to profile completion
      setIsNewUser(true);
      setStep('profile');
      setIsLoading(false);
    } else {
      // Existing user, redirect to home
      toast({
        title: "Connexion réussie !",
        description: "Bienvenue sur JinBao",
      });
      navigate('/');
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
    const email = phoneToEmail(phoneNumber);
    const tempPassword = `jinbao_${phoneNumber}_secure`;

    const { error } = await signUp(
      email,
      tempPassword,
      fullName,
      phoneNumber,
      affiliationCode || undefined
    );

    if (error) {
      let message = "Une erreur s'est produite";
      if (error.message.includes('already registered')) {
        message = "Ce numéro est déjà utilisé.";
      }
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Bienvenue sur JinBao ! 🎉",
      description: "Votre compte a été créé avec succès",
    });
    navigate('/');
  };

  const handleTelegramFallback = () => {
    toast({
      title: "Telegram",
      description: "Fonctionnalité Telegram disponible prochainement",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pinbaoo-yellow border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="pinbaoo-logo text-5xl mb-2">JinBao</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Votre partenaire e-commerce de confiance
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

              {/* Telegram Fallback */}
              <button
                onClick={handleTelegramFallback}
                className="w-full text-center text-sm text-muted-foreground hover:text-pinbaoo-yellow transition-colors"
              >
                <MessageCircle className="inline h-4 w-4 mr-1" />
                Pas de SMS reçu ? Essayez Telegram
              </button>
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
                Entrez le code à 6 chiffres envoyé au {phoneNumber}
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
                  onClick={() => setStep('phone')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Modifier le numéro
                </button>
                <button
                  onClick={handleSendOTP}
                  className="text-pinbaoo-yellow hover:underline"
                >
                  Renvoyer le code
                </button>
              </div>

              {/* Telegram Fallback */}
              <button
                onClick={handleTelegramFallback}
                className="w-full text-center text-sm text-muted-foreground hover:text-pinbaoo-yellow transition-colors"
              >
                <MessageCircle className="inline h-4 w-4 mr-1" />
                Pas de SMS reçu ? Essayez Telegram
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step: Profile Completion (New Users Only) */}
        {step === 'profile' && isNewUser && (
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
                  Entrez le code d'un ami pour rejoindre son réseau
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
            <span className="text-pinbaoo-yellow hover:underline cursor-pointer">Conditions d'utilisation</span>
            {' '} et {' '}
            <span className="text-pinbaoo-yellow hover:underline cursor-pointer">Politique de confidentialité</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
