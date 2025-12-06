import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Info, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Game } from "./GameCard";

interface FeaturedCarouselProps {
  games: Game[];
  onPlay?: (game: Game) => void;
  onDetails?: (game: Game) => void;
  autoPlayInterval?: number;
}

export default function FeaturedCarousel({
  games,
  onPlay,
  onDetails,
  autoPlayInterval = 5000
}: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || games.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % games.length);
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [games.length, autoPlayInterval, isPaused]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + games.length) % games.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % games.length);
  };

  if (games.length === 0) return null;

  const currentGame = games[currentIndex];

  return (
    <div 
      className="relative w-full aspect-[21/9] rounded-xl overflow-hidden bg-card"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-testid="featured-carousel"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {currentGame.coverUrl ? (
            <img
              src={currentGame.coverUrl}
              alt={currentGame.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/40 via-primary/20 to-background flex items-center justify-center">
              <Gamepad2 className="w-32 h-32 text-primary/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 p-8">
        <motion.div
          key={`content-${currentIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-xl"
        >
          <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
            {currentGame.title}
          </h2>
          {currentGame.genre && (
            <p className="text-lg text-white/70 mb-4">{currentGame.genre}</p>
          )}
          <div className="flex gap-3">
            <Button 
              size="lg" 
              onClick={() => onPlay?.(currentGame)}
              className="shadow-xl"
              data-testid="button-featured-play"
            >
              <Play className="w-5 h-5 mr-2" />
              {currentGame.isInstalled ? "Play Now" : "Get Game"}
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => onDetails?.(currentGame)}
              className="bg-white/10 border-white/20 text-white backdrop-blur-sm"
              data-testid="button-featured-info"
            >
              <Info className="w-5 h-5 mr-2" />
              More Info
            </Button>
          </div>
        </motion.div>
      </div>

      {games.length > 1 && (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white backdrop-blur-sm"
            onClick={goToPrevious}
            data-testid="button-carousel-prev"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white backdrop-blur-sm"
            onClick={goToNext}
            data-testid="button-carousel-next"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          <div className="absolute bottom-4 right-8 flex gap-2">
            {games.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? "bg-primary w-6" 
                    : "bg-white/40 hover:bg-white/60"
                }`}
                onClick={() => setCurrentIndex(index)}
                data-testid={`button-carousel-dot-${index}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
