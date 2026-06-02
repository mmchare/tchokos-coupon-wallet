import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SEO from '@/components/SEO';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Politique de confidentialité — JinBao"
        description="Comment JinBao collecte, utilise et protège vos données personnelles : commandes, paiements Mobile Money et notifications."
        path="/privacy"
      />
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Politique de Confidentialité</h1>
        </div>
      </header>

      <main className="p-4 pb-8 max-w-4xl mx-auto space-y-6">
        <h2 className="sr-only">Détails de notre politique de confidentialité</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">1. Introduction</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Bienvenue sur JinBao. Nous nous engageons à protéger votre vie privée et vos données personnelles. 
              Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations.
            </p>
            <p>
              En utilisant notre application, vous acceptez les pratiques décrites dans cette politique.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">2. Données collectées</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>Nous collectons les types de données suivants :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Informations d'identification :</strong> nom, numéro de téléphone, adresse de livraison</li>
              <li><strong>Données de transaction :</strong> historique des commandes, montants, produits achetés</li>
              <li><strong>Données d'utilisation :</strong> pages visitées, produits consultés, préférences</li>
              <li><strong>Données techniques :</strong> type d'appareil, navigateur, adresse IP</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">3. Utilisation des données</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Traiter et livrer vos commandes</li>
              <li>Personnaliser votre expérience d'achat</li>
              <li>Vous envoyer des notifications sur vos commandes</li>
              <li>Améliorer nos services et notre application</li>
              <li>Assurer la sécurité de votre compte</li>
              <li>Vous proposer des recommandations personnalisées via notre assistant JinBao</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">4. Protection des données</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données :
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Chiffrement des données sensibles</li>
              <li>Accès restreint aux données personnelles</li>
              <li>Surveillance continue de nos systèmes</li>
              <li>Mises à jour régulières de sécurité</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">5. Partage des données</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos informations avec :
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Nos partenaires de livraison pour acheminer vos commandes</li>
              <li>Nos prestataires de paiement pour traiter vos transactions</li>
              <li>Les autorités compétentes si la loi l'exige</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">6. Vos droits</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>Vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Droit d'accès :</strong> consulter vos données personnelles</li>
              <li><strong>Droit de rectification :</strong> corriger vos informations</li>
              <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité :</strong> récupérer vos données</li>
            </ul>
            <p className="mt-4">
              Pour exercer ces droits, contactez-nous via l'application ou par WhatsApp.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">7. Cookies et technologies similaires</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Nous utilisons des cookies et technologies similaires pour améliorer votre expérience, 
              mémoriser vos préférences et analyser l'utilisation de notre application.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">8. Modifications</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Nous pouvons mettre à jour cette politique de confidentialité. Les modifications seront 
              publiées sur cette page avec la date de mise à jour.
            </p>
            <p className="mt-4 text-sm">
              Dernière mise à jour : Janvier 2025
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">9. Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Pour toute question concernant cette politique de confidentialité, contactez-nous via 
              l'application JinBao ou par WhatsApp.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
