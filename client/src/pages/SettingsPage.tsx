import { motion } from "framer-motion";
import SettingsPanel from "@/components/nexar/SettingsPanel";

export default function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full"
      data-testid="page-settings"
    >
      <SettingsPanel />
    </motion.div>
  );
}
