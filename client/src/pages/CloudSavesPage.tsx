import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useApi } from "@/hooks/useApi";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Cloud, Plus, Download, Trash2, Edit, FileText, Calendar } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface CloudSave {
  id: string;
  filename: string;
  uploadedAt: string;
  data?: string;
}

export default function CloudSavesPage() {
  const { get, post, patch, del } = useApi();
  const { showAchievement } = useNotifications();
  const { toast } = useToast();
  const [saves, setSaves] = useState<CloudSave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSave, setEditingSave] = useState<CloudSave | null>(null);
  const [filename, setFilename] = useState("");
  const [data, setData] = useState("");
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const fetchSaves = async () => {
    try {
      const savesData = await get<CloudSave[]>("/api/cloud");
      setSaves(savesData);
    } catch (error) {
      toast({ title: "Error loading cloud saves", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSaves();
  }, []);

  const handleUpload = async () => {
    if (!filename.trim() || !data.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      if (editingSave) {
        await patch(`/api/cloud/${editingSave.id}`, { filename, data });
        toast({ title: "Cloud save updated" });
      } else {
        const response = await post<CloudSave & { unlockedAchievements?: Achievement[] }>("/api/cloud", { filename, data });
        const { unlockedAchievements } = response;
        toast({ title: "Cloud save uploaded" });
        if (unlockedAchievements?.length) {
          unlockedAchievements.forEach((achievement) => showAchievement(achievement));
        }
      }
      setIsDialogOpen(false);
      setFilename("");
      setData("");
      setEditingSave(null);
      fetchSaves();
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Could not save",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = async (save: CloudSave) => {
    setPendingActions((prev) => new Set(prev).add(save.id));
    try {
      const fullSave = await get<CloudSave>(`/api/cloud/${save.id}`);
      setEditingSave(fullSave);
      setFilename(fullSave.filename);
      setData(fullSave.data || "");
      setIsDialogOpen(true);
    } catch (error) {
      toast({ title: "Error loading save", variant: "destructive" });
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(save.id);
        return next;
      });
    }
  };

  const handleDownload = async (save: CloudSave) => {
    setPendingActions((prev) => new Set(prev).add(save.id));
    try {
      const fullSave = await get<CloudSave>(`/api/cloud/${save.id}`);
      const blob = new Blob([fullSave.data || ""], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = save.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(save.id);
        return next;
      });
    }
  };

  const handleDelete = async (saveId: string) => {
    setPendingActions((prev) => new Set(prev).add(saveId));
    try {
      await del(`/api/cloud/${saveId}`);
      toast({ title: "Cloud save deleted" });
      fetchSaves();
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(saveId);
        return next;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openNewDialog = () => {
    setEditingSave(null);
    setFilename("");
    setData("");
    setIsDialogOpen(true);
  };

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
            Cloud Saves
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openNewDialog}
                data-testid="button-new-save"
                className="bg-[#d00024] hover:bg-[#b0001e] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Save
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1A] border-[#2A2A2A] text-[#EAEAEA]">
              <DialogHeader>
                <DialogTitle className="text-[#EAEAEA]">
                  {editingSave ? "Edit Cloud Save" : "Upload Cloud Save"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="filename" className="text-[#EAEAEA]">
                    Filename
                  </Label>
                  <Input
                    id="filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="mysave.json"
                    data-testid="input-filename"
                    className="bg-[#111111] border-[#333333] text-[#EAEAEA] focus:border-[#d00024]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data" className="text-[#EAEAEA]">
                    Save Data
                  </Label>
                  <Textarea
                    id="data"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder="Paste your save data here..."
                    rows={8}
                    data-testid="input-data"
                    className="bg-[#111111] border-[#333333] text-[#EAEAEA] focus:border-[#d00024] resize-none font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  data-testid="button-upload"
                  className="w-full bg-[#d00024] hover:bg-[#b0001e] text-white"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Cloud className="w-4 h-4 mr-2" />
                  )}
                  {isUploading ? "Saving..." : editingSave ? "Update Save" : "Upload Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {saves.length === 0 ? (
          <div className="text-center py-16 text-[#A3A3A3]">
            <Cloud className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No cloud saves yet</p>
            <p className="text-sm mt-2">Upload your first save to keep it safe in the cloud.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {saves.map((save, index) => (
              <motion.div
                key={save.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                data-testid={`save-${save.id}`}
                className="flex items-center justify-between p-5 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#d00024]/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#d00024]" />
                  </div>
                  <div>
                    <h3 className="text-[#EAEAEA] font-medium">{save.filename}</h3>
                    <div className="flex items-center gap-2 text-[#A3A3A3] text-sm mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(save.uploadedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(save)}
                    disabled={pendingActions.has(save.id)}
                    data-testid={`button-download-${save.id}`}
                    className="text-[#A3A3A3] hover:text-[#EAEAEA] hover:bg-[#2A2A2A]"
                  >
                    {pendingActions.has(save.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(save)}
                    disabled={pendingActions.has(save.id)}
                    data-testid={`button-edit-${save.id}`}
                    className="text-[#A3A3A3] hover:text-[#EAEAEA] hover:bg-[#2A2A2A]"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(save.id)}
                    disabled={pendingActions.has(save.id)}
                    data-testid={`button-delete-${save.id}`}
                    className="text-[#666666] hover:text-[#d00024] hover:bg-[#d00024]/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
