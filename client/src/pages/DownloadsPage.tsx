import { motion, AnimatePresence } from "framer-motion";
import { Download, Pause, Play, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DownloadItem, { type DownloadInfo } from "@/components/nexar/DownloadItem";

interface DownloadsPageProps {
  downloads: DownloadInfo[];
  onPause: (download: DownloadInfo) => void;
  onResume: (download: DownloadInfo) => void;
  onCancel: (download: DownloadInfo) => void;
  onPlay: (download: DownloadInfo) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
}

export default function DownloadsPage({
  downloads,
  onPause,
  onResume,
  onCancel,
  onPlay,
  onPauseAll,
  onResumeAll
}: DownloadsPageProps) {
  const activeDownloads = downloads.filter(d => d.status === "downloading" || d.status === "paused");
  const queuedDownloads = downloads.filter(d => d.status === "queued");
  const completedDownloads = downloads.filter(d => d.status === "completed");

  const hasActiveDownloads = activeDownloads.length > 0 || queuedDownloads.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 space-y-6"
      data-testid="page-downloads"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Download className="w-6 h-6 text-primary" />
            Downloads
          </h1>
          <p className="text-muted-foreground">
            {activeDownloads.length} active, {queuedDownloads.length} queued, {completedDownloads.length} completed
          </p>
        </div>

        {hasActiveDownloads && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onPauseAll}
              data-testid="button-pause-all"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onResumeAll}
              data-testid="button-resume-all"
            >
              <Play className="w-4 h-4 mr-2" />
              Resume All
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-2" data-testid="tab-active">
            <Download className="w-4 h-4" />
            Active ({activeDownloads.length + queuedDownloads.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2" data-testid="tab-completed">
            <CheckCircle className="w-4 h-4" />
            Completed ({completedDownloads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <AnimatePresence>
            {activeDownloads.length === 0 && queuedDownloads.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <Download className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No active downloads</h3>
                <p className="text-muted-foreground">
                  Games you download from the store will appear here
                </p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {activeDownloads.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Downloading
                    </h3>
                    <div className="space-y-2">
                      {activeDownloads.map((download) => (
                        <DownloadItem
                          key={download.id}
                          download={download}
                          onPause={onPause}
                          onResume={onResume}
                          onCancel={onCancel}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {queuedDownloads.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Queued
                    </h3>
                    <div className="space-y-2">
                      {queuedDownloads.map((download) => (
                        <DownloadItem
                          key={download.id}
                          download={download}
                          onCancel={onCancel}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <AnimatePresence>
            {completedDownloads.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <CheckCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No completed downloads</h3>
                <p className="text-muted-foreground">
                  Finished downloads will appear here
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {completedDownloads.map((download) => (
                  <DownloadItem
                    key={download.id}
                    download={download}
                    onPlay={onPlay}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
