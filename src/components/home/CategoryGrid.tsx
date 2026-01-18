import { LucideIcon, Smartphone,Computer, Headphones, Home, Sparkles, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

interface CategoryGridProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryGrid = ({ activeCategory, onCategoryChange }: CategoryGridProps) => {
  const { t } = useTranslation();

  const categories: Category[] = [
    { 
      id: 'auctions', 
      label: t('categories.auctions'), 
      icon: Gavel, 
      bgColor: 'bg-brand-primary',
      iconColor: 'text-white'
    },
    { 
      id: 'bestsellers', 
      label: t('categories.bestsellers'), 
      icon: Sparkles, 
      bgColor: 'bg-brand-secondary',
      iconColor: 'text-white'
    },

    { 
      id: 'Ordinateurs', 
      label: t('categories.ordinateurs'), 
          icon: Computer, 

       bgColor: 'bg-purple-500',
      iconColor: 'text-white'
    },
    { 
      id: 'Iphones', 
      label: t('categories.iphones'), 
      icon: Smartphone, 
      bgColor: 'bg-gray-900',
      iconColor: 'text-white'
    },
    { 
      id: 'Pixels', 
      label: t('categories.pixels'), 
      icon: Smartphone, 
      bgColor: 'bg-green-600',
      iconColor: 'text-white'
    },
    // { 
    //   id: 'Xiaomi', 
    //   label: t('categories.xiaomi'), 
    //   icon: Smartphone, 
    //   bgColor: 'bg-orange-500',
    //   iconColor: 'text-white'
    // },
    { 
      id: 'Samsung', 
      label: t('categories.samsung'), 
      icon: Smartphone, 
      bgColor: 'bg-blue-600',
      iconColor: 'text-white'
    },
    { 
      id: 'Accessoires', 
      label: t('categories.accessories'), 
      icon: Headphones, 
       bgColor: 'bg-orange-500',
      iconColor: 'text-white'
    },
    { 
      id: 'Autres', 
      label: t('categories.others'), 
      icon: Home, 
      bgColor: 'bg-gray-500',
      iconColor: 'text-white'
    }
  ];

  return (
    <section className="mb-8 md:mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#222222] dark:text-white">
          {t('home.categoryTitle')}
        </h2>
        <Button 
          variant="ghost" 
          className="text-sm font-semibold text-brand-primary hover:text-brand-primary/80 dark:text-brand-primary dark:hover:text-brand-primary/80" 
          onClick={() => onCategoryChange('all')}
        >
          {t('home.browseAll')} →
        </Button>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-4 md:grid md:grid-cols-4 lg:grid-cols-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`group relative overflow-hidden rounded-2xl p-4 md:p-6 transition-all duration-300 hover:shadow-card min-w-[140px] md:min-w-0 flex-shrink-0 text-left ${
                isActive 
                  ? 'bg-brand-primary text-white shadow-card ring-2 ring-brand-primary ring-offset-2 scale-105' 
                  : 'bg-white dark:bg-gray-800 hover:scale-105 shadow-soft'
              }`}
            >
              {/* Icon Container */}
              <div 
                className={`mb-3 md:mb-4 inline-flex p-3 md:p-4 rounded-xl transition-all shadow-soft ${
                  isActive ? 'bg-white/20' : category.bgColor
                }`}
              >
                <Icon className={`h-5 w-5 md:h-6 md:w-6 ${isActive ? 'text-white' : category.iconColor}`} />
              </div>

              {/* Label */}
              <h3 className={`font-bold text-sm md:text-base mb-1 ${
                isActive ? 'text-white' : 'text-[#222222] dark:text-white'
              }`}>
                {category.label}
              </h3>
              
              <p className={`text-[10px] md:text-xs ${
                isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {t('home.explore')}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryGrid;
