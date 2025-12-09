import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="splash-container">
      <div className="animate-bounce-in text-center">
        <h1 className="pinbaoo-logo text-5xl sm:text-6xl mb-3">DINA</h1>
        <p className="text-white/80 text-sm sm:text-base font-medium tracking-wide">
          Votre partenaire e-commerce de confiance
        </p>
        <div className="mt-6 h-1 w-32 mx-auto bg-gradient-to-r from-pinbaoo-yellow to-pinbaoo-green rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default SplashScreen;