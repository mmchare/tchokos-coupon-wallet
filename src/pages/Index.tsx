/**
 * MODIFICATION: Gestion du splash screen avec sessionStorage
 *
 * Lignes 7-10: Initialisation de showSplash en vérifiant sessionStorage
 *   - Si 'hasSeenSplash' existe, le splash ne s'affiche pas
 *   - Sinon, il s'affiche une seule fois
 *
 * Lignes 13-16: Sauvegarder dans sessionStorage quand le splash est terminé
 *   - Empêche le splash de se réafficher lors de la navigation avec le bouton retour
 *   - Le splash ne se réaffichera qu'après fermeture complète de l'onglet
 * 
 * MODIFICATION: Accès public aux produits sans connexion (style Xianyu)
 *   - Les utilisateurs peuvent naviguer et voir les produits sans être connectés
 *   - La connexion est requise uniquement pour : achat, favoris, panier, profil
 */

import { useState } from 'react';
import SplashScreen from '@/components/SplashScreen';
import Home from './Home';

const Index = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    return !hasSeenSplash;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Allow access to Home without authentication (like Xianyu)
  // Authentication is required only for specific actions (purchase, favorites, etc.)
  return <Home />;
};

export default Index;
