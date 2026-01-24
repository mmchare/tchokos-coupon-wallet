/**
 * JinBao Onboarding - First-time user welcome screen with mascot
 * Shows platform features only once on first login
 */

import { useState, useEffect } from 'react';
import { X, Sparkles, ShoppingBag, Gift, Truck, Shield, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import mascotImage from '@/assets/jinbao-mascot.jpg';

interface JinBaoOnboardingProps {
  onComplete: () => void;
}

const FEATURES = [
  {
    icon: Sparkles,
    titleKey: 'onboarding.feature1Title',
    descKey: 'onboarding.feature1Desc',
    color: 'text-vibrant-red',
    bgColor: 'bg-vibrant-red/10'
  },
  {
    icon: ShoppingBag,
    titleKey: 'onboarding.feature2Title',
    descKey: 'onboarding.feature2Desc',
    color: 'text-tech-blue',
    bgColor: 'bg-tech-blue/10'
  },
  {
    icon: Gift,
    titleKey: 'onboarding.feature3Title',
    descKey: 'onboarding.feature3Desc',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  {
    icon: Truck,
    titleKey: 'onboarding.feature4Title',
    descKey: 'onboarding.feature4Desc',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  {
    icon: Shield,
    titleKey: 'onboarding.feature5Title',
    descKey: 'onboarding.feature5Desc',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  }
];

const JinBaoOnboarding = ({ onComplete }: JinBaoOnboardingProps) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (currentStep < FEATURES.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 150);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentFeature = FEATURES[currentStep];
  const Icon = currentFeature.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with mascot */}
        <div className="relative bg-gradient-to-br from-vibrant-red/20 via-background to-tech-blue/20 pt-8 pb-4 px-6 text-center">
          {/* Glow effect behind mascot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-vibrant-red/30 to-tech-blue/30 rounded-full blur-2xl" />
          
          {/* Mascot */}
          <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-vibrant-red/30 shadow-lg animate-bounce">
            <img
              src={mascotImage}
              alt="JinBao Mascot"
              className="w-full h-full object-cover object-top scale-125"
            />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-1">
            {t('onboarding.welcome')} <span className="text-vibrant-red">JinBao</span> ! 🎉
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('onboarding.subtitle')}
          </p>
        </div>

        {/* Feature content */}
        <div className={`p-6 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <div className={`${currentFeature.bgColor} rounded-2xl p-6 text-center mb-6`}>
            <div className={`w-16 h-16 mx-auto rounded-full ${currentFeature.bgColor} flex items-center justify-center mb-4`}>
              <Icon className={`h-8 w-8 ${currentFeature.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t(currentFeature.titleKey)}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(currentFeature.descKey)}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {FEATURES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep 
                    ? 'bg-vibrant-red w-6' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('common.previous')}
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 bg-vibrant-red hover:bg-vibrant-red/90 text-white"
            >
              {currentStep === FEATURES.length - 1 ? (
                <>
                  {t('onboarding.start')}
                  <Sparkles className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  {t('common.next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JinBaoOnboarding;
