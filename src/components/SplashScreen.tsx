import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade animation
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="splash-container">
      <div className="animate-bounce-in">
        <h1 className="tchokos-logo">TCHOKOS</h1>
        <div className="mt-4 h-1 w-24 mx-auto bg-gradient-to-r from-accent to-red-600 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default SplashScreen;