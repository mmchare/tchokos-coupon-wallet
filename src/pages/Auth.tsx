import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowRight, CheckCircle, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type AuthStep = 'email' | 'profile' | 'magic-link-sent';

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signInWithMagicLink, signUp } = useAuth();
  
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [hasReferralFromUrl, setHasReferralFromUrl] = useState(false);

  // Pre-fill referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setPromoCode(refCode.toUpperCase());
      setHasReferralFromUrl(true);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      // Check if there's a redirect path stored
      const redirectPath = sessionStorage.getItem('redirectAfterAuth');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterAuth');
        navigate(redirectPath);
      } else {
        navigate('/');
      }
    }
  }, [user, loading, navigate]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmitEmail = async () => {
    if (!validateEmail(email)) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Try to sign in with magic link - Supabase will handle if user exists or not
      const { error, isNewUser: newUser } = await signInWithMagicLink(email);

      if (error) {
        throw error;
      }

      if (newUser) {
        // New user needs to complete profile
        setIsNewUser(true);
        setStep('profile');
      } else {
        // Existing user - magic link sent
        setStep('magic-link-sent');
        toast({
          title: "Lien envoyé ! 📧",
          description: "Vérifiez votre boîte mail pour vous connecter",
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      toast({
        title: "Erreur",
        description: err.message || "Une erreur s'est produite",
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
      const { error } = await signUp(email, fullName, promoCode);

      if (error) {
        throw error;
      }

      setStep('magic-link-sent');
      toast({
        title: "Compte créé ! 📧",
        description: "Vérifiez votre boîte mail pour activer votre compte",
      });
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

  const handleResendMagicLink = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithMagicLink(email);
      if (error) throw error;
      
      toast({
        title: "Lien renvoyé ! 📧",
        description: "Vérifiez votre boîte mail",
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de renvoyer le lien",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
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

        {/* Referral Bonus Banner */}
        {hasReferralFromUrl && step !== 'magic-link-sent' && (
          <div className="mb-4 bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
            <div className="bg-primary/20 p-2 rounded-full">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                🎉 Bonus de parrainage détecté !
              </p>
              <p className="text-xs text-muted-foreground">
                Créez votre compte pour recevoir <span className="text-primary font-semibold">1 000 FCFA</span> de bonus
              </p>
            </div>
          </div>
        )}

        {/* Step: Email Input */}
        {step === 'email' && (
          <Card className="bg-card border-border animate-slide-up">
            <CardHeader>
              <CardTitle className="text-foreground text-center">
                Connexion / Inscription
              </CardTitle>
              <p className="text-muted-foreground text-center text-sm">
                Entrez votre email, nous vous enverrons un lien de connexion
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitEmail()}
                    className="pl-10 bg-input border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSubmitEmail}
                disabled={isLoading}
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
                    Continuer
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Profile Completion (New Users Only) */}
        {step === 'profile' && (
          <Card className="bg-card border-border animate-slide-up">
            <CardHeader>
              <CardTitle className="text-foreground text-center">
                Créer votre compte
              </CardTitle>
              <p className="text-muted-foreground text-center text-sm">
                Dernière étape avant de commencer !
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Email Display */}
              <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{email}</span>
                <button 
                  onClick={() => setStep('email')}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  Modifier
                </button>
              </div>

              {/* Full Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nom de compte <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Comment devons-nous vous appeler ?"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-input border-border text-foreground placeholder-muted-foreground"
                />
              </div>

              {/* Promo Code Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Code promo <span className="text-muted-foreground">(optionnel)</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ex: JINBAO2024"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="bg-input border-border text-foreground placeholder-muted-foreground uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Entrez le code d'un ami pour recevoir <span className="text-primary font-semibold">1 000 FCAF</span> de bonus !
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
                    Créer mon compte
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Magic Link Sent */}
        {step === 'magic-link-sent' && (
          <Card className="bg-card border-border animate-slide-up">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-foreground text-center">
                Vérifiez votre boîte mail
              </CardTitle>
              <p className="text-muted-foreground text-center text-sm">
                Nous avons envoyé un lien de connexion à
              </p>
              <p className="text-foreground text-center font-medium">
                {email}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Cliquez sur le lien dans l'email pour vous connecter. 
                  Le lien est valide pendant 24 heures.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleResendMagicLink}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? "Envoi..." : "Renvoyer le lien"}
                </Button>
                <button
                  onClick={() => {
                    setStep('email');
                    setEmail('');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Utiliser une autre adresse email
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-muted-foreground text-sm">
          <p>En continuant, vous acceptez nos</p>
          <p>
            <span className="text-primary hover:underline cursor-pointer">Conditions d'utilisation</span>
            {' '} et {' '}
            <span className="text-primary hover:underline cursor-pointer">Politique de confidentialité</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
