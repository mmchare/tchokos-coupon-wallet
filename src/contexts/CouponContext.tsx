/**
 * MODIFICATION: Context global pour gérer le coupon
 *
 * Ce fichier crée un système de gestion d'état partagé pour le coupon.
 * Il permet à toutes les pages (Home, ProductDetail, etc.) d'accéder
 * et de modifier le même coupon.
 *
 * Fonctionnalités:
 * - addToCoupon: Ajouter un produit au coupon
 * - removeFromCoupon: Supprimer un produit du coupon
 * - updateQuantity: Modifier la quantité d'un produit
 * - clearCoupon: Vider le coupon
 * - loadCoupon: Charger un coupon depuis un code
 *
 * Utilise localStorage pour sauvegarder le coupon même après fermeture du navigateur
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CouponItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CouponContextType {
  couponItems: CouponItem[];
  addToCoupon: (item: Omit<CouponItem, 'quantity'>) => void;
  removeFromCoupon: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCoupon: () => void;
  loadCoupon: (items: CouponItem[]) => void;
}

const CouponContext = createContext<CouponContextType | undefined>(undefined);

// Hook personnalisé pour utiliser le contexte du coupon
export const useCoupon = () => {
  const context = useContext(CouponContext);
  if (!context) {
    throw new Error('useCoupon must be used within a CouponProvider');
  }
  return context;
};

export const CouponProvider = ({ children }: { children: ReactNode }) => {
  // Initialiser le coupon depuis localStorage au démarrage
  const [couponItems, setCouponItems] = useState<CouponItem[]>(() => {
    const saved = localStorage.getItem('dina_coupon');
    return saved ? JSON.parse(saved) : [];
  });

  // Sauvegarder dans localStorage à chaque modification du coupon
  useEffect(() => {
    localStorage.setItem('dina_coupon', JSON.stringify(couponItems));
  }, [couponItems]);

  // Ajouter un produit au coupon (augmente la quantité si déjà présent)
  const addToCoupon = (item: Omit<CouponItem, 'quantity'>) => {
    setCouponItems(prev => {
      const existingItem = prev.find(i => i.id === item.id);
      if (existingItem) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  // Supprimer un produit du coupon
  const removeFromCoupon = (productId: string) => {
    setCouponItems(prev => prev.filter(item => item.id !== productId));
  };

  // Mettre à jour la quantité d'un produit
  const updateQuantity = (productId: string, quantity: number) => {
    setCouponItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  // Vider complètement le coupon
  const clearCoupon = () => {
    setCouponItems([]);
  };

  // Charger un coupon depuis un code (fusionne avec les articles existants)
  const loadCoupon = (items: CouponItem[]) => {
    const existingIds = couponItems.map(item => item.id);
    const newItems = items.filter(item => !existingIds.includes(item.id));
    const updatedExisting = couponItems.map(existingItem => {
      const matchingItem = items.find(item => item.id === existingItem.id);
      return matchingItem
        ? { ...existingItem, quantity: existingItem.quantity + matchingItem.quantity }
        : existingItem;
    });

    setCouponItems([...updatedExisting, ...newItems]);
  };

  return (
    <CouponContext.Provider
      value={{
        couponItems,
        addToCoupon,
        removeFromCoupon,
        updateQuantity,
        clearCoupon,
        loadCoupon,
      }}
    >
      {children}
    </CouponContext.Provider>
  );
};
