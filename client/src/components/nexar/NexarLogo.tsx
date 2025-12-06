import { motion } from "framer-motion";
import nexarLogo from "@assets/ChatGPT_Image_Dec_6,_2025,_09_06_04_AM_1765021768843.png";

interface NexarLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export default function NexarLogo({ size = "md", showText = true, className = "" }: NexarLogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-20"
  };

  return (
    <motion.div 
      className={`flex items-center gap-3 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <img 
        src={nexarLogo} 
        alt="Nexar Logo" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
      {showText && (
        <div className="flex flex-col">
          <span className="font-mono text-lg font-bold tracking-wider text-foreground">
            NexarOS
          </span>
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
            Sabre Collective
          </span>
        </div>
      )}
    </motion.div>
  );
}
