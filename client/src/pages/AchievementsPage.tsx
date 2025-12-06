import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, User, Users, MessageCircle, Cloud, Heart, MessagesSquare, Database, Lock, Code } from "lucide-react";

import firstFriendImage from "@assets/first_friend_ach_(1)_1765039658293.png";
import socialButterflyImage from "@assets/social_butterfly_ach_(1)_1765040235877.png";
import firstLoginImage from "@assets/first_login_ach_(1)_1765040378073.png";
import developerImage from "@assets/developer_ach_(1)_1765040424106.png";
import messengerImage from "@assets/messenger_ach_(1)_1765040734815.png";
import chatMasterImage from "@assets/chat_master_ach_(1)_1765041253777.png";
import profileCompleteImage from "@assets/profile_complete_(1)_1765042660861.png";

const achievementImageMap: Record<string, string> = {
  first_friend: firstFriendImage,
  social_butterfly: socialButterflyImage,
  first_login: firstLoginImage,
  developer: developerImage,
  messenger: messengerImage,
  chat_master: chatMasterImage,
  profile_complete: profileCompleteImage,
};

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

const iconMap: Record<string, typeof Trophy> = {
  trophy: Trophy,
  user: User,
  users: Users,
  "message-circle": MessageCircle,
  cloud: Cloud,
  heart: Heart,
  "messages-square": MessagesSquare,
  database: Database,
  code: Code,
};

export default function AchievementsPage() {
  const { get } = useApi();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const data = await get<Achievement[]>("/api/achievements");
        setAchievements(data);
      } catch (error) {
        toast({ title: "Error loading achievements", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#d00024]" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[#EAEAEA] uppercase tracking-wider">
            Achievements
          </h1>
          <div className="bg-[#1A1A1A] px-4 py-2 rounded-xl border border-[#2A2A2A]">
            <span className="text-[#d00024] font-bold">{unlockedCount}</span>
            <span className="text-[#A3A3A3]"> / {achievements.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement, index) => {
            const IconComponent = iconMap[achievement.icon] || Trophy;
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                data-testid={`achievement-${achievement.id}`}
                className={`relative p-5 rounded-2xl border transition-all ${
                  achievement.unlocked
                    ? "bg-[#1A1A1A] border-[#d00024]/50 shadow-lg shadow-[#d00024]/10"
                    : "bg-[#111111] border-[#2A2A2A] opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  {achievementImageMap[achievement.id] ? (
                    <img 
                      src={achievementImageMap[achievement.id]} 
                      alt={achievement.name}
                      className={`w-24 h-24 flex-shrink-0 object-contain ${
                        !achievement.unlocked && "opacity-40 grayscale"
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        achievement.unlocked
                          ? "bg-[#d00024]/20 text-[#d00024]"
                          : "bg-[#2A2A2A] text-[#666666]"
                      }`}
                    >
                      {achievement.unlocked ? (
                        <IconComponent className="w-7 h-7" />
                      ) : (
                        <Lock className="w-7 h-7" />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3
                      className={`font-semibold text-lg ${
                        achievement.unlocked ? "text-[#EAEAEA]" : "text-[#666666]"
                      }`}
                    >
                      {achievement.name}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${
                        achievement.unlocked ? "text-[#A3A3A3]" : "text-[#555555]"
                      }`}
                    >
                      {achievement.description}
                    </p>
                    {achievement.unlocked && achievement.unlockedAt && (
                      <p className="text-xs text-[#d00024] mt-2">
                        Unlocked {formatDate(achievement.unlockedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {achievement.unlocked && (
                  <div className="absolute top-3 right-3">
                    <Trophy className="w-5 h-5 text-[#d00024]" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
