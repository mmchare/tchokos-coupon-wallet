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

export const useCoupon = () => {
  const context = useContext(CouponContext);
  if (!context) {
    throw new Error('useCoupon must be used within a CouponProvider');
  }
  return context;
};

export const CouponProvider = ({ children }: { children: ReactNode }) => {
  const [couponItems, setCouponItems] = useState<CouponItem[]>(() => {
    const saved = localStorage.getItem('tchokos_coupon');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('tchokos_coupon', JSON.stringify(couponItems));
  }, [couponItems]);

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

  const removeFromCoupon = (productId: string) => {
    setCouponItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCouponItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCoupon = () => {
    setCouponItems([]);
  };

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
