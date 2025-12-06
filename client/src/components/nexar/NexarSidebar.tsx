import { motion } from "framer-motion";
import { Home, Library, ShoppingBag, Download, Settings, Upload, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import NexarLogo from "./NexarLogo";

export type NavPage = "home" | "library" | "store" | "downloads" | "settings" | "steam-import";

interface NexarSidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  downloadCount?: number;
}

const navItems: { id: NavPage; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "library", label: "Library", icon: Library },
  { id: "store", label: "Store", icon: ShoppingBag },
  { id: "downloads", label: "Downloads", icon: Download },
];

const settingsItems: { id: NavPage; label: string; icon: typeof Home }[] = [
  { id: "steam-import", label: "Steam Import", icon: Upload },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function NexarSidebar({ currentPage, onNavigate, downloadCount }: NexarSidebarProps) {
  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col" data-testid="nexar-sidebar">
      <div className="p-4">
        <NexarLogo size="md" />
      </div>

      <Separator className="mx-4 w-auto" />

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <motion.div
              key={item.id}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 relative ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
                onClick={() => onNavigate(item.id)}
                data-testid={`nav-${item.id}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span>{item.label}</span>
                {item.id === "downloads" && downloadCount && downloadCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {downloadCount}
                  </span>
                )}
              </Button>
            </motion.div>
          );
        })}
      </nav>

      <Separator className="mx-4 w-auto" />

      <div className="p-4 space-y-1">
        {settingsItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <motion.div
              key={item.id}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 relative ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
                onClick={() => onNavigate(item.id)}
                data-testid={`nav-${item.id}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span>{item.label}</span>
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 mt-auto">
        <div className="p-3 rounded-lg bg-card border border-card-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">NexarOS v1.0</p>
              <p className="text-xs text-muted-foreground">Up to date</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
