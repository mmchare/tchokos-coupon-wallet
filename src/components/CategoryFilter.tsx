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

// Emoji map for categories - expressive, no boxes
const emojiMap: Record<string, string> = {
  'all': '🔥',
  'auctions': '🔨',
  'Smartphones': '📱',
  'Laptops': '💻',
  'Tablets': '📲',
  'TV': '📺',
  'Headphones': '🎧',
  'Cameras': '📷',
  'Gaming': '🎮',
  'Watches': '⌚',
  'Jewelry': '💎',
  'Clothing': '👕',
  'Bags': '👜',
  'Home': '🏠',
  'Beauty': '✨',
  'Sports': '🏋️',
  'Baby': '👶',
  'Auto': '🚗',
  'Bikes': '🚲',
  'Tools': '🔧',
  'Books': '📚',
  'Music': '🎵',
  'Kitchen': '🍳',
  'Garden': '🌺',
  'Pets': '🐶',
  'Travel': '✈️',
  'Gifts': '🎁',
};

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) => {
  const { t } = useTranslation();
  const { data: dbCategories = [] } = useCategories();

  const getCategoryEmoji = (categoryName: string) => {
    return emojiMap[categoryName] || '📦';
  };

  const getCategoryLabel = (category: string) => {
    if (category === 'all') return t('home.all');
    if (category === 'auctions') return t('home.auctions');
    return category;
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1 -mx-1">
      {categories.map((category, index) => {
        const isActive = activeCategory === category;
        
        return (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`flex-shrink-0 flex flex-col items-center gap-2 w-[64px] group animate-fade-in`}
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
          >
            <span className={`
              text-3xl sm:text-4xl transition-transform duration-200
              ${isActive ? 'scale-125' : 'group-hover:scale-110'}
            `}>
              {getCategoryEmoji(category)}
            </span>
            
            <span className={`
              text-[11px] leading-tight text-center line-clamp-1 font-semibold transition-colors
              ${isActive ? 'text-primary' : 'text-foreground/70 group-hover:text-foreground'}
            `}>
              {getCategoryLabel(category)}
            </span>

            {isActive && (
              <div className="w-5 h-0.5 rounded-full bg-primary -mt-1" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
