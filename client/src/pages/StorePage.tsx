import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Tag, Star, TrendingUp, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeaturedCarousel from "@/components/nexar/FeaturedCarousel";
import GameCard, { type Game } from "@/components/nexar/GameCard";

interface StorePageProps {
  storeGames: Game[];
  featuredGames: Game[];
  onInstallGame: (game: Game) => void;
  onViewGameDetails: (game: Game) => void;
}

const categories = [
  { id: "all", label: "All Games" },
  { id: "action", label: "Action" },
  { id: "rpg", label: "RPG" },
  { id: "adventure", label: "Adventure" },
  { id: "strategy", label: "Strategy" },
  { id: "sports", label: "Sports" },
];

export default function StorePage({
  storeGames,
  featuredGames,
  onInstallGame,
  onViewGameDetails
}: StorePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredGames = useMemo(() => {
    let result = [...storeGames];

    if (searchQuery) {
      result = result.filter(g => 
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter(g => 
        g.genre?.toLowerCase().includes(selectedCategory)
      );
    }

    return result;
  }, [storeGames, searchQuery, selectedCategory]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
      data-testid="page-store"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Nexar Games Store</h1>
              <p className="text-muted-foreground">Discover and download the best games</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search the store..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-card-border focus:ring-primary"
                data-testid="input-search-store"
              />
            </div>
          </div>

          <FeaturedCarousel
            games={featuredGames}
            onPlay={onInstallGame}
            onDetails={onViewGameDetails}
          />
        </div>
      </div>

      <div className="px-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="h-auto flex-wrap gap-1">
              {categories.map(cat => (
                <TabsTrigger 
                  key={cat.id} 
                  value={cat.id}
                  data-testid={`tab-category-${cat.id}`}
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 md:ml-auto">
            <Badge variant="secondary" className="gap-1">
              <Star className="w-3 h-3" />
              Top Rated
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="w-3 h-3" />
              Trending
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              New
            </Badge>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Available Games
            </h2>
            <span className="text-sm text-muted-foreground">{filteredGames.length} games</span>
          </div>

          {filteredGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No games found</h3>
              <p className="text-muted-foreground">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <GameCard
                    game={game}
                    onInstall={onInstallGame}
                    onManage={onViewGameDetails}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
