import { motion } from "framer-motion";
import SteamImport from "@/components/nexar/SteamImport";
import type { Game } from "@/components/nexar/GameCard";

interface SteamImportPageProps {
  onImport: (games: Game[]) => void;
}

export default function SteamImportPage({ onImport }: SteamImportPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 max-w-3xl mx-auto"
      data-testid="page-steam-import"
    >
      <SteamImport onImport={onImport} />
    </motion.div>
  );
}
