import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useApi } from "@/hooks/useApi";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Check, X, Trash2, Search, Users, Send, Clock } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface User {
  id: string;
  username: string;
  avatarUrl: string;
  bio: string;
}

interface FriendRequest {
  id: string;
  sender?: User;
  receiver?: User;
}

export default function FriendsPage() {
  const { get, post, del } = useApi();
  const { showAchievement } = useNotifications();
  const { toast } = useToast();
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      const [friendsData, requestsData, sentData] = await Promise.all([
        get<User[]>("/api/friends"),
        get<FriendRequest[]>("/api/friends/requests"),
        get<FriendRequest[]>("/api/friends/sent"),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
      setSentRequests(sentData);
    } catch (error) {
      toast({ title: "Error loading friends", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await get<User[]>(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results);
    } catch (error) {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (username: string) => {
    setPendingActions((prev) => new Set(prev).add(username));
    try {
      await post("/api/friends/request", { username });
      toast({ title: "Friend request sent!" });
      setSearchResults([]);
      setSearchQuery("");
      fetchData();
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Could not send request",
        variant: "destructive",
      });
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  const handleAccept = async (requestId: string) => {
    setPendingActions((prev) => new Set(prev).add(requestId));
    try {
      const response = await post<{ message: string; unlockedAchievements?: Achievement[] }>(`/api/friends/accept/${requestId}`, {});
      toast({ title: "Friend request accepted!" });
      if (response?.unlockedAchievements?.length) {
        response.unlockedAchievements.forEach((achievement) => {
          showAchievement(achievement);
        });
      }
      fetchData();
    } catch (error) {
      toast({ title: "Failed to accept request", variant: "destructive" });
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    setPendingActions((prev) => new Set(prev).add(requestId));
    try {
      await post(`/api/friends/reject/${requestId}`, {});
      toast({ title: "Friend request rejected" });
      fetchData();
    } catch (error) {
      toast({ title: "Failed to reject request", variant: "destructive" });
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleRemove = async (friendId: string) => {
    setPendingActions((prev) => new Set(prev).add(friendId));
    try {
      await del(`/api/friends/${friendId}`);
      toast({ title: "Friend removed" });
      fetchData();
    } catch (error) {
      toast({ title: "Failed to remove friend", variant: "destructive" });
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

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
        className="max-w-3xl mx-auto"
      >
        <h1 className="text-3xl font-bold text-[#EAEAEA] mb-8 uppercase tracking-wider">
          Friends
        </h1>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] mb-6">
          <h2 className="text-lg font-semibold text-[#EAEAEA] mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#d00024]" />
            Add Friend
          </h2>
          <div className="flex gap-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by username..."
              data-testid="input-search-user"
              className="flex-1 bg-[#111111] border-[#333333] text-[#EAEAEA] focus:border-[#d00024]"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              data-testid="button-search"
              className="bg-[#d00024] hover:bg-[#b0001e] text-white"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-[#111111] rounded-lg"
                  data-testid={`search-result-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="bg-[#2A2A2A] text-[#EAEAEA]">
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[#EAEAEA] font-medium">{user.username}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(user.username)}
                    disabled={pendingActions.has(user.username)}
                    data-testid={`button-add-${user.id}`}
                    className="bg-[#d00024] hover:bg-[#b0001e] text-white"
                  >
                    {pendingActions.has(user.username) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full bg-[#111111] border border-[#2A2A2A] mb-4">
            <TabsTrigger
              value="friends"
              data-testid="tab-friends"
              className="flex-1 data-[state=active]:bg-[#d00024] data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              data-testid="tab-requests"
              className="flex-1 data-[state=active]:bg-[#d00024] data-[state=active]:text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              Requests ({requests.length})
            </TabsTrigger>
            <TabsTrigger
              value="sent"
              data-testid="tab-sent"
              className="flex-1 data-[state=active]:bg-[#d00024] data-[state=active]:text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Sent ({sentRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            <div className="space-y-3">
              {friends.length === 0 ? (
                <div className="text-center py-12 text-[#A3A3A3]">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No friends yet. Add some!</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]"
                    data-testid={`friend-${friend.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border border-[#333333]">
                        <AvatarImage src={friend.avatarUrl} />
                        <AvatarFallback className="bg-[#2A2A2A] text-[#EAEAEA]">
                          {getInitials(friend.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[#EAEAEA] font-medium">{friend.username}</p>
                        <p className="text-[#A3A3A3] text-sm">
                          {friend.bio || "No bio"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(friend.id)}
                      disabled={pendingActions.has(friend.id)}
                      data-testid={`button-remove-${friend.id}`}
                      className="text-[#666666] hover:text-[#d00024] hover:bg-[#d00024]/10"
                    >
                      {pendingActions.has(friend.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-12 text-[#A3A3A3]">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]"
                    data-testid={`request-${request.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border border-[#333333]">
                        <AvatarImage src={request.sender?.avatarUrl} />
                        <AvatarFallback className="bg-[#2A2A2A] text-[#EAEAEA]">
                          {getInitials(request.sender?.username || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-[#EAEAEA] font-medium">
                        {request.sender?.username}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        onClick={() => handleAccept(request.id)}
                        disabled={pendingActions.has(request.id)}
                        data-testid={`button-accept-${request.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {pendingActions.has(request.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleReject(request.id)}
                        disabled={pendingActions.has(request.id)}
                        data-testid={`button-reject-${request.id}`}
                        className="text-[#666666] hover:text-[#d00024] hover:bg-[#d00024]/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="sent">
            <div className="space-y-3">
              {sentRequests.length === 0 ? (
                <div className="text-center py-12 text-[#A3A3A3]">
                  <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No sent requests</p>
                </div>
              ) : (
                sentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]"
                    data-testid={`sent-${request.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border border-[#333333]">
                        <AvatarImage src={request.receiver?.avatarUrl} />
                        <AvatarFallback className="bg-[#2A2A2A] text-[#EAEAEA]">
                          {getInitials(request.receiver?.username || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-[#EAEAEA] font-medium">
                        {request.receiver?.username}
                      </p>
                    </div>
                    <span className="text-[#A3A3A3] text-sm">Pending</span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
