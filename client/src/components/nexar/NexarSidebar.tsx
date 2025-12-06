import { motion } from "framer-motion";
import { Home, Library, ShoppingBag, Download, Settings, Gamepad2, User, Users, MessageCircle, Trophy, Cloud, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import NexarLogo from "./NexarLogo";

export type NavPage = "home" | "library" | "store" | "downloads" | "settings" | "profile" | "friends" | "messages" | "achievements" | "cloud";

interface NexarSidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  downloadCount?: number;
  user?: { username: string; avatarUrl?: string } | null;
  onLogout?: () => void;
}

const navItems: { id: NavPage; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "library", label: "Library", icon: Library },
  { id: "store", label: "Store", icon: ShoppingBag },
  { id: "downloads", label: "Downloads", icon: Download },
];

const nexarIdItems: { id: NavPage; label: string; icon: typeof Home }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "friends", label: "Friends", icon: Users },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "cloud", label: "Cloud Saves", icon: Cloud },
];

const settingsItems: { id: NavPage; label: string; icon: typeof Home }[] = [
  { id: "settings", label: "Settings", icon: Settings },
];

export default function NexarSidebar({ currentPage, onNavigate, downloadCount, user, onLogout }: NexarSidebarProps) {
  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col" data-testid="nexar-sidebar">
      <div className="p-4">
        <NexarLogo size="md" />
      </div>

      <Separator className="mx-4 w-auto" />

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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

        <Separator className="my-3" />

        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
          NexarID
        </p>

        {nexarIdItems.map((item) => {
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
                    layoutId="activeIndicatorId"
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

      <div className="p-4 mt-auto space-y-3">
        {user && (
          <div className="p-3 rounded-lg bg-card border border-card-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-primary/50">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate" data-testid="sidebar-username">
                  {user.username}
                </p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
              {onLogout && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onLogout}
                  data-testid="button-logout"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

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
