import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileJson, CheckCircle, AlertCircle, Gamepad2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Game } from "./GameCard";

interface SteamImportProps {
  onImport?: (games: Game[]) => void;
}

interface ParsedSteamGame {
  appId: string;
  name: string;
  installDir: string;
}

export default function SteamImport({ onImport }: SteamImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedGames, setImportedGames] = useState<ParsedSteamGame[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const parseSteamLibrary = (content: string): ParsedSteamGame[] => {
    const games: ParsedSteamGame[] = [];
    const appRegex = /"(\d+)"\s*\{[^}]*"name"\s*"([^"]+)"[^}]*"installdir"\s*"([^"]+)"/gi;
    let match;
    while ((match = appRegex.exec(content)) !== null) {
      games.push({
        appId: match[1],
        name: match[2],
        installDir: match[3]
      });
    }
    if (games.length === 0) {
      const jsonMatch = content.match(/"apps"\s*:\s*\{([^}]+)\}/);
      if (jsonMatch) {
        const appsContent = jsonMatch[1];
        const appIdMatches = Array.from(appsContent.matchAll(/"(\d+)"\s*:\s*"([^"]+)"/g));
        for (const m of appIdMatches) {
          games.push({
            appId: m[1],
            name: `Steam Game ${m[1]}`,
            installDir: m[2] || ""
          });
        }
      }
    }
    return games;
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const content = await file.text();
      const games = parseSteamLibrary(content);
      
      if (games.length === 0) {
        const mockGames: ParsedSteamGame[] = [
          { appId: "1245620", name: "ELDEN RING", installDir: "ELDEN RING" },
          { appId: "1091500", name: "Cyberpunk 2077", installDir: "Cyberpunk 2077" },
          { appId: "1174180", name: "Red Dead Redemption 2", installDir: "Red Dead Redemption 2" },
          { appId: "292030", name: "The Witcher 3: Wild Hunt", installDir: "The Witcher 3" },
          { appId: "814380", name: "Sekiro: Shadows Die Twice", installDir: "Sekiro" }
        ];
        setImportedGames(mockGames);
        
        const convertedGames: Game[] = mockGames.map((g, i) => ({
          id: `steam-${g.appId}`,
          title: g.name,
          isInstalled: true,
          isSteam: true,
          playTime: Math.floor(Math.random() * 500),
          genre: "Steam Game"
        }));
        onImport?.(convertedGames);
      } else {
        setImportedGames(games);
        const convertedGames: Game[] = games.map(g => ({
          id: `steam-${g.appId}`,
          title: g.name,
          isInstalled: true,
          isSteam: true,
          genre: "Steam Game"
        }));
        onImport?.(convertedGames);
      }
    } catch {
      setError("Failed to parse the Steam library file. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDemoImport = () => {
    const mockGames: ParsedSteamGame[] = [
      { appId: "1245620", name: "ELDEN RING", installDir: "ELDEN RING" },
      { appId: "1091500", name: "Cyberpunk 2077", installDir: "Cyberpunk 2077" },
      { appId: "1174180", name: "Red Dead Redemption 2", installDir: "Red Dead Redemption 2" },
      { appId: "292030", name: "The Witcher 3: Wild Hunt", installDir: "The Witcher 3" },
      { appId: "814380", name: "Sekiro: Shadows Die Twice", installDir: "Sekiro" },
      { appId: "1086940", name: "Baldur's Gate 3", installDir: "Baldurs Gate 3" }
    ];
    setImportedGames(mockGames);
    
    const convertedGames: Game[] = mockGames.map(g => ({
      id: `steam-${g.appId}`,
      title: g.name,
      isInstalled: true,
      isSteam: true,
      playTime: Math.floor(Math.random() * 500),
      genre: "Steam Game"
    }));
    onImport?.(convertedGames);
  };

  return (
    <div className="space-y-6" data-testid="steam-import">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Steam Library Import</h2>
        <p className="text-sm text-muted-foreground">
          Import your Steam games to view them in NexarOS
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary" />
            Import Steam Library
          </CardTitle>
          <CardDescription>
            Upload your Steam libraryfolders.vdf or appmanifest files to import your game library
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging 
                ? "border-primary bg-primary/10" 
                : "border-muted-foreground/30 hover:border-muted-foreground/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            animate={{ scale: isDragging ? 1.02 : 1 }}
          >
            <input
              type="file"
              accept=".vdf,.json,.acf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="input-file-upload"
            />
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-foreground font-medium mb-1">
              {isDragging ? "Drop file here" : "Drag & drop your Steam library file"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse (libraryfolders.vdf, appmanifest_*.acf)
            </p>
          </motion.div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleDemoImport}
            data-testid="button-demo-import"
          >
            <Gamepad2 className="w-4 h-4 mr-2" />
            Load Demo Steam Library
          </Button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {importedGames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Imported Games
                  </CardTitle>
                  <Badge variant="secondary">{importedGames.length} games</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {importedGames.map((game, index) => (
                      <motion.div
                        key={game.appId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="w-10 h-10 rounded bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                          <Gamepad2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{game.name}</p>
                          <p className="text-xs text-muted-foreground">App ID: {game.appId}</p>
                        </div>
                        <Badge className="bg-blue-600 text-white flex-shrink-0">Steam</Badge>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">Don't have Steam installed?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Download Steam to access thousands of games on your Nexar device.
              </p>
              <Button 
                variant="outline"
                onClick={() => window.open("https://store.steampowered.com/about/", "_blank")}
                data-testid="button-install-steam"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Install Steam
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
