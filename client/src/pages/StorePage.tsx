import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Tag, Star, TrendingUp, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import FeaturedCarousel from "@/components/nexar/FeaturedCarousel";
import GameCard, { type Game } from "@/components/nexar/GameCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface StorePageProps {
  storeGames: Game[];
  featuredGames: Game[];
  onInstallGame: (game: Game) => void;
  onViewGameDetails: (game: Game) => void;
}

interface WalletData {
  balance: number;
  ownedGames: string[];
}

const categories = [
  { id: "all", label: "All Games" },
  { id: "action", label: "Action" },
  { id: "rpg", label: "RPG" },
  { id: "adventure", label: "Adventure" },
  { id: "strategy", label: "Strategy" },
  { id: "sports", label: "Sports" },
];

const gamePrices: Record<string, number> = {
  "store-1": 49.99,
  "store-2": 59.99,
  "store-3": 29.99,
  "store-4": 39.99,
  "store-5": 69.99,
  "store-6": 24.99,
  "store-7": 34.99,
  "store-8": 44.99,
};

export default function StorePage({
  storeGames,
  featuredGames,
  onInstallGame,
  onViewGameDetails
}: StorePageProps) {
  const { toast } = useToast();
  const { token } = useAuth();
  const { get, post } = useApi();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [buyDialog, setBuyDialog] = useState<{ open: boolean; game: Game | null }>({ open: false, game: null });
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadWallet();
  }, [token]);

  const loadWallet = async () => {
    if (!token) {
      setIsLoadingWallet(false);
      return;
    }
    try {
      const data = await get<WalletData>("/api/wallet");
      if (data) {
        setWalletData(data);
      }
    } catch (error) {
      console.error("Failed to load wallet:", error);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const gamesWithPricesAndOwnership = useMemo(() => {
    return storeGames.map(game => ({
      ...game,
      price: gamePrices[game.id] || 29.99,
      isOwned: walletData?.ownedGames?.includes(game.id) || false,
    }));
  }, [storeGames, walletData]);

  const filteredGames = useMemo(() => {
    let result = [...gamesWithPricesAndOwnership];

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
  }, [gamesWithPricesAndOwnership, searchQuery, selectedCategory]);

  const handleBuyGame = (game: Game) => {
    setBuyDialog({ open: true, game });
  };

  const confirmPurchase = async () => {
    if (!buyDialog.game) return;

    const game = buyDialog.game;
    const price = game.price || 29.99;

    if (!walletData || walletData.balance < price) {
      toast({
        title: "Insufficient Funds",
        description: `You need $${price.toFixed(2)} to buy this game. Your balance is $${(walletData?.balance || 0).toFixed(2)}. Please add funds to your wallet.`,
        variant: "destructive",
      });
      setBuyDialog({ open: false, game: null });
      return;
    }

    setIsPurchasing(true);
    try {
      const result = await post<{ message: string; balance: number; ownedGames: string[] }>("/api/wallet/purchase-game", {
        gameId: game.id,
      });

      if (result) {
        setWalletData(prev => prev ? {
          ...prev,
          balance: result.balance,
          ownedGames: result.ownedGames,
        } : null);

        toast({
          title: "Purchase Successful",
          description: `You now own ${game.title}! You can install it anytime.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error?.message || "Failed to purchase game",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
      setBuyDialog({ open: false, game: null });
    }
  };

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

            <div className="flex items-center gap-4">
              {walletData && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-card-border">
                  <span className="text-sm text-muted-foreground">Balance:</span>
                  <span className="text-sm font-semibold text-primary" data-testid="text-wallet-balance">
                    ${walletData.balance.toFixed(2)}
                  </span>
                </div>
              )}
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

          <div className="flex items-center gap-2 md:ml-auto flex-wrap">
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Available Games
            </h2>
            <span className="text-sm text-muted-foreground">{filteredGames.length} games</span>
          </div>

          {isLoadingWallet ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredGames.length === 0 ? (
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
                    onBuy={handleBuyGame}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={buyDialog.open} onOpenChange={(open) => !isPurchasing && setBuyDialog({ open, game: open ? buyDialog.game : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase {buyDialog.game?.title} for ${buyDialog.game?.price?.toFixed(2)}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Your Balance:</span>
              <span className="font-semibold">${(walletData?.balance || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted mt-2">
              <span className="text-sm text-muted-foreground">Game Price:</span>
              <span className="font-semibold text-primary">${buyDialog.game?.price?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-card-border mt-2">
              <span className="text-sm font-medium">After Purchase:</span>
              <span className="font-semibold">
                ${((walletData?.balance || 0) - (buyDialog.game?.price || 0)).toFixed(2)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialog({ open: false, game: null })} disabled={isPurchasing}>
              Cancel
            </Button>
            <Button onClick={confirmPurchase} disabled={isPurchasing}>
              {isPurchasing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Purchase"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
