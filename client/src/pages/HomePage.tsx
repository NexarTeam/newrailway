import { motion } from "framer-motion";
import { ShoppingBag, Library, Download, Settings } from "lucide-react";
import FeaturedCarousel from "@/components/nexar/FeaturedCarousel";
import ContinuePlaying from "@/components/nexar/ContinuePlaying";
import QuickActionTile from "@/components/nexar/QuickActionTile";
import type { Game } from "@/components/nexar/GameCard";
import type { NavPage } from "@/components/nexar/NexarSidebar";

interface HomePageProps {
  featuredGames: Game[];
  recentGames: Game[];
  onNavigate: (page: NavPage) => void;
  onPlayGame: (game: Game) => void;
  onViewGameDetails: (game: Game) => void;
}

export default function HomePage({
  featuredGames,
  recentGames,
  onNavigate,
  onPlayGame,
  onViewGameDetails
}: HomePageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8 p-6"
      data-testid="page-home"
    >
      <FeaturedCarousel
        games={featuredGames}
        onPlay={onPlayGame}
        onDetails={onViewGameDetails}
      />

      <ContinuePlaying
        games={recentGames}
        onPlay={onPlayGame}
        onViewAll={() => onNavigate("library")}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionTile
            icon={ShoppingBag}
            title="Nexar Store"
            description="Browse & buy games"
            variant="primary"
            onClick={() => onNavigate("store")}
          />
          <QuickActionTile
            icon={Library}
            title="Game Library"
            description="Your collection"
            onClick={() => onNavigate("library")}
          />
          <QuickActionTile
            icon={Download}
            title="Downloads"
            description="Manage downloads"
            onClick={() => onNavigate("downloads")}
          />
          <QuickActionTile
            icon={Settings}
            title="Settings"
            description="System config"
            onClick={() => onNavigate("settings")}
          />
        </div>
      </section>
    </motion.div>
  );
}
