import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Conditions Générales d'Utilisation</h1>
        
        <div className="space-y-6 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">1. Introduction</h2>
            <p>Bienvenue sur JinBao Smart Market. En accédant à notre site web et en utilisant nos services, vous acceptez d'être lié par les présentes conditions générales.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">2. Commandes et Paiements</h2>
            <p>Toutes les commandes sont soumises à disponibilité et confirmation du prix. Les délais d'expédition peuvent varier en fonction de la disponibilité et des garanties ou représentations faites quant aux délais de livraison.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Les paiements doivent être effectués via les méthodes approuvées (Mobile Money, Orange Money).</li>
              <li>Nous nous réservons le droit de refuser toute commande.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">3. Livraison</h2>
            <p>Nous livrons depuis la Chine vers le Cameroun. Les délais annoncés (7-15 jours) sont estimatifs et dépendent des transporteurs aériens et des formalités douanières.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">4. Retours et Remboursements</h2>
            <p>Veuillez consulter notre politique de retours dans le Centre d'Aide. Les produits défectueux peuvent être retournés sous 7 jours.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">5. Propriété Intellectuelle</h2>
            <p>Tout le contenu présent sur ce site (textes, graphiques, logos) est la propriété de JinBao Global Technology Ltd.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
