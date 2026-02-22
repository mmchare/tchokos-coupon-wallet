import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2 } from 'lucide-react';

interface GifStickerPickerProps {
  onSelect: (url: string) => void;
}

const STICKERS = [
  '🎉', '🔥', '💯', '❤️', '👏', '😍', '🤩', '💪',
  '🎊', '✨', '⭐', '🌟', '💫', '🏆', '🥇', '👑',
  '💰', '🛍️', '📦', '🚀', '💎', '🎁', '🛒', '✅',
];

const GifStickerPicker = ({ onSelect }: GifStickerPickerProps) => {
  return (
    <Card className="bg-card border-border p-3 shadow-lg w-72">
      <Tabs defaultValue="stickers">
        <TabsList className="w-full mb-2">
          <TabsTrigger value="stickers" className="flex-1 text-xs">Stickers</TabsTrigger>
        </TabsList>
        <TabsContent value="stickers">
          <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto">
            {STICKERS.map((sticker, i) => (
              <button
                key={i}
                onClick={() => onSelect(sticker)}
                className="text-2xl hover:bg-accent rounded-lg p-1.5 transition-colors"
              >
                {sticker}
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default GifStickerPicker;
