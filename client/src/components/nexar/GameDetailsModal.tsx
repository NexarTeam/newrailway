import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Download, Trash2, Star, Clock, HardDrive, Tag, Gamepad2, Crown, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Game } from "./GameCard";

interface GameDetailsModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay?: (game: Game) => void;
  onInstall?: (game: Game) => void;
  onDelete?: (game: Game) => void;
}

export default function GameDetailsModal({
  game,
  isOpen,
  onClose,
  onPlay,
  onInstall,
  onDelete
}: GameDetailsModalProps) {
  if (!game) return null;

  const isDownloading = game.downloadProgress !== undefined && game.downloadProgress < 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={onClose}
            data-testid="modal-backdrop"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, type: "spring", damping: 25 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-card border border-card-border z-50"
            data-testid="game-details-modal"
          >
            <div className="border-t-4 border-primary" />
            
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 z-10"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="flex flex-col md:flex-row">
              <div className="relative w-full md:w-72 aspect-[3/4] md:aspect-auto md:h-auto flex-shrink-0">
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background flex items-center justify-center min-h-[300px]">
                    <Gamepad2 className="w-24 h-24 text-primary/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent md:bg-gradient-to-r" />
              </div>

              <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[60vh] md:max-h-[80vh]">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {game.genre && (
                      <Badge variant="secondary">{game.genre}</Badge>
                    )}
                    {game.isInstalled && (
                      <Badge variant="outline" className="border-green-500 text-green-500">Installed</Badge>
                    )}
                    {game.isNexarPlusGame && (
                      <Badge variant="secondary" className="bg-amber-500 text-white gap-1">
                        <Crown className="w-3 h-3" />
                        Nexar+ Game
                      </Badge>
                    )}
                    {game.hasTrial && !game.isOwned && (
                      <Badge variant="secondary" className="bg-blue-500 text-white gap-1">
                        <Play className="w-3 h-3" />
                        {game.trialMinutes ? `${game.trialMinutes} min Trial` : 'Free Trial'}
                      </Badge>
                    )}
                    {game.discountPercent && game.discountPercent > 0 && (
                      <Badge variant="secondary" className="bg-green-600 text-white gap-1">
                        <Percent className="w-3 h-3" />
                        -{game.discountPercent}% Nexar+ Discount
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{game.title}</h2>
                  {game.discountPercent && game.originalPrice && game.price !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-muted-foreground line-through">£{game.originalPrice.toFixed(2)}</span>
                      <span className="text-lg font-bold text-green-500">£{game.price.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {isDownloading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Downloading...</span>
                      <span className="text-primary font-medium">{game.downloadProgress}%</span>
                    </div>
                    <Progress value={game.downloadProgress} className="h-2" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {game.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{game.rating}/5</p>
                        <p className="text-xs text-muted-foreground">Rating</p>
                      </div>
                    </div>
                  )}
                  {game.playTime !== undefined && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {Math.floor(game.playTime / 60)}h {game.playTime % 60}m
                        </p>
                        <p className="text-xs text-muted-foreground">Play Time</p>
                      </div>
                    </div>
                  )}
                  {game.size && (
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{game.size}</p>
                        <p className="text-xs text-muted-foreground">Size</p>
                      </div>
                    </div>
                  )}
                  {game.genre && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{game.genre}</p>
                        <p className="text-xs text-muted-foreground">Genre</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  {game.isInstalled ? (
                    <>
                      <Button 
                        size="lg" 
                        onClick={() => onPlay?.(game)}
                        className="flex-1"
                        data-testid="button-modal-play"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Play Now
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={() => onDelete?.(game)}
                        data-testid="button-modal-delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={() => onInstall?.(game)}
                      className="flex-1"
                      disabled={isDownloading}
                      data-testid="button-modal-install"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      {isDownloading ? `Installing ${game.downloadProgress}%` : "Install"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
