import GameCard from "../nexar/GameCard";

const mockGames = [
  {
    id: "1",
    title: "Cyber Assault 2087",
    isInstalled: true,
    playTime: 245,
    size: "45.2 GB",
    genre: "Action RPG"
  },
  {
    id: "2", 
    title: "Stellar Odyssey",
    isInstalled: false,
    isSteam: true,
    genre: "Adventure"
  },
  {
    id: "3",
    title: "Shadow Protocol",
    isInstalled: true,
    downloadProgress: 67,
    genre: "Stealth"
  }
];

export default function GameCardExample() {
  return (
    <div className="grid grid-cols-3 gap-4 p-6 bg-background">
      {mockGames.map(game => (
        <GameCard
          key={game.id}
          game={game}
          onPlay={(g) => console.log("Playing", g.title)}
          onInstall={(g) => console.log("Installing", g.title)}
        />
      ))}
    </div>
  );
}
