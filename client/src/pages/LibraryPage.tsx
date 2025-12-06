import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Grid, List, SortAsc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GameCard, { type Game } from "@/components/nexar/GameCard";

interface LibraryPageProps {
  games: Game[];
  onPlayGame: (game: Game) => void;
  onDeleteGame: (game: Game) => void;
  onViewGameDetails: (game: Game) => void;
}

export default function LibraryPage({
  games,
  onPlayGame,
  onDeleteGame,
  onViewGameDetails
}: LibraryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | "installed">("all");
  const [sortBy, setSortBy] = useState<"name" | "recent" | "playtime">("recent");

  const filteredGames = useMemo(() => {
    let result = [...games];

    if (searchQuery) {
      result = result.filter(g => 
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filter === "installed") {
      result = result.filter(g => g.isInstalled);
    }

    if (sortBy === "name") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "playtime") {
      result.sort((a, b) => (b.playTime || 0) - (a.playTime || 0));
    }

    return result;
  }, [games, searchQuery, filter, sortBy]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 space-y-6"
      data-testid="page-library"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Game Library</h1>
          <p className="text-muted-foreground">{games.length} games in your collection</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-card-border focus:ring-primary focus:border-primary"
              data-testid="input-search-library"
            />
          </div>

          <div className="flex items-center gap-1 border border-border rounded-lg p-1">
            <Button
              size="icon"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All Games</TabsTrigger>
            <TabsTrigger value="installed" data-testid="tab-installed">Installed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 md:ml-auto">
          <SortAsc className="w-4 h-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-40 bg-card border-card-border" data-testid="select-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Played</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="playtime">Play Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {filteredGames.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Filter className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No games found</h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? "Try adjusting your search or filters" 
                : "Your Nexar Library is empty. Install games from the Nexar Store."}
            </p>
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <GameCard
                  game={game}
                  onPlay={onPlayGame}
                  onDelete={onDeleteGame}
                  onManage={onViewGameDetails}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <GameCard
                  game={game}
                  variant="horizontal"
                  onPlay={onPlayGame}
                  onDelete={onDeleteGame}
                  onManage={onViewGameDetails}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
