import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import GameCard, { type Game } from "./GameCard";

interface ContinuePlayingProps {
  games: Game[];
  onPlay?: (game: Game) => void;
  onViewAll?: () => void;
}

export default function ContinuePlaying({ games, onPlay, onViewAll }: ContinuePlayingProps) {
  if (games.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
      data-testid="section-continue-playing"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Continue Playing</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onViewAll}
          className="text-muted-foreground"
          data-testid="button-view-all-continue"
        >
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="w-40 flex-shrink-0"
            >
              <GameCard 
                game={game} 
                variant="compact" 
                onPlay={onPlay}
              />
            </motion.div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </motion.section>
  );
}
