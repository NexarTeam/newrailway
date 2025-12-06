import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UpdateInfo {
  version: string;
  releaseDate: string;
  size: string;
  changelog: string[];
}

interface UpdateCheckerProps {
  currentVersion?: string;
  onDismiss?: () => void;
}

export default function UpdateChecker({ 
  currentVersion = "1.0.0",
  onDismiss 
}: UpdateCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const checkForUpdates = async () => {
    setIsChecking(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const mockUpdate: UpdateInfo = {
      version: "1.1.0",
      releaseDate: "December 2025",
      size: "245 MB",
      changelog: [
        "Improved game library performance",
        "Enhanced Nexar Store features", 
        "Enhanced download manager",
        "Fixed various UI bugs"
      ]
    };
    setUpdateAvailable(mockUpdate);
    setIsChecking(false);
  };

  const startUpdate = () => {
    setIsDownloading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setIsDownloading(false);
        setIsComplete(true);
      }
      setDownloadProgress(Math.min(progress, 100));
    }, 500);
  };

  if (!updateAvailable && !isChecking) {
    return (
      <Button 
        variant="outline" 
        onClick={checkForUpdates}
        className="gap-2"
        data-testid="button-check-updates"
      >
        <RefreshCw className="w-4 h-4" />
        Check for Updates
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 w-96 bg-card border border-card-border rounded-xl shadow-xl overflow-hidden z-50"
        data-testid="update-checker"
      >
        <div className="border-t-4 border-primary" />
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {isComplete ? (
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-foreground">
                  {isChecking && "Checking for updates..."}
                  {updateAvailable && !isComplete && "Update Available"}
                  {isComplete && "Update Complete"}
                </h3>
                {updateAvailable && (
                  <p className="text-sm text-muted-foreground">
                    Version {updateAvailable.version}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDismiss}
              data-testid="button-dismiss-update"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {isChecking && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {updateAvailable && !isDownloading && !isComplete && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Release Date: {updateAvailable.releaseDate}</p>
                <p>Size: {updateAvailable.size}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-foreground mb-2">What's new:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {updateAvailable.changelog.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-1">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={startUpdate}
                  data-testid="button-start-update"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Update Now
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onDismiss}
                  data-testid="button-later"
                >
                  Later
                </Button>
              </div>
            </div>
          )}

          {isDownloading && (
            <div className="space-y-3">
              <Progress value={downloadProgress} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Downloading...</span>
                <span className="text-primary font-medium">{Math.round(downloadProgress)}%</span>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                NexarOS has been updated to version {updateAvailable?.version}. Restart to apply changes.
              </p>
              <Button className="w-full" data-testid="button-restart">
                Restart Now
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
