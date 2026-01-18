import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Politique de Confidentialité</h1>
        
        <div className="space-y-6 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">1. Collecte des Informations</h2>
            <p>Nous collectons les informations nécessaires au traitement de vos commandes : Nom, adresse de livraison, numéro de téléphone, et adresse email.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">2. Utilisation des Données</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Traiter et livrer vos commandes.</li>
              <li>Communiquer sur l'état de votre livraison.</li>
              <li>Améliorer nos services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">3. Sécurité</h2>
            <p>Nous mettons en œuvre des mesures de sécurité pour protéger vos informations personnelles. Vos informations de paiement sont traitées par des partenaires sécurisés (NotchPay) et ne sont pas stockées sur nos serveurs.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">4. Cookies</h2>
            <p>Nous utilisons des cookies pour améliorer votre expérience de navigation et analyser le trafic sur notre site.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
