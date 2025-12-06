import DownloadItem, { type DownloadInfo } from "../nexar/DownloadItem";

const mockDownloads: DownloadInfo[] = [
  {
    id: "1",
    title: "Cyber Assault 2087",
    isInstalled: false,
    downloadProgress: 67,
    downloadSpeed: "45.2 MB/s",
    timeRemaining: "12 min",
    status: "downloading",
    size: "45.2 GB"
  },
  {
    id: "2",
    title: "Stellar Odyssey",
    isInstalled: false,
    downloadProgress: 34,
    status: "paused",
    size: "32.1 GB"
  },
  {
    id: "3",
    title: "Neon Drift",
    isInstalled: true,
    downloadProgress: 100,
    status: "completed",
    size: "18.5 GB"
  }
];

export default function DownloadItemExample() {
  return (
    <div className="space-y-3 p-6 bg-background">
      {mockDownloads.map(download => (
        <DownloadItem
          key={download.id}
          download={download}
          onPause={(d) => console.log("Pause", d.title)}
          onResume={(d) => console.log("Resume", d.title)}
          onCancel={(d) => console.log("Cancel", d.title)}
          onPlay={(d) => console.log("Play", d.title)}
        />
      ))}
    </div>
  );
}
