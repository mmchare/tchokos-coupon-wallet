import React, { useState, useMemo } from 'react';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { MapPin, Phone, Wallet, Loader2, AlertCircle, Home, Briefcase, MapPinned, Check, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDeliveryAddresses, DeliveryAddress } from '@/hooks/useDeliveryAddresses';
import { useIsMobile } from '@/hooks/use-mobile';

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
  productCategory?: string | null;
}

const CUSTOMS_TAX_RATE = 0.333; // 33.3%
const PHONE_CATEGORIES = ['téléphones', 'phones', 'smartphones', 'tablettes', 'tablets', 'électronique', 'electronics'];

const LABEL_ICONS: Record<string, React.ReactNode> = {
  'Maison': <Home className="h-4 w-4" />,
  'Bureau': <Briefcase className="h-4 w-4" />,
  'Autre': <MapPinned className="h-4 w-4" />,
};

const DeliveryFormModal = ({ isOpen, onClose, onSubmit, total, items = [], productCategory }: DeliveryFormModalProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [includeCustomsTax, setIncludeCustomsTax] = useState(false);
  const isMobile = useIsMobile();

  const isPhoneProduct = useMemo(() => {
    if (!productCategory) return false;
    return PHONE_CATEGORIES.some(cat => 
      productCategory.toLowerCase().includes(cat.toLowerCase())
    );
  }, [productCategory]);

  const customsTaxAmount = Math.round(total * CUSTOMS_TAX_RATE);
  const finalTotal = includeCustomsTax ? total + customsTaxAmount : total;
  
  const { addresses, isLoading: isLoadingAddresses } = useDeliveryAddresses();

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      city: '',
      address: '',
      phone: '',
    },
  });

  // Auto-select default address when modal opens
  React.useEffect(() => {
    if (isOpen && addresses.length > 0) {
      const defaultAddress = addresses.find(a => a.is_default) || addresses[0];
      if (defaultAddress && !selectedAddressId) {
        setSelectedAddressId(defaultAddress.id);
        form.setValue('city', defaultAddress.city);
        form.setValue('address', defaultAddress.address);
        form.setValue('phone', defaultAddress.phone);
      }
    } else if (isOpen && addresses.length === 0) {
      setShowManualForm(true);
      if (profile?.phone) {
        form.setValue('phone', profile.phone);
      }
    }
  }, [isOpen, addresses, profile?.phone, form, selectedAddressId]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedAddressId(null);
      setShowManualForm(false);
    }
  }, [isOpen]);

  const handleSelectAddress = (address: DeliveryAddress) => {
    setSelectedAddressId(address.id);
    setShowManualForm(false);
    form.setValue('city', address.city);
    form.setValue('address', address.address);
    form.setValue('phone', address.phone);
  };

  const handleNewAddress = () => {
    setSelectedAddressId(null);
    setShowManualForm(true);
    form.reset({
      city: '',
      address: '',
      phone: profile?.phone || '',
    });
  };

  const selectedCity = form.watch('city');
  const isFreeDelivery = FREE_DELIVERY_CITIES.includes(selectedCity);
  const walletBalance = profile?.wallet_balance || 0;
  const hasEnoughBalance = walletBalance >= finalTotal;

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
          total_amount: finalTotal,
          includes_customs_tax: includeCustomsTax,
          customs_tax_amount: includeCustomsTax ? customsTaxAmount : 0,
          city: data.city,
          delivery_address: data.address,
          whatsapp_number: data.phone
        }
      });

      if (error) {
        console.error('Order error:', error);
        // Try to extract the actual error message from the edge function response
        let errorMessage = "Impossible de créer la commande. Veuillez réessayer.";
        try {
          // FunctionsHttpError contains the response body in context
          const errorBody = error.context ? await error.context.json() : null;
          if (errorBody?.error) {
            errorMessage = errorBody.error;
            if (errorBody.details && Array.isArray(errorBody.details)) {
              errorMessage += ': ' + errorBody.details.join(', ');
            }
          }
        } catch (e) {
          // If parsing fails, try the message property
          if (error.message && !error.message.includes('FunctionsHttpError')) {
            errorMessage = error.message;
          }
        }
        toast({
          title: "Erreur",
          description: errorMessage,
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

  const hasAddresses = addresses.length > 0;

  // Content shared between Dialog and Sheet
  const formContent = (
    <div className="space-y-3 overflow-y-auto flex-1">
      {/* Total and Wallet Balance */}
      <div className="space-y-2">
        <div className="bg-jinbao-red/10 border border-jinbao-red/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Montant produit</p>
          <p className="text-xl font-bold text-jinbao-red">{total.toLocaleString()} F</p>
        </div>

        {/* Customs Tax Checkbox for phone products */}
        {isPhoneProduct && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="customs-tax"
                checked={includeCustomsTax}
                onCheckedChange={(checked) => setIncludeCustomsTax(checked === true)}
                className="mt-0.5"
                disabled={isProcessing}
              />
              <label htmlFor="customs-tax" className="cursor-pointer flex-1">
                <p className="text-sm font-medium text-foreground leading-tight">
                  Ajouter les frais de douane (+33,3%)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dédouanement officiel CAMCIS — IMEI enregistré pour utilisation au Cameroun
                </p>
              </label>
            </div>
            {includeCustomsTax && (
              <div className="bg-background/60 rounded-md p-2 text-xs space-y-1 ml-7">
                <div className="flex justify-between text-muted-foreground">
                  <span>Prix produit</span>
                  <span>{total.toLocaleString()} F</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Droits de douane (33,3%)</span>
                  <span>+{customsTaxAmount.toLocaleString()} F</span>
                </div>
                <div className="flex justify-between font-bold text-foreground border-t border-border pt-1">
                  <span>Total TTC</span>
                  <span>{finalTotal.toLocaleString()} F</span>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/customs-tax')}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline ml-7"
            >
              <Info className="h-3 w-3" />
              En savoir plus sur cette taxe
            </button>
          </div>
        )}

        {/* Updated total if tax included */}
        {includeCustomsTax && isPhoneProduct && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Montant total à payer</p>
            <p className="text-xl font-bold text-primary">{finalTotal.toLocaleString()} F</p>
          </div>
        )}

        <div className={`rounded-lg p-3 border ${
          hasEnoughBalance 
            ? 'bg-green-500/10 border-green-500/20' 
            : 'bg-destructive/10 border-destructive/20'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Wallet className={`h-4 w-4 flex-shrink-0 ${hasEnoughBalance ? 'text-green-500' : 'text-destructive'}`} />
              <span className="text-xs text-muted-foreground truncate">Solde portefeuille</span>
            </div>
            <span className={`font-bold text-sm flex-shrink-0 ${hasEnoughBalance ? 'text-green-500' : 'text-destructive'}`}>
              {walletBalance.toLocaleString()} F
            </span>
          </div>
          {!hasEnoughBalance && (
            <div className="mt-2">
              <div className="flex items-start gap-2 text-destructive text-xs mb-2">
                <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                <span>Solde insuffisant. Il vous manque {(total - walletBalance).toLocaleString()} F</span>
              </div>
              <Button 
                onClick={handleRecharge}
                className="w-full bg-jinbao-red hover:bg-jinbao-red/90 text-white text-sm"
                size="sm"
              >
                <Wallet className="h-3 w-3 mr-2" />
                Recharger mon portefeuille
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Addresses Selection */}
      {hasAddresses && !showManualForm && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Vos adresses enregistrées</p>
          <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
            {addresses.map((address) => (
              <button
                key={address.id}
                type="button"
                onClick={() => handleSelectAddress(address)}
                disabled={isProcessing}
                className={`w-full text-left p-2 rounded-lg border transition-all ${
                  selectedAddressId === address.id
                    ? 'border-jinbao-red bg-jinbao-red/10'
                    : 'border-border bg-background hover:border-jinbao-red/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${
                    selectedAddressId === address.id
                      ? 'bg-jinbao-red text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {LABEL_ICONS[address.label] || <MapPinned className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{address.label}</span>
                      {address.is_default && (
                        <span className="text-[10px] bg-jinbao-red/20 text-jinbao-red px-1.5 py-0.5 rounded-full">
                          Par défaut
                        </span>
                      )}
                      {selectedAddressId === address.id && (
                        <Check className="h-3 w-3 text-jinbao-red ml-auto flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{address.city}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{address.address}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-2.5 w-2.5" />
                      {address.phone}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleNewAddress}
            className="w-full text-sm"
            size="sm"
            disabled={isProcessing}
          >
            <MapPin className="h-3 w-3 mr-2" />
            Utiliser une nouvelle adresse
          </Button>
        </div>
      )}

      {/* Delivery info for selected address */}
      {selectedAddressId && selectedCity && !showManualForm && (
        <div className={`rounded-lg p-2 border ${
          isFreeDelivery 
            ? 'bg-green-500/10 border-green-500/20' 
            : 'bg-orange-500/10 border-orange-500/20'
        }`}>
          <p className="text-xs font-medium">
            {isFreeDelivery ? (
              <span className="text-green-600 dark:text-green-400">
                ✓ Livraison gratuite pour {selectedCity}
              </span>
            ) : (
              <span className="text-orange-600 dark:text-orange-400">
                ℹ️ Vous serez contacté via WhatsApp pour les frais de livraison
              </span>
            )}
          </p>
        </div>
      )}

      {/* Manual Form (shown when no addresses or user clicks new address) */}
      {showManualForm && (
        <>
          {hasAddresses && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowManualForm(false);
                const defaultAddress = addresses.find(a => a.is_default) || addresses[0];
                if (defaultAddress) {
                  handleSelectAddress(defaultAddress);
                }
              }}
              className="mb-2 text-muted-foreground text-xs h-8"
              size="sm"
            >
              ← Retour aux adresses
            </Button>
          )}

          {selectedCity && (
            <div className={`rounded-lg p-2 mb-3 border ${
              isFreeDelivery 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-orange-500/10 border-orange-500/20'
            }`}>
              <p className="text-xs font-medium">
                {isFreeDelivery ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Livraison gratuite pour {selectedCity}
                  </span>
                ) : (
                  <span className="text-orange-600 dark:text-orange-400">
                    ℹ️ Frais de livraison à convenir via WhatsApp
                  </span>
                )}
              </p>
            </div>
          )}

          <Form {...form}>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">Ville de livraison</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Douala, Yaoundé..."
                        className="bg-background border-input text-foreground text-sm"
                        disabled={isProcessing}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">
                      Livraison gratuite: Douala, Yaoundé, Koutaba, Foumban, Foumbot
                    </p>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">Description du lieu</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Quartier, points de repère..."
                        className="min-h-[70px] bg-background border-input text-foreground resize-none text-sm"
                        disabled={isProcessing}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">Numéro WhatsApp</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="+237 6XX XX XX XX"
                          className="pl-8 bg-background border-input text-foreground text-sm"
                          disabled={isProcessing}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </>
      )}

      {/* Submit buttons */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-3 pt-3 border-t border-border">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 text-sm h-10"
              disabled={isProcessing}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-jinbao-red text-white hover:bg-jinbao-red/90 text-sm h-10"
              disabled={isProcessing || !hasEnoughBalance || (!selectedAddressId && !showManualForm)}
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
  );

  // Header content
  const headerContent = (
    <>
      <div className="flex items-center gap-2 text-base">
        <MapPin className="h-5 w-5 text-jinbao-red" />
        Informations de livraison
      </div>
      <p className="text-muted-foreground text-sm">
        {hasAddresses 
          ? "Sélectionnez une adresse ou ajoutez-en une nouvelle"
          : "Remplissez les informations pour finaliser votre commande"
        }
      </p>
    </>
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] flex flex-col p-4 rounded-t-2xl overflow-hidden"
        >
          <SheetHeader className="pb-2 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-jinbao-red" />
              Informations de livraison
            </SheetTitle>
            <SheetDescription className="text-sm">
              {hasAddresses 
                ? "Sélectionnez une adresse ou ajoutez-en une nouvelle"
                : "Remplissez les informations pour finaliser votre commande"
              }
            </SheetDescription>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[500px] bg-card border-border max-h-[90vh] p-6 overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-foreground flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-jinbao-red" />
            Informations de livraison
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {hasAddresses 
              ? "Sélectionnez une adresse ou ajoutez-en une nouvelle"
              : "Remplissez les informations pour finaliser votre commande"
            }
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryFormModal;
