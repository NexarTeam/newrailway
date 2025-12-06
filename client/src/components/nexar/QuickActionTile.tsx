import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface QuickActionTileProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick?: () => void;
  variant?: "default" | "primary";
}

export default function QuickActionTile({
  icon: Icon,
  title,
  description,
  onClick,
  variant = "default"
}: QuickActionTileProps) {
  return (
    <motion.button
      className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border transition-all text-center
        ${variant === "primary" 
          ? "bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50" 
          : "bg-card border-card-border hover:bg-card/80 hover:border-muted-foreground/20"
        }
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
      `}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      data-testid={`tile-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className={`p-4 rounded-full ${variant === "primary" ? "bg-primary/20" : "bg-muted"}`}>
        <Icon className={`w-8 h-8 ${variant === "primary" ? "text-primary" : "text-foreground"}`} />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </motion.button>
  );
}
