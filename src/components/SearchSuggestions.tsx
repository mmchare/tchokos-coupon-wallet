import { Clock, X, Trash2 } from 'lucide-react';

interface SearchHistoryItem {
  id: string;
  query: string;
}

interface SearchSuggestionsProps {
  history: SearchHistoryItem[];
  onSelect: (query: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  isVisible: boolean;
}

const SearchSuggestions = ({ 
  history, 
  onSelect, 
  onDelete, 
  onClearAll,
  isVisible 
}: SearchSuggestionsProps) => {
  if (!isVisible || history.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">Recherches récentes</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClearAll();
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Effacer
        </button>
      </div>
      <ul className="max-h-60 overflow-y-auto">
        {history.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 cursor-pointer group transition-colors"
            onClick={() => onSelect(item.query)}
          >
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{item.query}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchSuggestions;
