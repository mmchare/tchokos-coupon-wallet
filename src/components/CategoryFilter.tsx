import { useTranslation } from 'react-i18next';
import { Gavel, Sparkles, Smartphone, Laptop, Watch, Headphones, Camera, Shirt, Home, Gamepad2, Package } from 'lucide-react';
import { ReactNode } from 'react';

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

// Category icons mapping - each category gets a unique icon and color
const getCategoryConfig = (category: string): { icon: ReactNode; bgColor: string; iconColor: string } => {
  const configs: Record<string, { icon: ReactNode; bgColor: string; iconColor: string }> = {
    'all': { 
      icon: <Package className="h-5 w-5" />, 
      bgColor: 'bg-blue-100 dark:bg-blue-900/30', 
      iconColor: 'text-blue-600 dark:text-blue-400' 
    },
    'auctions': { 
      icon: <Gavel className="h-5 w-5" />, 
      bgColor: 'bg-orange-100 dark:bg-orange-900/30', 
      iconColor: 'text-orange-600 dark:text-orange-400' 
    },
    'Electronics': { 
      icon: <Smartphone className="h-5 w-5" />, 
      bgColor: 'bg-purple-100 dark:bg-purple-900/30', 
      iconColor: 'text-purple-600 dark:text-purple-400' 
    },
    'Électronique': { 
      icon: <Smartphone className="h-5 w-5" />, 
      bgColor: 'bg-purple-100 dark:bg-purple-900/30', 
      iconColor: 'text-purple-600 dark:text-purple-400' 
    },
    'Fashion': { 
      icon: <Shirt className="h-5 w-5" />, 
      bgColor: 'bg-pink-100 dark:bg-pink-900/30', 
      iconColor: 'text-pink-600 dark:text-pink-400' 
    },
    'Mode': { 
      icon: <Shirt className="h-5 w-5" />, 
      bgColor: 'bg-pink-100 dark:bg-pink-900/30', 
      iconColor: 'text-pink-600 dark:text-pink-400' 
    },
    'Accessories': { 
      icon: <Watch className="h-5 w-5" />, 
      bgColor: 'bg-teal-100 dark:bg-teal-900/30', 
      iconColor: 'text-teal-600 dark:text-teal-400' 
    },
    'Accessoires': { 
      icon: <Watch className="h-5 w-5" />, 
      bgColor: 'bg-teal-100 dark:bg-teal-900/30', 
      iconColor: 'text-teal-600 dark:text-teal-400' 
    },
    'Home & Garden': { 
      icon: <Home className="h-5 w-5" />, 
      bgColor: 'bg-green-100 dark:bg-green-900/30', 
      iconColor: 'text-green-600 dark:text-green-400' 
    },
    'Maison': { 
      icon: <Home className="h-5 w-5" />, 
      bgColor: 'bg-green-100 dark:bg-green-900/30', 
      iconColor: 'text-green-600 dark:text-green-400' 
    },
    'Beauty & Health': { 
      icon: <Sparkles className="h-5 w-5" />, 
      bgColor: 'bg-rose-100 dark:bg-rose-900/30', 
      iconColor: 'text-rose-600 dark:text-rose-400' 
    },
    'Beauté': { 
      icon: <Sparkles className="h-5 w-5" />, 
      bgColor: 'bg-rose-100 dark:bg-rose-900/30', 
      iconColor: 'text-rose-600 dark:text-rose-400' 
    },
    'Sports & Hobbies': { 
      icon: <Gamepad2 className="h-5 w-5" />, 
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', 
      iconColor: 'text-indigo-600 dark:text-indigo-400' 
    },
    'Sports': { 
      icon: <Gamepad2 className="h-5 w-5" />, 
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', 
      iconColor: 'text-indigo-600 dark:text-indigo-400' 
    },
    'Audio': { 
      icon: <Headphones className="h-5 w-5" />, 
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', 
      iconColor: 'text-cyan-600 dark:text-cyan-400' 
    },
    'Photo': { 
      icon: <Camera className="h-5 w-5" />, 
      bgColor: 'bg-amber-100 dark:bg-amber-900/30', 
      iconColor: 'text-amber-600 dark:text-amber-400' 
    },
    'Ordinateur': { 
      icon: <Laptop className="h-5 w-5" />, 
      bgColor: 'bg-slate-100 dark:bg-slate-900/30', 
      iconColor: 'text-slate-600 dark:text-slate-400' 
    },
    'Computers': { 
      icon: <Laptop className="h-5 w-5" />, 
      bgColor: 'bg-slate-100 dark:bg-slate-900/30', 
      iconColor: 'text-slate-600 dark:text-slate-400' 
    },
  };

  return configs[category] || { 
    icon: <Package className="h-5 w-5" />, 
    bgColor: 'bg-gray-100 dark:bg-gray-800/50', 
    iconColor: 'text-gray-600 dark:text-gray-400' 
  };
};

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) => {
  const { t } = useTranslation();

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
        const isActive = activeCategory === category;
        
        return (
          <div
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`
              flex-shrink-0 flex flex-col items-start p-4 rounded-2xl cursor-pointer
              min-w-[130px] transition-all duration-300
              bg-card border
              ${isActive 
                ? 'border-primary shadow-lg scale-[1.02]' 
                : 'border-border/50 hover:border-border hover:shadow-md'
              }
            `}
          >
            {/* Icon Container */}
            <div className={`
              w-11 h-11 rounded-xl flex items-center justify-center mb-3
              ${config.bgColor}
            `}>
              <span className={config.iconColor}>
                {config.icon}
              </span>
            </div>
            
            {/* Category Name */}
            <span className={`
              text-sm font-semibold leading-tight
              ${isActive ? 'text-foreground' : 'text-foreground'}
            `}>
              {getCategoryLabel(category)}
            </span>
            
            {/* Explorer Label */}
            <span className="text-xs text-muted-foreground mt-0.5">
              Explorer
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
