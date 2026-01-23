import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExpandableDescriptionProps {
  description: string | null | undefined;
  title: string;
  maxLines?: number;
}

export const ExpandableDescription = ({ 
  description, 
  title, 
  maxLines = 4 
}: ExpandableDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * maxLines;
      setNeedsTruncation(textRef.current.scrollHeight > maxHeight + 10);
    }
  }, [description, maxLines]);

  if (!description) return null;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-5 mt-3">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-1 h-5 bg-primary rounded-full"></span>
        {title}
      </h3>
      
      <div className="relative">
        <p 
          ref={textRef}
          className={`text-muted-foreground text-[15px] leading-7 whitespace-pre-line font-light tracking-wide transition-all duration-300 ${
            !isExpanded && needsTruncation ? 'line-clamp-4' : ''
          }`}
          style={!isExpanded && needsTruncation ? { 
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          } : undefined}
        >
          {description}
        </p>
        
        {/* Fade gradient when truncated */}
        {!isExpanded && needsTruncation && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        )}
      </div>
      
      {needsTruncation && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 text-primary hover:text-primary/80 hover:bg-primary/10 font-medium gap-1.5 px-0"
        >
          {isExpanded ? (
            <>
              Voir moins
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Lire plus
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};
