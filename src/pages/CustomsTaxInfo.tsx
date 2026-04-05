import { ArrowLeft, Shield, Smartphone, FileText, ExternalLink, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const CustomsTaxInfo = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Taxe douanière sur les téléphones</h1>
            <p className="text-xs text-muted-foreground">Ce que vous devez savoir</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Hero Banner */}
        <Card className="bg-primary/5 border-primary/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2.5 rounded-full flex-shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base mb-1">JinBao vous protège</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Depuis le 1er avril 2026, le Cameroun applique un système numérique de collecte 
                  des droits de douane sur les téléphones importés. Chez JinBao, nous vous accompagnons 
                  pour rester en conformité.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What is it */}
        <section className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            En quoi consiste cette réforme ?
          </h3>
          <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p>
              Le gouvernement camerounais a mis en place un <strong className="text-foreground">mécanisme numérique 
              de traçabilité</strong> basé sur le code IMEI de chaque téléphone. Ce n'est pas une nouvelle 
              taxe — c'est la numérisation de droits de douane existants.
            </p>
            <p>
              Chaque téléphone importé doit être déclaré via le système <strong className="text-foreground">CAMCIS</strong> et 
              ses droits de douane acquittés, sinon l'appareil sera <strong className="text-destructive">bloqué des réseaux 
              mobiles camerounais</strong>.
            </p>
          </div>
        </section>

        {/* Key numbers */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">33,3%</p>
              <p className="text-xs text-muted-foreground">Taux de droits de douane</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">19,25%</p>
              <p className="text-xs text-muted-foreground">TVA à l'importation</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">4M</p>
              <p className="text-xs text-muted-foreground">Téléphones/an au Cameroun</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">IMEI</p>
              <p className="text-xs text-muted-foreground">Identification unique</p>
            </CardContent>
          </Card>
        </div>

        {/* What JinBao does */}
        <section className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            Ce que JinBao fait pour vous
          </h3>
          <div className="space-y-2">
            {[
              { icon: CheckCircle2, text: "Option d'ajout des frais de douane directement lors de l'achat", color: "text-green-500" },
              { icon: CheckCircle2, text: "Dédouanement officiel via CAMCIS pour chaque téléphone commandé", color: "text-green-500" },
              { icon: CheckCircle2, text: "IMEI enregistré = téléphone utilisable sur tous les réseaux camerounais", color: "text-green-500" },
              { icon: CheckCircle2, text: "Transparence totale sur les frais dans le prix final", color: "text-green-500" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 bg-muted/30 rounded-lg p-3">
                <item.icon className={`h-4 w-4 ${item.color} mt-0.5 flex-shrink-0`} />
                <p className="text-sm text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Warning */}
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">Attention aux téléphones non dédouanés</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Les téléphones dont les droits de douane n'ont pas été payés seront progressivement 
                bloqués des réseaux mobiles MTN, Orange et Camtel. Achetez toujours via des canaux 
                officiels comme JinBao pour éviter ce risque.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <section className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            Questions fréquentes
          </h3>
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="q1" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm text-left">
                Comment vérifier le statut IMEI de mon téléphone ?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Composez <strong>*#06#</strong> sur votre téléphone pour obtenir votre code IMEI, 
                puis vérifiez-le sur le site officiel <strong>mpie.camcis.cm</strong>.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm text-left">
                Mon ancien téléphone sera-t-il bloqué ?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Non. Les téléphones déjà connectés aux réseaux avant le 1er avril 2026 bénéficient 
                d'une amnistie fiscale et sont considérés comme conformes.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm text-left">
                Combien coûtent les droits de douane ?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Les droits de douane représentent environ <strong>33,3%</strong> de la valeur en douane 
                du téléphone (incluant la TVA à l'importation de 19,25%). Sur JinBao, vous pouvez 
                ajouter ces frais directement lors de l'achat.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm text-left">
                Que se passe-t-il si je n'ajoute pas les frais de douane ?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Vous recevrez votre téléphone normalement mais vous devrez vous-même effectuer 
                la procédure de dédouanement auprès des services de la douane camerounaise pour 
                que l'IMEI soit enregistré et que l'appareil fonctionne sur les réseaux locaux.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* External link */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open('https://mpie.camcis.cm', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Vérifier un IMEI sur CAMCIS
        </Button>
      </main>
    </div>
  );
};

export default CustomsTaxInfo;
