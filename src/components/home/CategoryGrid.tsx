import { LucideIcon, Smartphone, Laptop, Headphones, Home, Sparkles, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const categories: Category[] = [
    { 
      id: 'auctions', 
      label: 'Enchères', 
      icon: Gavel, 
      bgColor: 'bg-brand-primary',
      iconColor: 'text-white'
    },
    { 
      id: 'bestsellers', 
      label: 'Meilleure vente', 
      icon: Sparkles, 
      bgColor: 'bg-brand-secondary',
      iconColor: 'text-white'
    },
    { 
      id: 'Iphones', 
      label: 'Iphones', 
      icon: Smartphone, 
      bgColor: 'bg-gray-900',
      iconColor: 'text-white'
    },
    { 
      id: 'Pixels', 
      label: 'Pixels', 
      icon: Smartphone, 
      bgColor: 'bg-green-600',
      iconColor: 'text-white'
    },
    { 
      id: 'Xiaomi', 
      label: 'Xiaomi', 
      icon: Smartphone, 
      bgColor: 'bg-orange-500',
      iconColor: 'text-white'
    },
    { 
      id: 'Samsung', 
      label: 'Samsung', 
      icon: Smartphone, 
      bgColor: 'bg-blue-600',
      iconColor: 'text-white'
    },
    { 
      id: 'Accessoires', 
      label: 'Accessoires', 
      icon: Headphones, 
      bgColor: 'bg-purple-500',
      iconColor: 'text-white'
    },
    { 
      id: 'Autres', 
      label: 'Autres', 
      icon: Home, 
      bgColor: 'bg-gray-500',
      iconColor: 'text-white'
    }
  ];

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#222222] dark:text-white">
          Shop by Category
        </h2>
        <Button 
          variant="ghost" 
          className="text-sm font-semibold text-brand-primary hover:text-brand-primary/80 dark:text-brand-primary dark:hover:text-brand-primary/80" 
          onClick={() => onCategoryChange('all')}
        >
          Browse All →
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:shadow-card ${
                isActive 
                  ? 'bg-brand-primary text-white shadow-card ring-2 ring-brand-primary ring-offset-2 scale-105' 
                  : 'bg-white dark:bg-gray-800 hover:scale-105 shadow-soft'
              }`}
            >
              {/* Icon Container */}
              <div 
                className={`mb-4 inline-flex p-4 rounded-xl transition-all shadow-soft ${
                  isActive ? 'bg-white/20' : category.bgColor
                }`}
              >
                <Icon className={`h-6 w-6 ${isActive ? 'text-white' : category.iconColor}`} />
              </div>

              {/* Label */}
              <h3 className={`font-bold text-base mb-1 ${
                isActive ? 'text-white' : 'text-[#222222] dark:text-white'
              }`}>
                {category.label}
              </h3>
              
              <p className={`text-xs ${
                isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
              }`}>
                Explore
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryGrid;
