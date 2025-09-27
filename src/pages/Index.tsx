import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';
import Home from './Home';

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  const handleSplashComplete = () => {
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
