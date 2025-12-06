import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, MessageCircle, X } from "lucide-react";

import firstFriendImage from "@assets/first_friend_ach_1765038288978.png";

const achievementImageMap: Record<string, string> = {
  first_friend: firstFriendImage,
};

interface Message {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  timestamp: string;
}

interface ConversationPartner {
  id: string;
  username: string;
  avatarUrl: string;
}

interface Conversation {
  partner: ConversationPartner;
  lastMessage: Message | null;
}

interface BaseNotification {
  id: string;
  type: "achievement" | "message";
  createdAt: number;
}

interface AchievementNotification extends BaseNotification {
  type: "achievement";
  achievementId: string;
  name: string;
  description: string;
  icon: string;
}

interface MessageNotification extends BaseNotification {
  type: "message";
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  preview: string;
}

type Notification = AchievementNotification | MessageNotification;

interface NotificationContextValue {
  notifications: Notification[];
  showAchievement: (achievement: { id: string; name: string; description: string; icon: string }) => void;
  showMessage: (message: { senderId: string; senderUsername: string; senderAvatar?: string; preview: string }) => void;
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string | null;
  token?: string | null;
}

const POLLING_INTERVAL = 15000; // 15 seconds

function decodeJwtPayload(token: string): { userId?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function NotificationProvider({ children, userId, token }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [location, setLocation] = useLocation();
  const seenMessageIds = useRef<Set<string>>(new Set());
  const lastPollTime = useRef<number>(Date.now());
  const isInitialized = useRef(false);
  const prevUserIdRef = useRef<string | null | undefined>(null);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => {
      const exists = prev.some((n) => n.id === notification.id);
      if (exists) return prev;
      return [...prev, notification].slice(-5);
    });

    setTimeout(() => {
      dismissNotification(notification.id);
    }, 5000);
  }, [dismissNotification]);

  const showAchievement = useCallback((achievement: { id: string; name: string; description: string; icon: string }) => {
    const notification: AchievementNotification = {
      id: `achievement-${achievement.id}-${Date.now()}`,
      type: "achievement",
      achievementId: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      createdAt: Date.now(),
    };
    addNotification(notification);
  }, [addNotification]);

  const showMessage = useCallback((message: { senderId: string; senderUsername: string; senderAvatar?: string; preview: string }) => {
    const notification: MessageNotification = {
      id: `message-${message.senderId}-${Date.now()}`,
      type: "message",
      senderId: message.senderId,
      senderUsername: message.senderUsername,
      senderAvatar: message.senderAvatar,
      preview: message.preview,
      createdAt: Date.now(),
    };
    addNotification(notification);
  }, [addNotification]);

  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      seenMessageIds.current.clear();
      lastPollTime.current = Date.now();
      isInitialized.current = false;
      prevUserIdRef.current = userId;
    }

    if (!token || !userId) {
      return;
    }

    const currentUserId = userId;

    const pollMessages = async () => {
      try {
        const response = await fetch("/api/messages/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) return;
        
        const conversations: Conversation[] = await response.json();
        
        const isOnMessagesPage = locationRef.current === "/messages";
        
        for (const conv of conversations) {
          const lastMsg = conv.lastMessage;
          if (!lastMsg) continue;
          
          if (lastMsg.fromId === currentUserId) continue;
          
          if (seenMessageIds.current.has(lastMsg.id)) continue;
          
          seenMessageIds.current.add(lastMsg.id);
          
          if (!isInitialized.current) continue;
          
          const msgTime = new Date(lastMsg.timestamp).getTime();
          if (msgTime < lastPollTime.current) continue;
          
          if (!isOnMessagesPage) {
            addNotification({
              id: `message-${lastMsg.id}`,
              type: "message",
              senderId: conv.partner.id,
              senderUsername: conv.partner.username,
              senderAvatar: conv.partner.avatarUrl,
              preview: lastMsg.text.substring(0, 100),
              createdAt: Date.now(),
            });
          }
        }
        
        lastPollTime.current = Date.now();
        isInitialized.current = true;
      } catch (error) {
        console.error("Failed to poll messages:", error);
      }
    };

    pollMessages();

    const intervalId = setInterval(pollMessages, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [addNotification, token, userId]);

  const handleNotificationClick = (notification: Notification) => {
    dismissNotification(notification.id);
    if (notification.type === "achievement") {
      setLocation("/achievements");
    } else {
      setLocation("/messages");
    }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <NotificationContext.Provider value={{ notifications, showAchievement, showMessage, dismissNotification }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={() => handleNotificationClick(notification)}
              className="pointer-events-auto cursor-pointer min-w-[320px] max-w-[400px] bg-[#111111] border border-[#2A2A2A] rounded-lg overflow-hidden shadow-lg shadow-black/50"
              data-testid={`notification-${notification.type}`}
            >
              <div className="h-1 w-full bg-gradient-to-r from-[#d00024] to-[#ff1a3d]" />
              
              <div className="p-4 flex items-start gap-3">
                {notification.type === "achievement" ? (
                  <>
                    {achievementImageMap[notification.achievementId] ? (
                      <div 
                        className="flex-shrink-0 w-12 h-12"
                        style={{
                          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                        }}
                      >
                        <img 
                          src={achievementImageMap[notification.achievementId]} 
                          alt={notification.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#d00024]/20 border border-[#d00024]/50 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-[#d00024]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#d00024] text-xs font-semibold uppercase tracking-wider">Achievement Unlocked</span>
                      </div>
                      <h4 className="text-[#EAEAEA] font-bold text-sm truncate">{notification.name}</h4>
                      <p className="text-[#A3A3A3] text-xs truncate">{notification.description}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar className="flex-shrink-0 w-12 h-12 border-2 border-[#d00024]/50">
                      <AvatarImage src={notification.senderAvatar} />
                      <AvatarFallback className="bg-[#2A2A2A] text-[#EAEAEA] text-sm">
                        {getInitials(notification.senderUsername)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="w-3 h-3 text-[#d00024]" />
                        <span className="text-[#d00024] text-xs font-semibold uppercase tracking-wider">New Message</span>
                      </div>
                      <h4 className="text-[#EAEAEA] font-bold text-sm truncate">{notification.senderUsername}</h4>
                      <p className="text-[#A3A3A3] text-xs truncate">{notification.preview}</p>
                    </div>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notification.id);
                  }}
                  className="flex-shrink-0 p-1 text-[#A3A3A3] hover:text-[#EAEAEA] transition-colors"
                  data-testid="button-dismiss-notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-0.5 bg-[#d00024]/50 origin-left"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}
