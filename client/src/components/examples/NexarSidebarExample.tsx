import { useState } from "react";
import NexarSidebar, { type NavPage } from "../nexar/NexarSidebar";

export default function NexarSidebarExample() {
  const [currentPage, setCurrentPage] = useState<NavPage>("home");

  return (
    <div className="h-screen bg-background">
      <NexarSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        downloadCount={3}
      />
    </div>
  );
}
