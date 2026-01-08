/**
 * JINBAO SMART MARKET - Shopping Cart Context
 * Advanced e-commerce cart system with variants support
 * Designed for Chinese e-commerce best practices
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variants?: {
    color?: string;
    storage?: string;
    ram?: string;
    [key: string]: string | undefined;
  };
  condition: "Neuf" | "Reconditionné" | "Occasion";
  isPreOrder?: boolean;
  shippingInfo?: {
    type: "express" | "economical";
    estimatedDays: string;
    cost: number;
  };
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (productId: string, variant?: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variant?: string
  ) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getShippingCost: () => number;
  getFinalTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Hook personnalisé pour utiliser le contexte du panier
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  // Initialiser le panier depuis localStorage au démarrage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("jinbao_cart");
    return saved ? JSON.parse(saved) : [];
  });

  // Sauvegarder dans localStorage à chaque modification du panier
  useEffect(() => {
    localStorage.setItem("jinbao_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // Ajouter un produit au panier (augmente la quantité si déjà présent avec les mêmes variantes)
  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCartItems((prev) => {
      const variantKey = JSON.stringify(item.variants || {});
      const existingItem = prev.find(
        (i) =>
          i.id === item.id && JSON.stringify(i.variants || {}) === variantKey
      );

      if (existingItem) {
        return prev.map((i) =>
          i.id === item.id && JSON.stringify(i.variants || {}) === variantKey
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  // Supprimer un produit du panier
  const removeFromCart = (productId: string, variant?: string) => {
    setCartItems((prev) => {
      if (variant) {
        return prev.filter(
          (item) =>
            !(
              item.id === productId &&
              JSON.stringify(item.variants || {}) === variant
            )
        );
      }
      return prev.filter((item) => item.id !== productId);
    });
  };

  // Mettre à jour la quantité d'un produit
  const updateQuantity = (
    productId: string,
    quantity: number,
    variant?: string
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, variant);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => {
        if (variant) {
          return item.id === productId &&
            JSON.stringify(item.variants || {}) === variant
            ? { ...item, quantity }
            : item;
        }
        return item.id === productId ? { ...item, quantity } : item;
      })
    );
  };

  // Vider complètement le panier
  const clearCart = () => {
    setCartItems([]);
  };

  // Obtenir le nombre total d'articles
  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Obtenir le prix total
  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  // Calculer les frais de livraison (exemple pour le Cameroun)
  const getShippingCost = () => {
    const hasExpressShipping = cartItems.some(
      (item) => item.shippingInfo?.type === "express"
    );
    const hasRegularShipping = cartItems.some(
      (item) => item.shippingInfo?.type === "economical"
    );

    if (hasExpressShipping && hasRegularShipping) {
      // Mix d'express et économique - prendre le plus cher
      return 25000; // FCFA
    } else if (hasExpressShipping) {
      return 20000; // FCFA
    } else if (hasRegularShipping) {
      return 15000; // FCFA
    }
    return 12000; // FCFA par défaut
  };

  // Obtenir le total final avec livraison
  const getFinalTotal = () => {
    return getTotalPrice() + getShippingCost();
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        getShippingCost,
        getFinalTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
