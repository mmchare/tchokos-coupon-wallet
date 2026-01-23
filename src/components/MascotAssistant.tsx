/**
 * JinBao Mascot Assistant - Floating animated mascot with interactive features
 * Appears as a friendly helper that can bounce, wave, and provide tips
 */

import { useState, useEffect } from 'react';
import { X, MessageCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import mascotImage from '@/assets/jinbao-mascot.jpg';

const TIPS = [
  { key: 'tip1', text: '💡 Activez le mode IA pour une recherche intelligente !' },
  { key: 'tip2', text: '🔥 Découvrez nos enchères exclusives !' },
  { key: 'tip3', text: '⭐ Ajoutez vos favoris pour ne rien manquer !' },
  { key: 'tip4', text: '📦 Livraison rapide dans toute la région CEMAC !' },
  { key: 'tip5', text: '🎁 Parrainez vos amis et gagnez des bonus !' },
];

const MascotAssistant = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [isWaving, setIsWaving] = useState(false);
  const [hasSeenMascot, setHasSeenMascot] = useState(() => {
    return sessionStorage.getItem('hasSeenMascotTip') === 'true';
  });

  // Rotate tips
  useEffect(() => {
    if (isExpanded) {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % TIPS.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isExpanded]);

  // Wave animation on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 1500);
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Auto-show tip bubble for first-time visitors
  useEffect(() => {
    if (!hasSeenMascot) {
      const timeout = setTimeout(() => {
        setIsExpanded(true);
        sessionStorage.setItem('hasSeenMascotTip', 'true');
        setHasSeenMascot(true);
      }, 3500);
      return () => clearTimeout(timeout);
    }
  }, [hasSeenMascot]);

  const handleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 500);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('mascotDismissed', 'true');
  };

  // Check if mascot was dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem('mascotDismissed') === 'true') {
      setIsVisible(false);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
      {/* Tip Bubble */}
      {isExpanded && (
        <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 max-w-[260px] bg-card/95 backdrop-blur-md rounded-2xl shadow-xl border border-border p-4 relative">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute -top-2 -right-2 bg-muted hover:bg-muted/80 rounded-full p-1 transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
          
          {/* Tip content */}
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-vibrant-red flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">
              {TIPS[currentTip].text}
            </p>
          </div>
          
          {/* Tip indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {TIPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTip(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentTip ? 'bg-vibrant-red' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Arrow pointing to mascot */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-card/95 border-r border-b border-border transform rotate-45" />
        </div>
      )}

      {/* Mascot Button */}
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-vibrant-red/30 via-tech-blue/30 to-vibrant-red/30 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
        
        {/* Mascot container */}
        <button
          onClick={handleClick}
          className={`relative w-16 h-16 rounded-full overflow-hidden border-2 border-vibrant-red/50 shadow-lg hover:shadow-vibrant-red/30 hover:shadow-xl transition-all duration-300 hover:scale-110 ${
            isWaving ? 'animate-bounce' : ''
          }`}
        >
          {/* Mascot image */}
          <img
            src={mascotImage}
            alt="JinBao Mascot"
            className="w-full h-full object-cover object-top scale-125"
          />
          
          {/* Sparkle overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-vibrant-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Notification badge when collapsed */}
        {!isExpanded && (
          <div className="absolute -top-1 -right-1 bg-vibrant-red text-white rounded-full p-1 animate-pulse">
            <MessageCircle className="h-3 w-3" />
          </div>
        )}

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-1 -left-1 bg-muted hover:bg-destructive hover:text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Masquer la mascotte"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default MascotAssistant;
