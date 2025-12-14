import { useState, useCallback } from 'react';
import { Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';

interface ProductImageGalleryProps {
  images: string[];
  videoUrl?: string;
  productName: string;
  category: string;
  discount?: number;
  isVerified?: boolean;
  isUniqueStock?: boolean;
}

const ProductImageGallery = ({
  images,
  videoUrl,
  productName,
  category,
}: ProductImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  // Combine images and video for carousel
  const totalSlides = images.length + (videoUrl ? 1 : 0);
  const isVideoSlide = videoUrl && currentIndex === images.length;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
    setIsVideoPlaying(false);
  }, [emblaApi]);

  // Subscribe to embla events
  useState(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  });

  const goToSlide = (index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
    }
    setCurrentIndex(index);
    setIsVideoPlaying(false);
  };

  return (
    <div className="relative w-full">
      {/* Main Swipeable Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((image, index) => (
            <div 
              key={index} 
              className="relative aspect-[4/5] sm:aspect-[4/3] min-w-0 flex-[0_0_100%] bg-muted"
            >
              <img
                src={image}
                alt={`${productName} - Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {videoUrl && (
            <div className="relative aspect-[4/5] sm:aspect-[4/3] min-w-0 flex-[0_0_100%] bg-muted">
              {isVideoPlaying ? (
                <video
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                />
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={images[0]}
                    alt={`${productName} vidéo`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Button
                      onClick={() => setIsVideoPlaying(true)}
                      size="lg"
                      className="rounded-full w-16 h-16 bg-white/90 hover:bg-white text-foreground"
                    >
                      <Play className="h-8 w-8 fill-current ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Badge - Top left */}
      <div className="absolute top-14 left-3 z-10">
        <Badge variant="secondary" className="bg-black/70 text-white backdrop-blur-sm border-0 text-xs">
          {category}
        </Badge>
      </div>

      {/* Image Counter - Bottom right */}
      {totalSlides > 1 && (
        <div className="absolute bottom-4 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
          {currentIndex + 1}/{totalSlides}
        </div>
      )}

      {/* Thumbnail Navigation - Horizontal scroll */}
      {totalSlides > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-background">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                currentIndex === index
                  ? "border-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={image}
                alt={`${productName} - Miniature ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
          {videoUrl && (
            <button
              onClick={() => goToSlide(images.length)}
              className={cn(
                "flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all relative",
                currentIndex === images.length
                  ? "border-primary"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={images[0]}
                alt={`${productName} - Vidéo`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Play className="h-4 w-4 text-white fill-white" />
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
