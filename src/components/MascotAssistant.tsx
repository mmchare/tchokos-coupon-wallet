/**
 * JinBao Mascot Assistant - First-time onboarding and AI chat launcher
 * Shows onboarding only once on first visit, then provides chat access
 */

import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import JinBaoOnboarding from './JinBaoOnboarding';
import JinBaoChat from './JinBaoChat';
import mascotImage from '@/assets/jinbao-mascot.jpg';

const ONBOARDING_KEY = 'jinbao_onboarding_completed';

const MascotAssistant = () => {
  const { t } = useTranslation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Check if user has completed onboarding
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompletedOnboarding) {
      // Show onboarding after a short delay for first-time users
      const timeout = setTimeout(() => {
        setShowOnboarding(true);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const handleOpenChat = () => {
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  // Don't show the floating button if onboarding is active
  if (showOnboarding) {
    return <JinBaoOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      {/* Chat Window */}
      <JinBaoChat isOpen={showChat} onClose={handleCloseChat} />

      {/* Floating Mascot Button - Only show when chat is closed */}
      {!showChat && isVisible && (
        <div className="fixed bottom-20 right-4 z-40">
          <button
            onClick={handleOpenChat}
            className="group relative"
            aria-label={t('chat.openChat')}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-vibrant-red/40 to-tech-blue/40 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
            
            {/* Mascot container */}
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-vibrant-red/50 shadow-lg hover:shadow-vibrant-red/30 hover:shadow-xl transition-all duration-300 hover:scale-110">
              <img
                src={mascotImage}
                alt="JinBao Mascot"
                className="w-full h-full object-cover object-top scale-125"
              />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-vibrant-red/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Chat badge */}
            <div className="absolute -top-1 -right-1 bg-vibrant-red text-white rounded-full p-1.5 shadow-md animate-bounce">
              <MessageCircle className="h-3 w-3" />
            </div>
          </button>
        </div>
      )}
    </>
  );
};

export default MascotAssistant;
