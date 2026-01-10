/**
 * Hook pour gérer les produits hors ligne
 * Stocke les produits récemment consultés dans IndexedDB pour accès sans internet
 */

import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'jinbao-offline';
const DB_VERSION = 1;
const PRODUCTS_STORE = 'products';
const MAX_CACHED_PRODUCTS = 50;

interface OfflineProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
  rating: number;
  isAuction?: boolean;
  cachedAt: number;
}

// Open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        const store = db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
  });
};

export const useOfflineProducts = () => {
  const [offlineProducts, setOfflineProducts] = useState<OfflineProduct[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDBReady, setIsDBReady] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached products on mount
  useEffect(() => {
    const loadCachedProducts = async () => {
      try {
        const db = await openDB();
        setIsDBReady(true);
        
        const transaction = db.transaction(PRODUCTS_STORE, 'readonly');
        const store = transaction.objectStore(PRODUCTS_STORE);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const products = request.result as OfflineProduct[];
          // Sort by most recently cached
          products.sort((a, b) => b.cachedAt - a.cachedAt);
          setOfflineProducts(products);
        };
        
        transaction.oncomplete = () => db.close();
      } catch (error) {
        console.error('Error loading cached products:', error);
      }
    };
    
    loadCachedProducts();
  }, []);

  // Cache a product for offline access
  const cacheProduct = useCallback(async (product: Omit<OfflineProduct, 'cachedAt'>) => {
    if (!isDBReady) return;
    
    try {
      const db = await openDB();
      const transaction = db.transaction(PRODUCTS_STORE, 'readwrite');
      const store = transaction.objectStore(PRODUCTS_STORE);
      
      const productToCache: OfflineProduct = {
        ...product,
        cachedAt: Date.now(),
      };
      
      // Add or update product
      store.put(productToCache);
      
      // Cleanup old products if we exceed the limit
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        if (countRequest.result > MAX_CACHED_PRODUCTS) {
          const index = store.index('cachedAt');
          const cursorRequest = index.openCursor();
          let toDelete = countRequest.result - MAX_CACHED_PRODUCTS;
          
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor && toDelete > 0) {
              store.delete(cursor.primaryKey);
              toDelete--;
              cursor.continue();
            }
          };
        }
      };
      
      transaction.oncomplete = () => {
        db.close();
        // Update local state
        setOfflineProducts(prev => {
          const filtered = prev.filter(p => p.id !== product.id);
          return [productToCache, ...filtered].slice(0, MAX_CACHED_PRODUCTS);
        });
      };
    } catch (error) {
      console.error('Error caching product:', error);
    }
  }, [isDBReady]);

  // Cache multiple products at once
  const cacheProducts = useCallback(async (products: Omit<OfflineProduct, 'cachedAt'>[]) => {
    if (!isDBReady || products.length === 0) return;
    
    try {
      const db = await openDB();
      const transaction = db.transaction(PRODUCTS_STORE, 'readwrite');
      const store = transaction.objectStore(PRODUCTS_STORE);
      
      const productsToCache: OfflineProduct[] = products.map(p => ({
        ...p,
        cachedAt: Date.now(),
      }));
      
      // Add all products
      productsToCache.forEach(product => {
        store.put(product);
      });
      
      transaction.oncomplete = () => {
        db.close();
        // Reload products after batch update
        setOfflineProducts(prev => {
          const existingIds = new Set(productsToCache.map(p => p.id));
          const filtered = prev.filter(p => !existingIds.has(p.id));
          return [...productsToCache, ...filtered].slice(0, MAX_CACHED_PRODUCTS);
        });
      };
    } catch (error) {
      console.error('Error caching products:', error);
    }
  }, [isDBReady]);

  // Clear all cached products
  const clearCache = useCallback(async () => {
    if (!isDBReady) return;
    
    try {
      const db = await openDB();
      const transaction = db.transaction(PRODUCTS_STORE, 'readwrite');
      const store = transaction.objectStore(PRODUCTS_STORE);
      store.clear();
      
      transaction.oncomplete = () => {
        db.close();
        setOfflineProducts([]);
      };
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [isDBReady]);

  return {
    offlineProducts,
    isOnline,
    isDBReady,
    cacheProduct,
    cacheProducts,
    clearCache,
  };
};
