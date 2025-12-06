import FeaturedCarousel from "../nexar/FeaturedCarousel";

const mockFeaturedGames = [
  { id: "1", title: "Neon Uprising", genre: "Cyberpunk Action RPG", isInstalled: true },
  { id: "2", title: "Galactic Frontier", genre: "Space Exploration", isInstalled: false },
  { id: "3", title: "Phantom Strike", genre: "Tactical Shooter", isInstalled: true }
];

export default function FeaturedCarouselExample() {
  return (
    <div className="p-6 bg-background">
      <FeaturedCarousel
        games={mockFeaturedGames}
        onPlay={(game) => console.log("Play", game.title)}
        onDetails={(game) => console.log("Details", game.title)}
      />
    </div>
  );
}
