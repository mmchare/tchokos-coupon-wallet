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
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';
import Home from './Home';

const Index = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    return !hasSeenSplash;
  });
  const navigate = useNavigate();

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  // In a real app, you would check authentication status here
  const isAuthenticated = true; // For demo purposes

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (!isAuthenticated) {
    navigate('/auth');
    return null;
  }

  return <Home />;
};

export default Index;
