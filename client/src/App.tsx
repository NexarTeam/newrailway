import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

import NexarSidebar, { type NavPage } from "@/components/nexar/NexarSidebar";
import GameDetailsModal from "@/components/nexar/GameDetailsModal";
import UpdateChecker from "@/components/nexar/UpdateChecker";
import type { Game } from "@/components/nexar/GameCard";
import type { DownloadInfo } from "@/components/nexar/DownloadItem";

import HomePage from "@/pages/HomePage";
import LibraryPage from "@/pages/LibraryPage";
import StorePage from "@/pages/StorePage";
import DownloadsPage from "@/pages/DownloadsPage";
import SettingsPage from "@/pages/SettingsPage";
import SteamImportPage from "@/pages/SteamImportPage";

const mockLibraryGames: Game[] = [
  { id: "lib-1", title: "Cyber Assault 2087", isInstalled: true, playTime: 245, size: "45.2 GB", genre: "Action RPG", rating: 4.5 },
  { id: "lib-2", title: "Stellar Odyssey", isInstalled: true, playTime: 180, size: "32.1 GB", genre: "Adventure", rating: 4.2 },
  { id: "lib-3", title: "Shadow Protocol", isInstalled: true, playTime: 92, size: "28.7 GB", genre: "Stealth", rating: 4.7 },
  { id: "lib-4", title: "Neon Drift", isInstalled: true, playTime: 45, size: "18.5 GB", genre: "Racing", rating: 4.0 },
  { id: "lib-5", title: "Arctic Siege", isInstalled: true, playTime: 210, size: "52.3 GB", genre: "FPS", rating: 4.3 },
  { id: "lib-6", title: "Phantom Blade", isInstalled: true, playTime: 156, size: "41.0 GB", genre: "Action", rating: 4.6 },
];

const mockStoreGames: Game[] = [
  { id: "store-1", title: "Galactic Frontier", isInstalled: false, size: "58.2 GB", genre: "Adventure", rating: 4.8 },
  { id: "store-2", title: "Dragon's Legacy", isInstalled: false, size: "72.5 GB", genre: "RPG", rating: 4.9 },
  { id: "store-3", title: "Urban Legends", isInstalled: false, size: "35.8 GB", genre: "Action", rating: 4.1 },
  { id: "store-4", title: "Quantum Break", isInstalled: false, size: "44.6 GB", genre: "Adventure", rating: 4.4 },
  { id: "store-5", title: "Warzone Elite", isInstalled: false, size: "89.2 GB", genre: "FPS", rating: 4.2 },
  { id: "store-6", title: "Speed Kings", isInstalled: false, size: "25.3 GB", genre: "Racing", rating: 3.9 },
  { id: "store-7", title: "Empire Builder", isInstalled: false, size: "15.8 GB", genre: "Strategy", rating: 4.5 },
  { id: "store-8", title: "Championship 2025", isInstalled: false, size: "48.1 GB", genre: "Sports", rating: 4.0 },
];

const mockFeaturedGames: Game[] = [
  { id: "feat-1", title: "Neon Uprising", genre: "Cyberpunk Action RPG", isInstalled: false, rating: 4.9 },
  { id: "feat-2", title: "Galactic Frontier", genre: "Space Exploration", isInstalled: false, rating: 4.8 },
  { id: "feat-3", title: "Phantom Strike", genre: "Tactical Shooter", isInstalled: true, rating: 4.7 },
];

function NexarOS() {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState<NavPage>("home");
  const [libraryGames, setLibraryGames] = useState<Game[]>(mockLibraryGames);
  const [downloads, setDownloads] = useState<DownloadInfo[]>([
    { 
      id: "dl-1", 
      title: "Cyber Assault 2087 Update", 
      isInstalled: false, 
      downloadProgress: 67, 
      downloadSpeed: "45.2 MB/s", 
      timeRemaining: "12 min", 
      status: "downloading",
      size: "4.5 GB"
    },
    {
      id: "dl-2",
      title: "Stellar Odyssey DLC",
      isInstalled: false,
      downloadProgress: 34,
      status: "paused",
      size: "8.2 GB"
    },
    {
      id: "dl-3",
      title: "Neon Drift",
      isInstalled: true,
      downloadProgress: 100,
      status: "completed",
      size: "18.5 GB"
    }
  ]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showUpdateChecker, setShowUpdateChecker] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowUpdateChecker(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDownloads(prev => prev.map(d => {
        if (d.status === "downloading" && d.downloadProgress < 100) {
          const newProgress = Math.min(d.downloadProgress + Math.random() * 5, 100);
          if (newProgress >= 100) {
            return { ...d, downloadProgress: 100, status: "completed" as const, isInstalled: true };
          }
          return { ...d, downloadProgress: newProgress };
        }
        return d;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePlayGame = useCallback((game: Game) => {
    toast({
      title: "Launching Game",
      description: `Starting ${game.title}...`,
    });
    console.log("Playing:", game.title);
  }, [toast]);

  const handleInstallGame = useCallback((game: Game) => {
    const newDownload: DownloadInfo = {
      ...game,
      downloadProgress: 0,
      downloadSpeed: "Starting...",
      timeRemaining: "Calculating...",
      status: "downloading",
    };
    setDownloads(prev => [...prev, newDownload]);
    toast({
      title: "Download Started",
      description: `${game.title} has been added to downloads`,
    });
    setCurrentPage("downloads");
  }, [toast]);

  const handleDeleteGame = useCallback((game: Game) => {
    setLibraryGames(prev => prev.filter(g => g.id !== game.id));
    toast({
      title: "Game Removed",
      description: `${game.title} has been uninstalled`,
    });
  }, [toast]);

  const handleViewGameDetails = useCallback((game: Game) => {
    setSelectedGame(game);
  }, []);

  const handleSteamImport = useCallback((games: Game[]) => {
    setLibraryGames(prev => [...prev, ...games]);
    toast({
      title: "Steam Library Imported",
      description: `${games.length} games have been added to your library`,
    });
    setCurrentPage("library");
  }, [toast]);

  const handlePauseDownload = useCallback((download: DownloadInfo) => {
    setDownloads(prev => prev.map(d => 
      d.id === download.id ? { ...d, status: "paused" as const } : d
    ));
  }, []);

  const handleResumeDownload = useCallback((download: DownloadInfo) => {
    setDownloads(prev => prev.map(d => 
      d.id === download.id ? { ...d, status: "downloading" as const } : d
    ));
  }, []);

  const handleCancelDownload = useCallback((download: DownloadInfo) => {
    setDownloads(prev => prev.filter(d => d.id !== download.id));
    toast({
      title: "Download Cancelled",
      description: `${download.title} download has been cancelled`,
    });
  }, [toast]);

  const handlePauseAll = useCallback(() => {
    setDownloads(prev => prev.map(d => 
      d.status === "downloading" ? { ...d, status: "paused" as const } : d
    ));
  }, []);

  const handleResumeAll = useCallback(() => {
    setDownloads(prev => prev.map(d => 
      d.status === "paused" ? { ...d, status: "downloading" as const } : d
    ));
  }, []);

  const activeDownloadCount = downloads.filter(d => 
    d.status === "downloading" || d.status === "paused" || d.status === "queued"
  ).length;

  const recentGames = libraryGames
    .filter(g => g.isInstalled && g.playTime && g.playTime > 0)
    .sort((a, b) => (b.playTime || 0) - (a.playTime || 0))
    .slice(0, 6);

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            featuredGames={mockFeaturedGames}
            recentGames={recentGames}
            onNavigate={setCurrentPage}
            onPlayGame={handlePlayGame}
            onViewGameDetails={handleViewGameDetails}
          />
        );
      case "library":
        return (
          <LibraryPage
            games={libraryGames}
            onPlayGame={handlePlayGame}
            onDeleteGame={handleDeleteGame}
            onViewGameDetails={handleViewGameDetails}
          />
        );
      case "store":
        return (
          <StorePage
            storeGames={mockStoreGames}
            featuredGames={mockFeaturedGames}
            onInstallGame={handleInstallGame}
            onViewGameDetails={handleViewGameDetails}
          />
        );
      case "downloads":
        return (
          <DownloadsPage
            downloads={downloads}
            onPause={handlePauseDownload}
            onResume={handleResumeDownload}
            onCancel={handleCancelDownload}
            onPlay={(d) => handlePlayGame(d)}
            onPauseAll={handlePauseAll}
            onResumeAll={handleResumeAll}
          />
        );
      case "settings":
        return <SettingsPage />;
      case "steam-import":
        return <SteamImportPage onImport={handleSteamImport} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden" data-testid="nexar-os">
      <NexarSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        downloadCount={activeDownloadCount}
      />

      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>
      </main>

      <GameDetailsModal
        game={selectedGame}
        isOpen={!!selectedGame}
        onClose={() => setSelectedGame(null)}
        onPlay={handlePlayGame}
        onInstall={handleInstallGame}
        onDelete={handleDeleteGame}
      />

      {showUpdateChecker && (
        <UpdateChecker
          currentVersion="1.0.0"
          onDismiss={() => setShowUpdateChecker(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <NexarOS />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
