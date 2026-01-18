import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Globe2, ShieldCheck, Users } from 'lucide-react';

const About = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Globe2 className="h-8 w-8 text-jinbao-blue" />,
      title: "Sourcing Direct Chine",
      desc: "Nous connectons directement les consommateurs camerounais aux usines de Shenzhen et Guangzhou. Zéro intermédiaire inutile."
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-green-500" />,
      title: "Qualité Garantie",
      desc: "Chaque produit est inspecté dans nos entrepôts avant expédition. Si ce n'est pas conforme, on n'envoie pas."
    },
    {
      icon: <Users className="h-8 w-8 text-jinbao-red" />,
      title: "Service Local",
      desc: "Une équipe support 100% camerounaise basée à Douala pour vous accompagner avant, pendant et après l'achat."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-jinbao-blue text-white py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Redéfinir le E-commerce au Cameroun</h1>
            <p className="text-xl opacity-90 leading-relaxed">
              JinBao n'est pas juste un site de vente. C'est un pont technologique entre l'innovation asiatique et le dynamisme africain.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-4 container mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Notre Mission</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Né du constat que les produits tech de qualité étaient soit inaccessibles, soit trop chers au Cameroun, JinBao a été créé avec une idée simple : 
                <strong> démocratiser l'accès à la technologie premium.</strong>
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Grâce à notre logistique intégrée "Door-to-Door", nous supprimons les barrières douanières complexes pour le client final. Vous commandez, nous gérons tout le reste jusqu'à votre porte.
              </p>
            </div>
            <div className="flex-1">
              <img 
                src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1632&q=80" 
                alt="Equipe JinBao" 
                className="rounded-2xl shadow-xl w-full object-cover h-[400px]"
              />
            </div>
          </div>
        </section>

        {/* Values Grid */}
        <section className="bg-white dark:bg-gray-800 py-16 px-4">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Pourquoi nous choisir ?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <Card key={idx} className="border-0 shadow-lg bg-gray-50 dark:bg-gray-900">
                  <CardContent className="pt-8 text-center px-6 pb-8">
                    <div className="bg-white dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 bg-jinbao-red text-white text-center">
            <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                   <div className="text-4xl font-bold mb-2">5k+</div>
                   <div className="text-white/80">Clients Satisfaits</div>
                </div>
                <div>
                   <div className="text-4xl font-bold mb-2">12k+</div>
                   <div className="text-white/80">Commandes Livrées</div>
                </div>
                <div>
                   <div className="text-4xl font-bold mb-2">98%</div>
                   <div className="text-white/80">Taux de Satisfaction</div>
                </div>
                <div>
                   <div className="text-4xl font-bold mb-2">24/7</div>
                   <div className="text-white/80">Support Client</div>
                </div>
            </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
