import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { MapPin, Phone, Wallet, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const FREE_DELIVERY_CITIES = ['Douala', 'Yaoundé', 'Koutaba', 'Foumban', 'Foumbot'];

const deliveryFormSchema = z.object({
  city: z.string()
    .trim()
    .min(1, { message: "Veuillez sélectionner ou saisir votre ville" }),
  address: z.string()
    .trim()
    .min(10, { message: "La description doit contenir au moins 10 caractères" })
    .max(500, { message: "La description ne peut pas dépasser 500 caractères" }),
  phone: z.string()
    .trim()
    .min(9, { message: "Le numéro de téléphone doit contenir au moins 9 chiffres" })
    .max(15, { message: "Le numéro de téléphone ne peut pas dépasser 15 chiffres" })
    .regex(/^[0-9+\s()-]+$/, { message: "Format de numéro invalide" }),
});

type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

interface CouponItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface DeliveryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DeliveryFormValues) => void;
  total: number;
  items?: CouponItem[];
}

const DeliveryFormModal = ({ isOpen, onClose, onSubmit, total, items = [] }: DeliveryFormModalProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      city: '',
      address: '',
      phone: profile?.phone || '',
    },
  });

  const selectedCity = form.watch('city');
  const isFreeDelivery = FREE_DELIVERY_CITIES.includes(selectedCity);
  const walletBalance = profile?.wallet_balance || 0;
  const hasEnoughBalance = walletBalance >= total;

  const handleSubmit = async (data: DeliveryFormValues) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour effectuer un achat",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!hasEnoughBalance) {
      toast({
        title: "Solde insuffisant",
        description: `Votre solde est de ${walletBalance.toLocaleString()} F. Rechargez votre portefeuille.`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data: orderData, error } = await supabase.functions.invoke('create-order', {
        body: {
          user_id: user.id,
          product_id: items.length === 1 ? items[0].id : null,
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          total_amount: total,
          city: data.city,
          delivery_address: data.address,
          whatsapp_number: data.phone
        }
      });

      if (error) {
        console.error('Order error:', error);
        toast({
          title: "Erreur",
          description: "Impossible de créer la commande. Veuillez réessayer.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      if (orderData.error) {
        toast({
          title: "Erreur",
          description: orderData.error,
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }

      // Refresh profile to update wallet balance
      await refreshProfile();

      toast({
        title: "Commande confirmée !",
        description: "Votre commande a été créée avec succès",
      });

      onSubmit(data);
      form.reset();
      setIsProcessing(false);

    } catch (err) {
      console.error('Order error:', err);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      form.reset();
      onClose();
    }
  };

  const handleRecharge = () => {
    handleClose();
    navigate('/recharge');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-jinbao-red" />
            Informations de livraison
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Remplissez les informations de livraison pour finaliser votre commande
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {/* Total and Wallet Balance */}
          <div className="space-y-3 mb-4">
            <div className="bg-jinbao-red/10 border border-jinbao-red/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Montant total</p>
              <p className="text-2xl font-bold text-jinbao-red">{total.toLocaleString()} F</p>
            </div>

            <div className={`rounded-lg p-4 border ${
              hasEnoughBalance 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-destructive/10 border-destructive/20'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className={`h-5 w-5 ${hasEnoughBalance ? 'text-green-500' : 'text-destructive'}`} />
                  <span className="text-sm text-muted-foreground">Solde portefeuille</span>
                </div>
                <span className={`font-bold ${hasEnoughBalance ? 'text-green-500' : 'text-destructive'}`}>
                  {walletBalance.toLocaleString()} F
                </span>
              </div>
              {!hasEnoughBalance && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-destructive text-sm mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Solde insuffisant. Il vous manque {(total - walletBalance).toLocaleString()} F</span>
                  </div>
                  <Button 
                    onClick={handleRecharge}
                    className="w-full bg-jinbao-red hover:bg-jinbao-red/90 text-white"
                    size="sm"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Recharger mon portefeuille
                  </Button>
                </div>
              )}
            </div>
          </div>

          {selectedCity && (
            <div className={`rounded-lg p-3 mb-4 border ${
              isFreeDelivery 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-orange-500/10 border-orange-500/20'
            }`}>
              <p className="text-sm font-medium">
                {isFreeDelivery ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Livraison gratuite pour {selectedCity}
                  </span>
                ) : (
                  <span className="text-orange-600 dark:text-orange-400">
                    ℹ️ Vous serez contacté via WhatsApp pour convenir des frais de livraison
                  </span>
                )}
              </p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Ville de livraison</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Douala, Yaoundé, Koutaba..."
                        className="bg-background border-input text-foreground"
                        disabled={isProcessing}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Livraison gratuite: Douala, Yaoundé, Koutaba, Foumban, Foumbot
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        disabled={isProcessing}
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
                          disabled={isProcessing}
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
                  disabled={isProcessing}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-jinbao-red text-white hover:bg-jinbao-red/90"
                  disabled={isProcessing || !hasEnoughBalance}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Payer {total.toLocaleString()} F
                    </>
                  )}
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
