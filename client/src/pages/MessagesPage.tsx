import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, MessageCircle, ArrowLeft } from "lucide-react";

interface User {
  id: string;
  username: string;
  avatarUrl: string;
}

interface Message {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  timestamp: string;
}

interface Conversation {
  partner: User;
  lastMessage: Message | null;
}

export default function MessagesPage() {
  const { get, post } = useApi();
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const data = await get<Conversation[]>("/api/messages/conversations");
      setConversations(data);
    } catch (error) {
      toast({ title: "Error loading conversations", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (partnerId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await get<Message[]>(`/api/messages/${partnerId}`);
      setMessages(data);
    } catch (error) {
      toast({ title: "Error loading messages", variant: "destructive" });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectPartner = (partner: User) => {
    setSelectedPartner(partner);
    loadMessages(partner.id);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPartner) return;
    setIsSending(true);
    try {
      const message = await post<Message>("/api/messages", {
        toId: selectedPartner.id,
        text: newMessage,
      });
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
      fetchConversations();
    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#d00024]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex overflow-hidden"
      >
        {/* Conversations list */}
        <div
          className={`w-full md:w-80 border-r border-[#2A2A2A] flex flex-col ${
            selectedPartner ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-[#2A2A2A]">
            <h1 className="text-xl font-bold text-[#EAEAEA] uppercase tracking-wider">
              Messages
            </h1>
          </div>
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-[#A3A3A3] px-4">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm mt-2">
                  Add friends and start chatting!
                </p>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.partner.id}
                    onClick={() => handleSelectPartner(conv.partner)}
                    data-testid={`conversation-${conv.partner.id}`}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      selectedPartner?.id === conv.partner.id
                        ? "bg-[#d00024]/20 border border-[#d00024]"
                        : "hover:bg-[#1A1A1A]"
                    }`}
                  >
                    <Avatar className="w-12 h-12 border border-[#333333]">
                      <AvatarImage src={conv.partner.avatarUrl} />
                      <AvatarFallback className="bg-[#2A2A2A] text-[#EAEAEA]">
                        {getInitials(conv.partner.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[#EAEAEA] font-medium truncate">
                        {conv.partner.username}
                      </p>
                      {conv.lastMessage && (
                        <p className="text-[#A3A3A3] text-sm truncate">
                          {conv.lastMessage.fromId === user?.id ? "You: " : ""}
                          {conv.lastMessage.text}
                        </p>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <span className="text-[#666666] text-xs">
                        {formatTime(conv.lastMessage.timestamp)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat view */}
        <div
          className={`flex-1 flex flex-col ${
            !selectedPartner ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedPartner ? (
            <>
              <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="md:hidden text-[#EAEAEA]"
                  onClick={() => setSelectedPartner(null)}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10 border border-[#333333]">
                  <AvatarImage src={selectedPartner.avatarUrl} />
                  <AvatarFallback className="bg-[#2A2A2A] text-[#EAEAEA]">
                    {getInitials(selectedPartner.username)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold text-[#EAEAEA]">
                  {selectedPartner.username}
                </h2>
              </div>

              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-[#d00024]" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isOwn = msg.fromId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div
                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              isOwn
                                ? "bg-[#d00024] text-white rounded-br-sm"
                                : "bg-[#2A2A2A] text-[#EAEAEA] rounded-bl-sm"
                            }`}
                          >
                            <p>{msg.text}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? "text-white/70" : "text-[#666666]"
                              }`}
                            >
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-[#2A2A2A]">
                <div className="flex gap-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    disabled={isSending}
                    data-testid="input-message"
                    className="flex-1 bg-[#111111] border-[#333333] text-[#EAEAEA] focus:border-[#d00024]"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isSending || !newMessage.trim()}
                    data-testid="button-send"
                    className="bg-[#d00024] hover:bg-[#b0001e] text-white"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#A3A3A3]">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
