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
        {/* Sceau chinois carré */}
        <div className="w-20 h-20 mx-auto mb-4 border-2 border-jinbao-gold rounded-sm flex items-center justify-center bg-jinbao-gold/10">
          <span className="text-jinbao-gold text-3xl font-black" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>金</span>
        </div>
        <h1 className="jinbao-logo text-5xl sm:text-6xl mb-1">
          <span className="text-jinbao-gold">Jin</span><span>Bao</span>
        </h1>
        <p className="text-white/70 text-[10px] sm:text-xs font-semibold tracking-[0.3em] uppercase">
          Smart Market
        </p>
        <p className="text-white/40 text-xs sm:text-sm mt-2">
          {t('splash.subtitle')}
        </p>
        <div className="mt-6 h-1 w-32 mx-auto bg-gradient-to-r from-jinbao-red via-jinbao-gold to-jinbao-blue rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default SplashScreen;