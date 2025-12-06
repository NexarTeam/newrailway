import { motion } from "framer-motion";
import { Play, Download, MoreVertical, Clock, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Game {
  id: string;
  title: string;
  coverUrl?: string;
  isInstalled: boolean;
  playTime?: number;
  size?: string;
  rating?: number;
  genre?: string;
  downloadProgress?: number;
}

interface GameCardProps {
  game: Game;
  onPlay?: (game: Game) => void;
  onInstall?: (game: Game) => void;
  onDelete?: (game: Game) => void;
  onManage?: (game: Game) => void;
  variant?: "default" | "compact" | "horizontal";
}

export default function GameCard({
  game,
  onPlay,
  onInstall,
  onDelete,
  onManage,
  variant = "default"
}: GameCardProps) {
  const isDownloading = game.downloadProgress !== undefined && game.downloadProgress < 100;

  const formatPlayTime = (minutes?: number) => {
    if (!minutes) return "Never played";
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  if (variant === "horizontal") {
    return (
      <motion.div
        className="group flex items-center gap-4 p-3 rounded-lg bg-card border border-card-border"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        data-testid={`game-card-horizontal-${game.id}`}
      >
        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
          {game.coverUrl ? (
            <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{game.title}</h4>
          <p className="text-sm text-muted-foreground">{formatPlayTime(game.playTime)}</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => game.isInstalled ? onPlay?.(game) : onInstall?.(game)}
          data-testid={`button-play-${game.id}`}
        >
          {game.isInstalled ? <Play className="w-4 h-4" /> : <Download className="w-4 h-4" />}
        </Button>
      </motion.div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-card border border-card-border cursor-pointer"
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2 }}
        data-testid={`game-card-compact-${game.id}`}
      >
        {game.coverUrl ? (
          <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <Gamepad2 className="w-12 h-12 text-primary" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h4 className="font-medium text-white truncate text-sm">{game.title}</h4>
        </div>
        <motion.div 
          className="absolute inset-0 flex items-center justify-center bg-black/60"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Button size="icon" variant="default" className="rounded-full shadow-lg" data-testid={`button-play-compact-${game.id}`}>
            <Play className="w-5 h-5" />
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="group relative flex flex-col rounded-lg overflow-hidden bg-card border border-card-border"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      data-testid={`game-card-${game.id}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {game.coverUrl ? (
          <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background flex items-center justify-center">
            <Gamepad2 className="w-16 h-16 text-primary" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        
        {isDownloading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${game.downloadProgress}%` }}
            />
          </div>
        )}

        <motion.div 
          className="absolute inset-0 flex items-center justify-center bg-black/60"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Button 
            size="lg" 
            className="rounded-full shadow-xl"
            onClick={() => game.isInstalled ? onPlay?.(game) : onInstall?.(game)}
            data-testid={`button-action-${game.id}`}
          >
            {isDownloading ? (
              <span className="text-sm">{game.downloadProgress}%</span>
            ) : game.isInstalled ? (
              <>
                <Play className="w-5 h-5 mr-2" />
                Play
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Install
              </>
            )}
          </Button>
        </motion.div>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground truncate">{game.title}</h4>
            {game.genre && (
              <p className="text-xs text-muted-foreground">{game.genre}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="flex-shrink-0" data-testid={`button-menu-${game.id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {game.isInstalled && (
                <>
                  <DropdownMenuItem onClick={() => onPlay?.(game)} data-testid={`menu-play-${game.id}`}>
                    <Play className="w-4 h-4 mr-2" />
                    Play
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onManage?.(game)} data-testid={`menu-manage-${game.id}`}>
                    Manage
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(game)} 
                    className="text-destructive"
                    data-testid={`menu-delete-${game.id}`}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {!game.isInstalled && (
                <DropdownMenuItem onClick={() => onInstall?.(game)} data-testid={`menu-install-${game.id}`}>
                  <Download className="w-4 h-4 mr-2" />
                  Install
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {game.playTime !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatPlayTime(game.playTime)}</span>
          </div>
        )}
        
        {game.size && (
          <p className="text-xs text-muted-foreground">{game.size}</p>
        )}
      </div>
    </motion.div>
  );
}
