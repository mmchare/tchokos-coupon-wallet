import { useTranslation } from 'react-i18next';
import { 
  Gavel, Sparkles, Smartphone, Laptop, Watch, Headphones, Camera, Shirt, Home, 
  Gamepad2, Package, Gem, Briefcase, Car, Dumbbell, Baby, Tv, Tablet, Bike, 
  Wrench, Book, Music, Utensils, Flower2, Dog, Plane, Gift, LucideIcon
} from 'lucide-react';
import { useCategories, Category } from '@/hooks/useCategories';

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

// Icon mapping from string to Lucide component
const iconMap: Record<string, LucideIcon> = {
  Package, Smartphone, Laptop, Tablet, Tv, Headphones, Camera, Gamepad2,
  Watch, Gem, Shirt, Briefcase, Home, Sparkles, Dumbbell, Baby, Car, Bike,
  Wrench, Book, Music, Utensils, Flower2, Dog, Plane, Gift, Gavel
};

// Default configurations for special categories
const defaultConfigs: Record<string, { icon: LucideIcon; bgColor: string; iconColor: string }> = {
  'all': { 
    icon: Package, 
    bgColor: 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40', 
    iconColor: 'text-blue-600 dark:text-blue-400' 
  },
  'auctions': { 
    icon: Gavel, 
    bgColor: 'bg-gradient-to-br from-orange-100 to-blue-100 dark:from-orange-900/40 dark:to-blue-900/40', 
    iconColor: 'text-orange-600 dark:text-orange-400' 
  },
};

// Fallback config for categories not in database
const fallbackConfig = { 
  icon: Package, 
  bgColor: 'bg-gray-100 dark:bg-gray-800/50', 
  iconColor: 'text-gray-600 dark:text-gray-400' 
};

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) => {
  const { t } = useTranslation();
  const { data: dbCategories = [] } = useCategories();

  // Build a lookup map from DB categories
  const categoryLookup = new Map<string, Category>();
  dbCategories.forEach(cat => categoryLookup.set(cat.name, cat));

  // Get config for a category
  const getCategoryConfig = (categoryName: string) => {
    // Check special defaults first
    if (defaultConfigs[categoryName]) {
      return defaultConfigs[categoryName];
    }

    // Check database
    const dbCat = categoryLookup.get(categoryName);
    if (dbCat) {
      const IconComponent = iconMap[dbCat.icon] || Package;
      return {
        icon: IconComponent,
        bgColor: dbCat.bg_color,
        iconColor: dbCat.icon_color
      };
    }

    return fallbackConfig;
  };

  // Translate category keys to display names
  const getCategoryLabel = (category: string) => {
    if (category === 'all') return t('home.all');
    if (category === 'auctions') return t('home.auctions');
    return category;
  };

  return (
    <div className="flex space-x-3 overflow-x-auto pb-3 scrollbar-hide px-1">
      {categories.map((category) => {
        const config = getCategoryConfig(category);
        const IconComponent = config.icon;
        const isActive = activeCategory === category;
        
        return (
          <div
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`
              flex-shrink-0 flex flex-col items-center p-3 rounded-2xl cursor-pointer
              min-w-[100px] transition-all duration-300
              bg-card border relative overflow-hidden
              ${isActive 
                ? 'border-primary shadow-lg shadow-primary/20 scale-[1.02]' 
                : 'border-border/50 hover:border-border hover:shadow-md'
              }
            `}
          >
            {/* Decorative background gradient on active */}
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            )}
            
            {/* Icon Container with gradient background */}
            <div className={`
              relative w-12 h-12 rounded-xl flex items-center justify-center mb-2
              ${config.bgColor}
              transition-transform duration-300
              ${isActive ? 'scale-110' : 'group-hover:scale-105'}
            `}>
              <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            
            {/* Category Name */}
            <span className={`
              text-xs font-medium text-center leading-tight line-clamp-2
              ${isActive ? 'text-primary' : 'text-foreground'}
            `}>
              {getCategoryLabel(category)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
