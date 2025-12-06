import { useState } from "react";
import GameDetailsModal from "../nexar/GameDetailsModal";
import { Button } from "@/components/ui/button";

const mockGame = {
  id: "1",
  title: "Cyber Assault 2087",
  isInstalled: true,
  playTime: 245,
  size: "45.2 GB",
  genre: "Action RPG",
  rating: 4.5
};

export default function GameDetailsModalExample() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-6 bg-background">
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <GameDetailsModal
        game={mockGame}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onPlay={(g) => console.log("Playing", g.title)}
        onDelete={(g) => console.log("Deleting", g.title)}
      />
    </div>
  );
}
