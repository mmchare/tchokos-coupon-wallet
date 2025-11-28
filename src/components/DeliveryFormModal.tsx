import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MapPin, Phone } from 'lucide-react';

const deliveryFormSchema = z.object({
  address: z.string()
    .trim()
    .min(10, { message: "L'adresse doit contenir au moins 10 caractères" })
    .max(200, { message: "L'adresse ne peut pas dépasser 200 caractères" }),
  phone: z.string()
    .trim()
    .min(9, { message: "Le numéro de téléphone doit contenir au moins 9 chiffres" })
    .max(15, { message: "Le numéro de téléphone ne peut pas dépasser 15 chiffres" })
    .regex(/^[0-9+\s()-]+$/, { message: "Format de numéro invalide" }),
});

type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

interface DeliveryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DeliveryFormValues) => void;
  total: number;
}

const DeliveryFormModal = ({ isOpen, onClose, onSubmit, total }: DeliveryFormModalProps) => {
  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      address: '',
      phone: '',
    },
  });

  const handleSubmit = (data: DeliveryFormValues) => {
    onSubmit(data);
    form.reset();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            Informations de livraison
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Livraison gratuite à Douala, Yaoundé, Koutaba, Foumban et Foumbot. Pour les autres villes/pays, vous serez contacté via WhatsApp pour convenir des frais de livraison.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-1">Montant total</p>
            <p className="text-2xl font-bold text-accent">{total.toLocaleString()} F</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Description détaillée du lieu de livraison</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Exemple: Salut je m'appelle Stéphane et voici le numéro à contacter pour la livraison une fois au niveau du quartier Nkomondo à Douala dans l'arrondissement de Douala 2ème plus précisément à l'école publique. Merci"
                        className="min-h-[120px] bg-background border-input text-foreground resize-none"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Décrivez votre emplacement de manière détaillée : quartier, points de repère, nom de la personne à contacter, etc.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Numéro WhatsApp pour la livraison</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="+237 6 XX XX XX XX"
                          className="pl-10 bg-background border-input text-foreground"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Numéro à contacter lors de la livraison
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Valider la commande
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryFormModal;
