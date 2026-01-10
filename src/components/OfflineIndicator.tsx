/**
 * Indicateur du mode hors ligne
 * Affiche une bannière quand l'utilisateur n'a pas de connexion
 */

import { WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface OfflineIndicatorProps {
  isOnline: boolean;
  cachedProductsCount: number;
}

const OfflineIndicator = ({ isOnline, cachedProductsCount }: OfflineIndicatorProps) => {
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 animate-fade-in">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">
        {t('offline.noConnection')}
      </span>
      {cachedProductsCount > 0 && (
        <span className="text-xs opacity-80">
          • {t('offline.cachedProducts', { count: cachedProductsCount })}
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.location.reload()}
        className="ml-2 h-6 px-2 text-white hover:bg-white/20"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        {t('offline.retry')}
      </Button>
    </div>
  );
};

export default OfflineIndicator;
