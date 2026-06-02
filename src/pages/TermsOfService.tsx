import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SEO from '@/components/SEO';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Conditions générales d'utilisation — JinBao"
        description="CGU de la marketplace JinBao : règles d'achat, vente, escrow, livraison et résolution de litiges entre la Chine et le Cameroun."
        path="/terms"
      />
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Conditions Générales d'Utilisation</h1>
        </div>
      </header>

      <main className="p-4 pb-8 max-w-4xl mx-auto space-y-6">
        <h2 className="sr-only">Détails de nos conditions générales</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">1. Objet</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de 
              l'application JinBao et les relations entre JinBao et ses utilisateurs.
            </p>
            <p>
              En utilisant notre application, vous acceptez sans réserve ces conditions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">2. Services proposés</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>JinBao propose les services suivants :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Vente de produits importés de Chine</li>
              <li>Service de livraison à domicile</li>
              <li>Système d'enchères sur certains produits</li>
              <li>Assistant virtuel personnalisé (JinBao)</li>
              <li>Système de portefeuille électronique</li>
              <li>Programme de parrainage</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">3. Inscription et compte</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>Pour utiliser nos services, vous devez :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Être âgé d'au moins 18 ans ou avoir l'autorisation parentale</li>
              <li>Fournir des informations exactes et à jour</li>
              <li>Protéger la confidentialité de vos identifiants</li>
              <li>Ne pas créer plusieurs comptes</li>
            </ul>
            <p className="mt-3">
              Vous êtes responsable de toutes les activités effectuées depuis votre compte.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">4. Commandes et paiements</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p><strong>Processus de commande :</strong></p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Les prix affichés sont en FCFA et incluent les taxes applicables</li>
              <li>Une commande est confirmée après paiement ou validation</li>
              <li>Les délais de livraison sont indicatifs et peuvent varier</li>
            </ul>
            <p className="mt-3"><strong>Moyens de paiement acceptés :</strong></p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Mobile Money (MTN, Orange, Moov)</li>
              <li>Solde du portefeuille JinBao</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">5. Livraison</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>La livraison est effectuée à l'adresse indiquée lors de la commande</li>
              <li>Les frais de livraison sont calculés selon la zone de livraison</li>
              <li>Vous devez être disponible pour réceptionner votre colis</li>
              <li>Vérifiez l'état du colis à la réception</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">6. Enchères</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>Pour les produits en enchère :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Chaque enchère est définitive et engage l'utilisateur</li>
              <li>Le gagnant est l'enchérisseur le plus élevé à la fin de l'enchère</li>
              <li>Le paiement doit être effectué dans les 24h suivant la fin de l'enchère</li>
              <li>En cas de non-paiement, votre compte peut être suspendu</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">7. Portefeuille électronique</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Le solde du portefeuille peut être utilisé pour vos achats</li>
              <li>Les recharges sont effectuées via Mobile Money</li>
              <li>Les bonus de parrainage sont crédités sur le portefeuille</li>
              <li>Le solde n'est pas remboursable en espèces</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">8. Retours et réclamations</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Signalez tout problème dans les 48h suivant la réception</li>
              <li>Les produits défectueux peuvent être échangés ou remboursés</li>
              <li>Les retours pour convenance personnelle ne sont pas acceptés</li>
              <li>Contactez notre service client via WhatsApp pour toute réclamation</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">9. Propriété intellectuelle</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Tous les éléments de l'application JinBao (logo, design, textes, images) sont protégés 
              par le droit de la propriété intellectuelle. Toute reproduction non autorisée est interdite.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">10. Responsabilités</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p><strong>JinBao s'engage à :</strong></p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Fournir des produits conformes à leur description</li>
              <li>Assurer la sécurité des transactions</li>
              <li>Protéger vos données personnelles</li>
            </ul>
            <p className="mt-3"><strong>JinBao ne peut être tenu responsable :</strong></p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Des retards de livraison indépendants de notre volonté</li>
              <li>D'une mauvaise utilisation des produits</li>
              <li>Des interruptions temporaires du service</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">11. Suspension et résiliation</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>JinBao se réserve le droit de suspendre ou fermer un compte en cas de :</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Non-respect des présentes CGU</li>
              <li>Activités frauduleuses</li>
              <li>Abus du système d'enchères</li>
              <li>Comportement inapproprié</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">12. Modifications des CGU</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              JinBao peut modifier ces CGU à tout moment. Les modifications entrent en vigueur 
              dès leur publication. L'utilisation continue de l'application vaut acceptation 
              des nouvelles conditions.
            </p>
            <p className="mt-4 text-sm">
              Dernière mise à jour : Janvier 2025
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-jinbao-red">13. Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Pour toute question concernant ces conditions, contactez-nous via l'application 
              JinBao ou par WhatsApp.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TermsOfService;
