import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  discount,
  isVerified = true,
  isUniqueStock = true,
}: ProductImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Combine images and video for carousel
  const totalSlides = images.length + (videoUrl ? 1 : 0);
  const isVideoSlide = videoUrl && currentIndex === images.length;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
    setIsVideoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
    setIsVideoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsVideoPlaying(false);
  };

  return (
    <div className="relative w-full">
      {/* Main Image/Video Container - Full width, no rounded corners for immersive feel */}
      <div className="relative aspect-[4/5] sm:aspect-[4/3] overflow-hidden bg-muted">
        {isVideoSlide ? (
          <div className="relative w-full h-full">
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
        ) : (
          <img
            src={images[currentIndex]}
            alt={`${productName} - Image ${currentIndex + 1}`}
            className="w-full h-full object-cover transition-transform duration-300"
          />
        )}

        {/* Navigation Arrows - Positioned inside */}
        {totalSlides > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/90 rounded-full h-9 w-9 backdrop-blur-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/90 rounded-full h-9 w-9 backdrop-blur-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Category Badge - Top left */}
        <div className="absolute top-14 left-3">
          <Badge variant="secondary" className="bg-black/70 text-white backdrop-blur-sm border-0 text-xs">
            {category}
          </Badge>
        </div>

        {/* Discount Badge - Top right */}
        {discount && discount > 0 && (
          <Badge className="absolute top-14 right-3 bg-primary text-primary-foreground font-bold text-xs">
            -{discount}%
          </Badge>
        )}

        {/* Image Counter - Bottom right */}
        {totalSlides > 1 && (
          <div className="absolute bottom-4 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            {currentIndex + 1}/{totalSlides}
          </div>
        )}
      </div>

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
