import QuickActionTile from "../nexar/QuickActionTile";
import { ShoppingBag, Library, Settings, Download } from "lucide-react";

export default function QuickActionTileExample() {
  return (
    <div className="grid grid-cols-4 gap-4 p-6 bg-background">
      <QuickActionTile
        icon={ShoppingBag}
        title="Store"
        description="Browse games"
        variant="primary"
        onClick={() => console.log("Store clicked")}
      />
      <QuickActionTile
        icon={Library}
        title="Library"
        description="Your games"
        onClick={() => console.log("Library clicked")}
      />
      <QuickActionTile
        icon={Download}
        title="Downloads"
        description="Active downloads"
        onClick={() => console.log("Downloads clicked")}
      />
      <QuickActionTile
        icon={Settings}
        title="Settings"
        description="System config"
        onClick={() => console.log("Settings clicked")}
      />
    </div>
  );
}
