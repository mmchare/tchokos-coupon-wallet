/**
 * Desktop-only categories sidebar (Xianyu/Taobao style).
 * Hidden on mobile (lg:block). Vertical list of categories with icons.
 */
import { useTranslation } from 'react-i18next';
import {
  Gavel, Sparkles, Smartphone, Laptop, Watch, Headphones, Camera, Shirt, Home,
  Gamepad2, Package, Gem, Briefcase, Car, Dumbbell, Baby, Tv, Tablet, Bike,
  Wrench, Book, Music, Utensils, Flower2, Dog, Plane, Gift, LucideIcon, ChevronRight,
} from 'lucide-react';
import { useCategories, Category } from '@/hooks/useCategories';

interface Props {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const iconMap: Record<string, LucideIcon> = {
  Package, Smartphone, Laptop, Tablet, Tv, Headphones, Camera, Gamepad2,
  Watch, Gem, Shirt, Briefcase, Home, Sparkles, Dumbbell, Baby, Car, Bike,
  Wrench, Book, Music, Utensils, Flower2, Dog, Plane, Gift, Gavel,
};

const builtins: Record<string, LucideIcon> = {
  all: Package,
  auctions: Gavel,
};

const DesktopCategorySidebar = ({ categories, activeCategory, onCategoryChange }: Props) => {
  const { t } = useTranslation();
  const { data: dbCategories = [] } = useCategories();
  const lookup = new Map<string, Category>();
  dbCategories.forEach((c) => lookup.set(c.name, c));

  const getIcon = (name: string): LucideIcon => {
    if (builtins[name]) return builtins[name];
    const db = lookup.get(name);
    return db ? iconMap[db.icon] || Package : Package;
  };

  const getLabel = (name: string) => {
    if (name === 'all') return t('home.all');
    if (name === 'auctions') return t('home.auctions');
    return name;
  };

  return (
    <aside
      aria-label="Catégories"
      className="hidden lg:block w-56 shrink-0"
    >
      <div className="sticky top-20 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-jinbao-gold/10">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded-sm bg-jinbao-gold/20 border border-jinbao-gold/40 flex items-center justify-center text-jinbao-gold text-[11px] font-black">
              金
            </span>
            Toutes catégories
          </h2>
        </div>
        <nav className="max-h-[70vh] overflow-y-auto scrollbar-hide py-1">
          {categories.map((cat) => {
            const Icon = getIcon(cat);
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`group w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-l-2 ${
                  isActive
                    ? 'bg-primary/10 border-primary text-primary font-semibold'
                    : 'border-transparent text-foreground/80 hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />
                <span className="text-[13px] flex-1 truncate">{getLabel(cat)}</span>
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-transform ${
                    isActive ? 'text-primary translate-x-0.5' : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default DesktopCategorySidebar;
