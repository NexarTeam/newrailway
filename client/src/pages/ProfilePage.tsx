import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { patch } = useApi();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [bio, setBio] = useState(user?.bio || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await patch<typeof user>("/api/auth/profile", {
        username,
        avatarUrl,
        bio,
      });
      if (updated) {
        updateUser(updated);
      }
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-full p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-3xl font-bold text-[#EAEAEA] mb-8 uppercase tracking-wider">
          Profile
        </h1>

        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-start gap-6 mb-6">
            <Avatar className="w-24 h-24 border-2 border-[#d00024]">
              <AvatarImage src={avatarUrl || user.avatarUrl} />
              <AvatarFallback className="bg-[#2A2A2A] text-[#EAEAEA] text-2xl">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h2
                className="text-2xl font-bold text-[#EAEAEA]"
                data-testid="text-username"
              >
                {user.username}
              </h2>
              <p className="text-[#A3A3A3] text-sm" data-testid="text-email">
                {user.email}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[#A3A3A3] text-sm">
                <Calendar className="w-4 h-4" />
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              data-testid="button-edit-profile"
              className="border-[#d00024] text-[#d00024] hover:bg-[#d00024] hover:text-white"
            >
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#EAEAEA]">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="input-edit-username"
                  className="bg-[#111111] border-[#333333] text-[#EAEAEA] focus:border-[#d00024]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl" className="text-[#EAEAEA]">
                  Avatar URL
                </Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  data-testid="input-avatar-url"
                  className="bg-[#111111] border-[#333333] text-[#EAEAEA] focus:border-[#d00024]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-[#EAEAEA]">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  rows={4}
                  data-testid="input-bio"
                  className="bg-[#111111] border-[#333333] text-[#EAEAEA] focus:border-[#d00024] resize-none"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                data-testid="button-save-profile"
                className="w-full bg-[#d00024] hover:bg-[#b0001e] text-white"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-[#A3A3A3] text-sm">Bio</Label>
                <p
                  className="text-[#EAEAEA] mt-1"
                  data-testid="text-bio"
                >
                  {user.bio || "No bio set yet."}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
