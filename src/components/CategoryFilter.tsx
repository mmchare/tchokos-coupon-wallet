import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) => {
  const { t } = useTranslation();

  // Translate category keys to display names
  const getCategoryLabel = (category: string) => {
    if (category === 'all') return t('home.all');
    if (category === 'auctions') return t('home.auctions');
    return category; // For DB categories, keep as-is
  };

  return (
    <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-hide px-2 sm:px-0">
      {categories.map((category) => (
        <Button
          key={category}
          variant={activeCategory === category ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category)}
          className={`whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 ${
            activeCategory === category
              ? "bg-accent text-accent-foreground hover:bg-accent/90"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {getCategoryLabel(category)}
        </Button>
      ))}
    </div>
  );
};

export default CategoryFilter;