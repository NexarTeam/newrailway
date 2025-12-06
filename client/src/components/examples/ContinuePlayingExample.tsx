import ContinuePlaying from "../nexar/ContinuePlaying";

const mockRecentGames = [
  { id: "1", title: "Cyber Assault 2087", isInstalled: true, playTime: 245 },
  { id: "2", title: "Stellar Odyssey", isInstalled: true, playTime: 180 },
  { id: "3", title: "Shadow Protocol", isInstalled: true, playTime: 92 },
  { id: "4", title: "Neon Drift", isInstalled: true, playTime: 45 },
  { id: "5", title: "Arctic Siege", isInstalled: true, playTime: 210 },
];

export default function ContinuePlayingExample() {
  return (
    <div className="p-6 bg-background">
      <ContinuePlaying
        games={mockRecentGames}
        onPlay={(game) => console.log("Playing", game.title)}
        onViewAll={() => console.log("View all")}
      />
    </div>
  );
}
