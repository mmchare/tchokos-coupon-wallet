import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Phone, User, Gift, ArrowRight, Eye, EyeOff, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

const signUpSchema = z.object({
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  phone: z.string().min(8, "Numéro de téléphone invalide").max(20),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  affiliationCode: z.string().max(8).optional()
});

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signUp, signIn, loading } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [affiliationCode, setAffiliationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Generate email from phone number (for internal auth)
  const phoneToEmail = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `${cleanPhone}@pinbaoo.app`;
  };

  const handleSignUp = async () => {
    try {
      // Validate inputs
      const validation = signUpSchema.safeParse({
        fullName,
        phone: phoneNumber,
        password,
        affiliationCode: affiliationCode || undefined
      });

      if (!validation.success) {
        toast({
          title: "Erreur de validation",
          description: validation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }

      setIsLoading(true);
      const email = phoneToEmail(phoneNumber);
      
      const { error } = await signUp(
        email, 
        password, 
        fullName, 
        phoneNumber, 
        affiliationCode || undefined
      );

      if (error) {
        let message = "Une erreur s'est produite";
        if (error.message.includes('already registered')) {
          message = "Ce numéro est déjà utilisé. Connectez-vous.";
        }
        toast({
          title: "Erreur",
          description: message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Compte créé !",
        description: "Bienvenue sur PINBAOO",
      });
      navigate('/');
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un numéro de téléphone valide",
        variant: "destructive"
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer votre mot de passe",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const email = phoneToEmail(phoneNumber);
    
    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: "Numéro ou mot de passe incorrect",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Connexion réussie !",
      description: "Bienvenue sur PINBAOO",
    });
    setIsLoading(false);
    navigate('/');
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
          <h1 className="pinbaoo-logo text-5xl mb-2">PINBAOO</h1>
          <p className="text-muted-foreground text-sm mb-4">
            L'assurance d'un achat vérifié en Chine
          </p>
          <p className="text-foreground text-lg font-medium">
            {isSignUp ? 'Créez votre compte' : 'Connectez-vous'}
          </p>
        </div>

        <Card className="bg-card border-border animate-slide-up">
          <CardHeader>
            <CardTitle className="text-foreground text-center">
              {isSignUp ? 'Inscription' : 'Connexion'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {isSignUp && (
              /* Full Name Input */
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Jean Dupont"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
              </div>
            )}

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
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mot de passe
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 bg-input border-border text-foreground placeholder-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              /* Affiliation Code Input */
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Code de parrainage <span className="text-muted-foreground">(optionnel)</span>
                </label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Ex: PINB2024"
                    value={affiliationCode}
                    onChange={(e) => setAffiliationCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="pl-10 bg-input border-border text-foreground placeholder-muted-foreground uppercase"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Entrez le code d'un ami pour rejoindre son réseau
                </p>
              </div>
            )}

            <Button 
              onClick={isSignUp ? handleSignUp : handleSignIn}
              disabled={isLoading}
              className="buy-button w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {isSignUp ? 'Création...' : 'Connexion...'}
                </>
              ) : (
                <>
                  {isSignUp ? <ArrowRight className="h-4 w-4 mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                  {isSignUp ? "S'inscrire" : 'Se connecter'}
                </>
              )}
            </Button>

            <div className="relative">
              <Separator className="bg-border" />
              <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-muted-foreground text-sm">
                ou
              </span>
            </div>

            <Button 
              onClick={() => setIsSignUp(!isSignUp)}
              variant="outline"
              className="w-full border-pinbaoo-yellow text-pinbaoo-yellow hover:bg-pinbaoo-yellow hover:text-pinbaoo-dark"
            >
              {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-muted-foreground text-sm">
          <p>En vous inscrivant, vous acceptez nos</p>
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