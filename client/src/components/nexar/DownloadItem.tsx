import { motion } from "framer-motion";
import { Pause, Play, X, CheckCircle, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Game } from "./GameCard";

export interface DownloadInfo extends Game {
  downloadProgress: number;
  downloadSpeed?: string;
  timeRemaining?: string;
  status: "downloading" | "paused" | "completed" | "queued";
}

interface DownloadItemProps {
  download: DownloadInfo;
  onPause?: (download: DownloadInfo) => void;
  onResume?: (download: DownloadInfo) => void;
  onCancel?: (download: DownloadInfo) => void;
  onPlay?: (download: DownloadInfo) => void;
}

export default function DownloadItem({
  download,
  onPause,
  onResume,
  onCancel,
  onPlay
}: DownloadItemProps) {
  const isCompleted = download.status === "completed";
  const isPaused = download.status === "paused";
  const isDownloading = download.status === "downloading";
  const isQueued = download.status === "queued";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-4 p-4 rounded-lg bg-card border border-card-border"
      data-testid={`download-item-${download.id}`}
    >
      <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
        {download.coverUrl ? (
          <img src={download.coverUrl} alt={download.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-primary" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium text-foreground truncate">{download.title}</h4>
          {isCompleted && (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          )}
        </div>

        {!isCompleted && (
          <>
            <Progress value={download.downloadProgress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isQueued && "Queued"}
                {isPaused && "Paused"}
                {isDownloading && `${download.downloadProgress}% complete`}
              </span>
              <span className="flex items-center gap-3">
                {download.downloadSpeed && isDownloading && (
                  <span>{download.downloadSpeed}</span>
                )}
                {download.timeRemaining && isDownloading && (
                  <span>{download.timeRemaining} remaining</span>
                )}
              </span>
            </div>
          </>
        )}

        {isCompleted && (
          <p className="text-sm text-muted-foreground">
            {download.size} installed
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isCompleted ? (
          <Button onClick={() => onPlay?.(download)} data-testid={`button-play-download-${download.id}`}>
            <Play className="w-4 h-4 mr-2" />
            Play
          </Button>
        ) : (
          <>
            {(isDownloading || isPaused) && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => isPaused ? onResume?.(download) : onPause?.(download)}
                data-testid={`button-pause-resume-${download.id}`}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={() => onCancel?.(download)}
              data-testid={`button-cancel-${download.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
