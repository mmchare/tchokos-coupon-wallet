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
      {/* Main Image/Video Container */}
      <div className="relative aspect-square sm:aspect-[4/3] md:aspect-square overflow-hidden rounded-xl bg-muted">
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

        {/* Navigation Arrows */}
        {totalSlides > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/95 rounded-full h-10 w-10"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/95 rounded-full h-10 w-10"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          <Badge variant="secondary" className="bg-black/80 text-white">
            {category}
          </Badge>
        </div>

        {discount && discount > 0 && (
          <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground font-bold">
            -{discount}%
          </Badge>
        )}

        {/* Bottom Badges - Verified & Stock */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2">
          {isVerified && (
            <div className="verified-badge">
              <CheckCircle className="h-4 w-4" />
              <span>Vérifié par PINBAOO</span>
            </div>
          )}
          {isUniqueStock && (
            <div className="stock-warning">
              <AlertTriangle className="h-4 w-4" />
              <span>Stock Chine : Article Unique</span>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Navigation */}
      {totalSlides > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all",
                currentIndex === index
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-muted-foreground/30"
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
                "flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all relative",
                currentIndex === images.length
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <img
                src={images[0]}
                alt={`${productName} - Vidéo`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Play className="h-5 w-5 text-white fill-white" />
              </div>
            </button>
          )}
        </div>
      )}

      {/* Dots Indicator (for mobile) */}
      {totalSlides > 1 && (
        <div className="flex justify-center gap-1.5 mt-3 sm:hidden">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentIndex === index
                  ? "bg-primary w-4"
                  : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
