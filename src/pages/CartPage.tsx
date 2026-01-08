/**
 * JINBAO SMART MARKET - Shopping Cart Page
 * Complete cart management with checkout and payment processing
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Smartphone,
  Building2,
  MapPin,
  Phone,
  User,
  Mail,
  Clock,
  Truck,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

const CartPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getShippingCost,
    getFinalTotal,
  } = useCart();

  const [step, setStep] = useState<"cart" | "checkout" | "payment">("cart");
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    neighborhood: "",
    notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<
    "momo" | "om" | "virement"
  >("momo");
  const [selectedShipping, setSelectedShipping] = useState<
    "express" | "economical"
  >("express");
  const [isProcessing, setIsProcessing] = useState(false);

  const shippingOptions = [
    {
      type: "express" as const,
      name: "Express (7-10 jours)",
      price: 20000,
      description: "Livraison rapide Chine → Douala → Votre ville",
      icon: <Truck className="h-5 w-5 text-jinbao-blue" />,
    },
    {
      type: "economical" as const,
      name: "Économique (10-15 jours)",
      price: 15000,
      description: "Livraison économique, ideal pour gros volumes",
      icon: <Truck className="h-5 w-5 text-jinbao-green" />,
    },
  ];

  const paymentMethods = [
    {
      id: "momo" as const,
      name: "Mobile Money (MoMo)",
      description: "Paiement via Orange Money ou MTN MoMo",
      icon: <Smartphone className="h-6 w-6 text-jinbao-orange" />,
      fee: 0,
    },
    {
      id: "om" as const,
      name: "Orange Money (OM)",
      description: "Paiement via Orange Money",
      icon: <Smartphone className="h-6 w-6 text-jinbao-orange" />,
      fee: 0,
    },
    {
      id: "virement" as const,
      name: "Virement Bancaire",
      description: "Virement direct sur compte JinBao",
      icon: <Building2 className="h-6 w-6 text-jinbao-blue" />,
      fee: 500,
    },
  ];

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      toast({
        title: "Produit supprimé",
        description: "Le produit a été retiré du panier",
      });
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);
    toast({
      title: "Produit supprimé",
      description: "Le produit a été retiré du panier",
    });
  };

  const handleClearCart = () => {
    clearCart();
    toast({
      title: "Panier vidé",
      description: "Tous les produits ont été retirés du panier",
    });
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Panier vide",
        description: "Ajoutez des produits avant de passer commande",
        variant: "destructive",
      });
      return;
    }
    setStep("checkout");
  };

  const handlePayment = () => {
    // Validation
    if (
      !customerInfo.firstName ||
      !customerInfo.lastName ||
      !customerInfo.phone ||
      !customerInfo.city ||
      !customerInfo.address
    ) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setStep("payment");
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);

    try {
      // Simulate order processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const orderId = `JB${Date.now()}`;

      toast({
        title: "Commande confirmée !",
        description: `Votre commande ${orderId} a été enregistrée. Vous recevrez un SMS de confirmation.`,
      });

      clearCart();
      navigate(`/orders`);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de traiter la commande. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCartStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          Panier ({cartItems.length})
        </h2>
        {cartItems.length > 0 && (
          <Button
            variant="outline"
            onClick={handleClearCart}
            className="text-jinbao-red border-jinbao-red hover:bg-jinbao-red hover:text-white"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Vider le panier
          </Button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Votre panier est vide
            </h3>
            <p className="text-muted-foreground text-center mb-6">
              Découvrez nos produits premium directement de Chine
            </p>
            <Button
              onClick={() => navigate("/")}
              className="jinbao-button-primary"
            >
              Découvrir les produits
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={`${item.id}-${JSON.stringify(item.variants)}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">
                        {item.name}
                      </h3>

                      {/* Variants */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.variants?.color && (
                          <Badge variant="outline" className="text-xs">
                            {item.variants.color}
                          </Badge>
                        )}
                        {item.variants?.storage && (
                          <Badge variant="outline" className="text-xs">
                            {item.variants.storage}
                          </Badge>
                        )}
                        {item.variants?.ram && (
                          <Badge variant="outline" className="text-xs">
                            {item.variants.ram}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="h-8 w-8"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity + 1)
                            }
                            className="h-8 w-8"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-jinbao-red">
                            {(item.price * item.quantity).toLocaleString()} F
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.price.toLocaleString()} F × {item.quantity}
                          </div>
                        </div>
                      </div>

                      {/* Pre-order indicator */}
                      {item.isPreOrder && (
                        <div className="mt-2 flex items-center gap-1 text-jinbao-orange text-sm">
                          <Clock className="h-4 w-4" />
                          <span>Précommande - Délai: 15-20 jours</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-muted-foreground hover:text-jinbao-red"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-foreground">Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total:</span>
                    <span>{getTotalPrice().toLocaleString()} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Livraison:</span>
                    <span>{getShippingCost().toLocaleString()} F</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-jinbao-red">
                      {getFinalTotal().toLocaleString()} F
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="jinbao-button-primary w-full"
                  size="lg"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Passer commande
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  <p>
                    Livraison: Chine → Douala →{" "}
                    {customerInfo.city || "Votre ville"}
                  </p>
                  <p>Délai: 7-15 jours selon option choisie</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );

  const renderCheckoutStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => setStep("cart")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au panier
        </Button>
        <h2 className="text-2xl font-bold text-foreground">
          Informations de livraison
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-jinbao-blue" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={customerInfo.firstName}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    placeholder="Votre prénom"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={customerInfo.lastName}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="6XX XXX XXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-jinbao-blue" />
                Adresse de livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="city">Ville *</Label>
                <Select
                  value={customerInfo.city}
                  onValueChange={(value) =>
                    setCustomerInfo((prev) => ({ ...prev, city: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez votre ville" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="douala">Douala</SelectItem>
                    <SelectItem value="yaounde">Yaoundé</SelectItem>
                    <SelectItem value="bafoussam">Bafoussam</SelectItem>
                    <SelectItem value="buea">Buea</SelectItem>
                    <SelectItem value="kribi">Kribi</SelectItem>
                    <SelectItem value="garoua">Garoua</SelectItem>
                    <SelectItem value="ngaoundere">Ngaoundéré</SelectItem>
                    <SelectItem value="autre">Autre ville</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="address">Adresse complète *</Label>
                <Textarea
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Quartier, rue, numéro de maison..."
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="neighborhood">Quartier</Label>
                <Input
                  id="neighborhood"
                  value={customerInfo.neighborhood}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      neighborhood: e.target.value,
                    }))
                  }
                  placeholder="Votre quartier"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes de livraison</Label>
                <Textarea
                  id="notes"
                  value={customerInfo.notes}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Instructions spéciales pour la livraison..."
                  className="min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Shipping Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-jinbao-blue" />
                Mode de livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {shippingOptions.map((option) => (
                <div
                  key={option.type}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedShipping === option.type
                      ? "border-jinbao-blue bg-jinbao-blue/5"
                      : "border-border hover:border-jinbao-silver"
                  }`}
                  onClick={() => setSelectedShipping(option.type)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        +{option.price.toLocaleString()} F
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Récapitulatif de commande</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={`${item.id}-${JSON.stringify(item.variants)}`}
                    className="flex gap-3"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Qté: {item.quantity} × {item.price.toLocaleString()} F
                      </div>
                    </div>
                    <div className="font-medium text-sm">
                      {(item.price * item.quantity).toLocaleString()} F
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Costs */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total:</span>
                  <span>{getTotalPrice().toLocaleString()} F</span>
                </div>
                <div className="flex justify-between">
                  <span>Livraison:</span>
                  <span>
                    {shippingOptions
                      .find((o) => o.type === selectedShipping)
                      ?.price.toLocaleString()}{" "}
                    F
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-jinbao-red">
                    {(
                      getTotalPrice() +
                      shippingOptions.find((o) => o.type === selectedShipping)!
                        .price
                    ).toLocaleString()}{" "}
                    F
                  </span>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                className="jinbao-button-primary w-full"
                size="lg"
              >
                Continuer vers le paiement
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => setStep("checkout")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h2 className="text-2xl font-bold text-foreground">Paiement</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-jinbao-blue" />
                Mode de paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === method.id
                      ? "border-jinbao-blue bg-jinbao-blue/5"
                      : "border-border hover:border-jinbao-silver"
                  }`}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <div className="flex items-center gap-3">
                    {method.icon}
                    <div className="flex-1">
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {method.description}
                      </div>
                    </div>
                    {method.fee > 0 && (
                      <div className="text-sm text-muted-foreground">
                        +{method.fee} F
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions de paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentMethod === "momo" && (
                <div className="space-y-3">
                  <div className="p-3 bg-jinbao-blue/10 rounded-lg">
                    <h4 className="font-medium text-jinbao-blue mb-2">
                      Paiement MoMo
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Envoyez le montant total au numéro suivant:
                    </p>
                    <div className="font-mono text-lg font-bold">
                      +237 690 000 000
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Nom du bénéficiaire: JinBao Smart Market
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "om" && (
                <div className="space-y-3">
                  <div className="p-3 bg-jinbao-orange/10 rounded-lg">
                    <h4 className="font-medium text-jinbao-orange mb-2">
                      Paiement Orange Money
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Envoyez le montant total au numéro suivant:
                    </p>
                    <div className="font-mono text-lg font-bold">
                      +237 690 000 001
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Nom du bénéficiaire: JinBao Smart Market
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "virement" && (
                <div className="space-y-3">
                  <div className="p-3 bg-jinbao-green/10 rounded-lg">
                    <h4 className="font-medium text-jinbao-green mb-2">
                      Virement Bancaire
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Banque:</strong> BGFIBank Cameroun
                      </div>
                      <div>
                        <strong>Numéro de compte:</strong> 100 123 456 789
                      </div>
                      <div>
                        <strong>Clé:</strong> 01
                      </div>
                      <div>
                        <strong>Nom:</strong> JinBao Smart Market SARL
                      </div>
                      <div>
                        <strong>Montant:</strong>{" "}
                        {(
                          getTotalPrice() +
                          shippingOptions.find(
                            (o) => o.type === selectedShipping
                          )!.price +
                          500
                        ).toLocaleString()}{" "}
                        F
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Après le paiement, envoyez une
                  capture d'écran ou le reçu au +237 690 000 000 via WhatsApp
                  pour confirmer votre commande.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Récapitulatif final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Info */}
              <div className="space-y-2">
                <h4 className="font-medium">Client</h4>
                <div className="text-sm text-muted-foreground">
                  {customerInfo.firstName} {customerInfo.lastName}
                  <br />
                  {customerInfo.phone}
                  <br />
                  {customerInfo.city}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="space-y-2">
                <h4 className="font-medium">Livraison</h4>
                <div className="text-sm text-muted-foreground">
                  {
                    shippingOptions.find((o) => o.type === selectedShipping)
                      ?.name
                  }
                  <br />
                  {customerInfo.address}
                </div>
              </div>

              <Separator />

              {/* Costs */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total:</span>
                  <span>{getTotalPrice().toLocaleString()} F</span>
                </div>
                <div className="flex justify-between">
                  <span>Livraison:</span>
                  <span>
                    {shippingOptions
                      .find((o) => o.type === selectedShipping)
                      ?.price.toLocaleString()}{" "}
                    F
                  </span>
                </div>
                {paymentMethods.find((m) => m.id === paymentMethod)?.fee! >
                  0 && (
                  <div className="flex justify-between">
                    <span>Frais de paiement:</span>
                    <span>
                      {paymentMethods
                        .find((m) => m.id === paymentMethod)
                        ?.fee.toLocaleString()}{" "}
                      F
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total à payer:</span>
                  <span className="text-jinbao-red">
                    {(
                      getTotalPrice() +
                      shippingOptions.find((o) => o.type === selectedShipping)!
                        .price +
                      (paymentMethods.find((m) => m.id === paymentMethod)
                        ?.fee || 0)
                    ).toLocaleString()}{" "}
                    F
                  </span>
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                className="jinbao-button-primary w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Confirmer la commande
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                En confirmant, vous acceptez nos conditions de vente et
                politique de retour.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

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
              <CreditCard className="h-6 w-6 text-jinbao-red" />
              <h1 className="text-2xl font-bold text-foreground">
                {step === "cart"
                  ? "Panier"
                  : step === "checkout"
                  ? "Commande"
                  : "Paiement"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {step === "cart" && renderCartStep()}
        {step === "checkout" && renderCheckoutStep()}
        {step === "payment" && renderPaymentStep()}
      </main>
    </div>
  );
};

export default CartPage;
