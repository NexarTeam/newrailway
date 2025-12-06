import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Calendar, Upload, Camera } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { patch } = useApi();
  const { showAchievement } = useNotifications();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const token = localStorage.getItem("nexar_token");
      const response = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      const updated = await response.json();
      const { unlockedAchievements, ...userData } = updated;
      updateUser(userData);
      toast({ title: "Avatar updated", description: "Your new avatar has been saved." });
      if (unlockedAchievements?.length) {
        unlockedAchievements.forEach((achievement: Achievement) => {
          showAchievement(achievement);
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload avatar",
        variant: "destructive",
      });
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await patch<{ unlockedAchievements?: Achievement[] } & typeof user>("/api/auth/profile", {
        username,
        bio,
      });
      if (response) {
        const { unlockedAchievements, ...userData } = response;
        if (userData) {
          updateUser(userData as NonNullable<typeof user>);
        }
        if (unlockedAchievements?.length) {
          unlockedAchievements.forEach((achievement) => {
            showAchievement(achievement);
          });
        }
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
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-[#d00024]">
                <AvatarImage src={avatarPreview || user.avatarUrl} />
                <AvatarFallback className="bg-[#2A2A2A] text-[#EAEAEA] text-2xl">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                data-testid="input-avatar-file"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                data-testid="button-upload-avatar"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
            </div>

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

              <div className="space-y-2 text-[#A3A3A3] text-sm">
                <p>Hover over your avatar above and click to upload a new image.</p>
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
