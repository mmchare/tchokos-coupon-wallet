import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SearchSuggestions from '@/components/SearchSuggestions';

interface SearchHistoryItem {
  id: string;
  query: string;
  created_at: string;
}

interface HeroProps {
  searchQuery: string;
  useAIMode: boolean;
  isSearching: boolean;
  interpretation: string | null;
  showSearchSuggestions: boolean;
  history: SearchHistoryItem[];
  searchInputRef: React.RefObject<HTMLInputElement>;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSelectSuggestion: (query: string) => void;
  onDeleteSearch: (id: string) => void;
  onClearHistory: () => void;
  onToggleAI: () => void;
  setShowSearchSuggestions: (show: boolean) => void;
}

const Hero = ({
  searchQuery,
  useAIMode,
  interpretation,
  showSearchSuggestions,
  history,
  searchInputRef,
  onSearchChange,
  onSearchSubmit,
  onSelectSuggestion,
  onDeleteSearch,
  onClearHistory,
  onToggleAI,
  setShowSearchSuggestions,
}: HeroProps) => {
  const { t } = useTranslation();

  return (
    <section className="relative bg-gradient-to-br from-[#0A3D62] to-[#0C4A75] text-white pt-20 pb-12 md:pt-16 md:pb-28 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute right-0 top-0 h-full w-2/3 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1550009158-9ebf69173e03?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,0.4), transparent)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.4), transparent)'
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="mb-4 md:mb-6 animate-fade-in">
            <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-brand-secondary/20 text-brand-secondary text-[10px] md:text-xs font-bold tracking-wider border border-brand-secondary/30 backdrop-blur-sm">
              <span className="w-2 h-2 bg-brand-secondary rounded-full animate-pulse"></span>
              {t('home.hero.visitStore')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight animate-fade-in">
            {t('home.hero.title')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-orange-600">
              {t('home.hero.subtitle')}
            </span>
          </h1>

          {/* Description */}
          <p className="text-gray-200 text-sm sm:text-lg mb-6 md:mb-8 max-w-lg leading-relaxed font-normal">
            {t('home.hero.description')}
          </p>
 
          {/* Search Bar - hidden in this design variant to match image, or minimal */}
          {/* <div className="max-w-md relative"> ... </div> */}


          {/* Search Bar */}
          <div className="max-w-md relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300 h-5 w-5" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder={useAIMode ? t('common.searchAI') : t('common.search')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setShowSearchSuggestions(searchQuery.length === 0 && history.length > 0)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                className="w-full pl-12 pr-14 py-3.5 bg-white/15 backdrop-blur-md border border-white/25 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all text-sm font-normal"
              />
              <button
                onClick={onToggleAI}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all ${
                  useAIMode 
                    ? 'bg-brand-secondary/30 text-brand-secondary' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                title={useAIMode ? t('home.disableAI') : t('home.enableAI')}
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>

            {/* Search Suggestions */}
            <div className="absolute top-full left-0 right-0 mt-2 z-50">
              <SearchSuggestions
                history={history}
                onSelect={onSelectSuggestion}
                onDelete={onDeleteSearch}
                onClearAll={onClearHistory}
                isVisible={showSearchSuggestions}
              />
            </div>

            {/* AI Interpretation */}
            {interpretation && useAIMode && (
              <div className="mt-3 text-sm text-brand-secondary flex items-center gap-2 animate-pulse">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{interpretation}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
