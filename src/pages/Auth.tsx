import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un numéro de téléphone valide",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsOtpSent(true);
      setIsLoading(false);
      toast({
        title: "Code envoyé !",
        description: "Un code OTP a été envoyé à votre numéro WhatsApp",
      });
    }, 2000);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer le code à 6 chiffres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Connexion réussie !",
        description: "Bienvenue sur TCHOKOS",
      });
      // Redirect to home page
      window.location.href = '/';
    }, 1500);
  };

  const handleGoogleLogin = () => {
    toast({
      title: "Connexion Google",
      description: "Fonctionnalité bientôt disponible",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="tchokos-logo text-5xl mb-4">TCHOKOS</h1>
          <p className="text-muted-foreground text-lg">
            Connectez-vous pour accéder à votre compte
          </p>
        </div>

        <Card className="bg-card border-border animate-slide-up">
          <CardHeader>
            <CardTitle className="text-foreground text-center">
              {isOtpSent ? 'Vérification OTP' : 'Connexion'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isOtpSent ? (
              <>
                {/* Phone Number Input */}
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
                  <p className="text-xs text-muted-foreground">
                    Nous vous enverrons un code OTP via WhatsApp
                  </p>
                </div>

                <Button 
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="coupon-button w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Envoyer le code OTP
                    </>
                  )}
                </Button>

                <div className="relative">
                  <Separator className="bg-border" />
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-muted-foreground text-sm">
                    ou
                  </span>
                </div>

                {/* Google Login */}
                <Button 
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Continuer avec Google
                </Button>
              </>
            ) : (
              <>
                {/* OTP Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Code de vérification
                  </label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-widest bg-input border-border text-foreground placeholder-muted-foreground"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Code envoyé au {phoneNumber}
                  </p>
                </div>

                <Button 
                  onClick={handleVerifyOtp}
                  disabled={isLoading}
                  className="coupon-button w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Vérification...
                    </>
                  ) : (
                    'Vérifier le code'
                  )}
                </Button>

                <Button 
                  onClick={() => setIsOtpSent(false)}
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Modifier le numéro
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-muted-foreground text-sm">
          <p>En vous connectant, vous acceptez nos</p>
          <p>
            <span className="text-accent hover:underline cursor-pointer">Conditions d'utilisation</span>
            {' '} et {' '}
            <span className="text-accent hover:underline cursor-pointer">Politique de confidentialité</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;