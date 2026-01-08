import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Package,
  CreditCard,
  Shield,
  RotateCcw,
  Clock,
  Phone,
  Mail,
  MapPin,
  Truck,
  HelpCircle,
} from "lucide-react";

const HelpCenter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const faqCategories = [
    {
      id: "ordering",
      title: "Commander & Comment ça marche",
      icon: <Package className="h-5 w-5" />,
      color: "bg-jinbao-red",
      faqs: [
        {
          question: "Qu'est-ce que JinBao Smart Market ?",
          answer:
            "JinBao Smart Market est votre marketplace premium pour les produits tech sourced directement de Chine. Nous proposons smartphones, laptops, et accessoires avec livraison China → Cameroun. Notre mission : vous offrir des produits de qualité à des prix attractifs avec un service premium.",
        },
        {
          question: "Comment passer une commande ?",
          answer:
            "1. Parcourez notre catalogue par catégories\n2. Sélectionnez vos produits avec variantes (couleur, stockage)\n3. Ajoutez au panier\n4. Choisissez votre mode de livraison (Express 7-10j ou Économique 10-15j)\n5. Sélectionnez votre ville de livraison\n6. Choisissez votre mode de paiement (MoMo, OM, Virement)\n7. Confirmez votre commande",
        },
        {
          question: "Quels types de produits vendez-vous ?",
          answer:
            "Nous proposons 4 catégories principales :\n• Smartphones neufs (iPhone, Samsung, Xiaomi, etc.)\n• Smartphones reconditionnés/occasions\n• Laptops & MacBook (MacBook, Dell, Huawei, etc.)\n• Accessoires (chargeurs, câbles, earbuds, powerbanks, supports)",
        },
        {
          question: "Les produits sont-ils neufs ?",
          answer:
            "Nous proposons 3 états de produits :\n• Neuf : Produit completely neuf avec garantie\n• Reconditionné : Produit testé et certifié (grade A/B)\n• Occasion : Produit d'occasion vérifié (grade C)",
        },
      ],
    },
    {
      id: "payment",
      title: "Paiement & Tarifs",
      icon: <CreditCard className="h-5 w-5" />,
      color: "bg-jinbao-blue",
      faqs: [
        {
          question: "Quels sont les modes de paiement acceptés ?",
          answer:
            "Nous acceptons 3 modes de paiement au Cameroun :\n• Mobile Money MTN & Orange Money\n• Orange Money (OM)\n• Virement bancaire\nTous les paiements sont sécurisés et confirmés en temps réel.",
        },
        {
          question: "Y a-t-il des frais supplémentaires ?",
          answer:
            "Oui, nos prix incluent :\n• Prix du produit\n• Frais de livraison (Express: 25,000F ou Économique: 15,000F)\n• Taxes camerounaises (19.25%)\nLe total exact est calculé automatiquement dans votre panier.",
        },
        {
          question: "Les prix sont-ils en FCFA ?",
          answer:
            "Oui, tous nos prix sont affichés en Franc CFA (FCFA). Les prix sont fixes sans fluctuation de change.",
        },
        {
          question: "Puis-je payer en plusieurs fois ?",
          answer:
            "Actuellement, nous acceptons uniquement le paiement intégral. Le paiement en plusieurs fois sera bientôt disponible.",
        },
      ],
    },
    {
      id: "shipping",
      title: "Livraison & Délais",
      icon: <Truck className="h-5 w-5" />,
      color: "bg-green-500",
      faqs: [
        {
          question: "Combien de temps pour la livraison ?",
          answer:
            "Nous proposons 2 options :\n• Express : 7-10 jours\n• Économique : 10-15 jours\nDélai compter à partir de la confirmation de paiement.",
        },
        {
          question: "Dans quelles villes livrez-vous ?",
          answer:
            "Nous livrons dans tout le Cameroun :\n• Grandes villes : Douala, Yaoundé, Bafoussam, Buea, Kribi, Garoua\n• Autres villes : Bertoua, Ebolowa, Ngaoundéré, Maroua, Dschang, Limbe\nEt bien d'autres !",
        },
        {
          question: "Comment se déroule la livraison China → Cameroun ?",
          answer:
            "Notre processus en 6 étapes :\n1. Commande confirmée (Cameroun)\n2. Achat en Chine (Guangzhou)\n3. Contrôle qualité (Entrepôt Chine)\n4. Expédition aérienne (3-5 jours)\n5. Arrivée Douala & dédouanement (1-2 jours)\n6. Livraison locale (1-2 jours)",
        },
        {
          question: "Puis-je suivre ma commande ?",
          answer:
            'Oui ! Dans votre espace "Mes Commandes", vous pouvez suivre en temps réel chaque étape de votre livraison avec localisation exacte et délais estimés.',
        },
        {
          question:
            "Que se passe-t-il si je ne suis pas là lors de la livraison ?",
          answer:
            "Notre livreur vous contactera avant arrival. Vous pouvez :\n• Modifier l'heure de livraison\n• Donner procuration\n• Retirer en point relais\n• Reporter la livraison",
        },
      ],
    },
    {
      id: "warranty",
      title: "Garanties & SAV",
      icon: <Shield className="h-5 w-5" />,
      color: "bg-purple-500",
      faqs: [
        {
          question: "Quelle garantie sur les produits ?",
          answer:
            "Nos garanties selon l'état :\n• Neuf : 12 mois garantie constructeur\n• Reconditionné : 6 mois garantie JinBao\n• Occasion : 3 mois garantie JinBao\nToutes les garanties incluent le SAV et les réparations.",
        },
        {
          question: "Comment activer ma garantie ?",
          answer:
            "Contactez-nous via :\n• WhatsApp : +237 696 417 018\n• Email avec numéro de commande et photos\nNous procédons à un diagnostic et réparation/remplacement sous 48h.",
        },
        {
          question: "La garantie couvre-t-elle les dommages accidentels ?",
          answer:
            "Non, la garantie ne couvre pas :\n• Chutes, chocs, agua damage\n• Utilisation non conforme\n• Modification non autorisée\n• Usure normale\nNous proposons une assurance accident en option.",
        },
      ],
    },
    {
      id: "returns",
      title: "Retours & Remboursements",
      icon: <RotateCcw className="h-5 w-5" />,
      color: "bg-orange-500",
      faqs: [
        {
          question: "Puis-je retourner un produit ?",
          answer:
            "Oui, sous conditions :\n• Délai : 7 jours après réception\n• État : Produit non utilisé, emballage intact\n• Motif : Défaut, erreur de commande, produit non conforme\nLes frais de retour sont à votre charge sauf défaut de notre part.",
        },
        {
          question: "Comment effectuer un retour ?",
          answer:
            "Étapes du retour :\n1. Contactez-nous via WhatsApp ou email\n2. Expliquez le motif du retour\n3. Emballez soigneusement le produit\n4. Envoyez le produit à notre adresse\n5. Nous procédons au remboursement sous 5-7 jours",
        },
        {
          question: "Quand suis-je remboursé ?",
          answer:
            "Délais de remboursement :\n• Produits conformes retournés : 5-7 jours\n• Produits défectueux : 3-5 jours après réception\n• Mode : Même méthode que le paiement initial\n• Frais : Produit + taxes, vous gardez les frais de livraison",
        },
      ],
    },
    {
      id: "contact",
      title: "Contact & Support",
      icon: <MessageCircle className="h-5 w-5" />,
      color: "bg-teal-500",
      faqs: [
        {
          question: "Comment contacter le support client ?",
          answer:
            "Plusieurs moyens de nous joindre :\n• WhatsApp : +237 696 417 018 (24h/7j)\n• Email : support@jinbao.cm\n• Live chat sur le site\n• Formulaire de contact\nRéponse garantie sous 2h en semaine.",
        },
        {
          question: "Quels sont vos horaires d'ouverture ?",
          answer:
            "Support client :\n• Lundi - Vendredi : 8h - 20h\n• Samedi : 9h - 18h\n• Dimanche : 10h - 16h\nWhatsApp disponible 24h/7j pour urgences.",
        },
        {
          question: "Parlez-vous français ?",
          answer:
            "Oui ! Notre équipe parle français couramment. Nous sommes basés au Cameroun et comprenons parfaitement vos besoins et questions.",
        },
        {
          question: "Puis-je visiter vos bureaux ?",
          answer:
            "Nos bureaux sont à Douala, mais sur rendez-vous uniquement. Contactez-nous pour planifier une visite et découvrir nos produits en personne.",
        },
      ],
    },
  ];

  const filteredFAQs = faqCategories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.faqs.length > 0);

  const quickActions = [
    {
      title: "Contacter Support",
      description: "WhatsApp 24h/7j",
      action: () => window.open("https://wa.me/237696417018", "_blank"),
      icon: <MessageCircle className="h-6 w-6" />,
      color: "bg-green-500",
    },
    {
      title: "Suivre Commande",
      description: "Voir mes commandes",
      action: () => navigate("/orders"),
      icon: <Package className="h-6 w-6" />,
      color: "bg-jinbao-red",
    },
    {
      title: "Nos Produits",
      description: "Catalogue complet",
      action: () => navigate("/"),
      icon: <Search className="h-6 w-6" />,
      color: "bg-jinbao-blue",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-jinbao-red" />
              <h1 className="text-2xl font-bold text-foreground">
                Centre d'Aide
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <section className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Comment pouvons-nous vous{" "}
            <span className="text-jinbao-red">aider</span> ?
          </h2>
          <p className="text-muted-foreground mb-6">
            Trouvez rapidement les réponses à vos questions sur JinBao Smart
            Market
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Rechercher dans l'aide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={action.action}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted"
              >
                <div className={`p-2 rounded-full ${action.color} text-white`}>
                  {action.icon}
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="space-y-6">
          {filteredFAQs.map((category) => (
            <Card key={category.id} className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div
                    className={`p-2 rounded-full ${category.color} text-white`}
                  >
                    {category.icon}
                  </div>
                  {category.title}
                  <Badge variant="secondary" className="ml-auto">
                    {category.faqs.length} question
                    {category.faqs.length > 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.faqs.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`${category.id}-${index}`}
                    >
                      <AccordionTrigger className="text-left hover:text-jinbao-red">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground whitespace-pre-line">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* No Results */}
        {filteredFAQs.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucun résultat trouvé
              </h3>
              <p className="text-muted-foreground mb-4">
                Essayez de modifier votre recherche ou contactez notre support
              </p>
              <Button
                onClick={() =>
                  window.open("https://wa.me/237696417018", "_blank")
                }
                className="bg-jinbao-red hover:bg-jinbao-red/90 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contacter le support
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Phone className="h-8 w-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">WhatsApp</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Support 24h/7j
              </p>
              <Button
                onClick={() =>
                  window.open("https://wa.me/237696417018", "_blank")
                }
                variant="outline"
                size="sm"
                className="w-full"
              >
                +237 696 417 018
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Mail className="h-8 w-8 text-jinbao-blue mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Email</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Réponse sous 2h
              </p>
              <Button
                onClick={() =>
                  window.open("mailto:support@jinbao.cm", "_blank")
                }
                variant="outline"
                size="sm"
                className="w-full"
              >
                support@jinbao.cm
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="h-8 w-8 text-jinbao-red mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Adresse</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Douala, Cameroun
              </p>
              <Button
                onClick={() =>
                  window.open(
                    "https://maps.google.com?q=Douala,Cameroon",
                    "_blank"
                  )
                }
                variant="outline"
                size="sm"
                className="w-full"
              >
                Voir sur Maps
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default HelpCenter;
