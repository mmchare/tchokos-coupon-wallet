import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const { t } = useTranslation();

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
        <h1 className="jinbao-logo text-5xl sm:text-6xl mb-3 text-jinbao-red-new">JinBao</h1>
        <p className="text-white/90 text-base sm:text-lg font-semibold tracking-widest uppercase">
          {t('splash.tagline')}
        </p>
        <p className="text-white/60 text-xs sm:text-sm mt-2">
          {t('splash.subtitle')}
        </p>
        <div className="mt-6 h-1 w-32 mx-auto bg-gradient-to-r from-jinbao-red to-jinbao-blue rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default SplashScreen;