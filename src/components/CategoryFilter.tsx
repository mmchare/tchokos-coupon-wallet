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

const iconMap: Record<string, LucideIcon> = {
  Package, Smartphone, Laptop, Tablet, Tv, Headphones, Camera, Gamepad2,
  Watch, Gem, Shirt, Briefcase, Home, Sparkles, Dumbbell, Baby, Car, Bike,
  Wrench, Book, Music, Utensils, Flower2, Dog, Plane, Gift, Gavel
};

// Vibrant gradient configs inspired by Xianyu style
const defaultConfigs: Record<string, { icon: LucideIcon; gradient: string }> = {
  'all': { 
    icon: Package, 
    gradient: 'from-blue-400 to-indigo-500',
  },
  'auctions': { 
    icon: Gavel, 
    gradient: 'from-orange-400 to-red-500',
  },
};

// Rotating gradients for dynamic categories
const gradientPalette = [
  'from-pink-400 to-rose-500',
  'from-cyan-400 to-blue-500',
  'from-green-400 to-emerald-500',
  'from-violet-400 to-purple-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-green-500',
  'from-sky-400 to-blue-500',
  'from-red-400 to-rose-500',
];

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) => {
  const { t } = useTranslation();
  const { data: dbCategories = [] } = useCategories();

  const categoryLookup = new Map<string, Category>();
  dbCategories.forEach(cat => categoryLookup.set(cat.name, cat));

  const getCategoryConfig = (categoryName: string, index: number) => {
    if (defaultConfigs[categoryName]) {
      return { icon: defaultConfigs[categoryName].icon, gradient: defaultConfigs[categoryName].gradient };
    }

    const dbCat = categoryLookup.get(categoryName);
    const IconComponent = dbCat ? (iconMap[dbCat.icon] || Package) : Package;
    const gradient = gradientPalette[index % gradientPalette.length];

    return { icon: IconComponent, gradient };
  };

  const getCategoryLabel = (category: string) => {
    if (category === 'all') return t('home.all');
    if (category === 'auctions') return t('home.auctions');
    return category;
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1 -mx-1">
      {categories.map((category, index) => {
        const config = getCategoryConfig(category, index);
        const IconComponent = config.icon;
        const isActive = activeCategory === category;
        
        return (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px] group animate-fade-in"
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
          >
            {/* Bubble icon */}
            <div className={`
              relative w-14 h-14 rounded-2xl flex items-center justify-center
              bg-gradient-to-br ${config.gradient}
              shadow-md transition-all duration-200
              ${isActive 
                ? 'scale-110 shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background' 
                : 'group-hover:scale-105 group-hover:shadow-lg'
              }
            `}>
              <IconComponent className="h-6 w-6 text-white drop-shadow-sm" />
            </div>
            
            {/* Label */}
            <span className={`
              text-[11px] leading-tight text-center line-clamp-2 font-medium transition-colors
              ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}
            `}>
              {getCategoryLabel(category)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
