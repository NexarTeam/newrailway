import { useState } from "react";
import { motion } from "framer-motion";
import { Monitor, Wifi, HardDrive, Info, Palette, Zap, Shield, Bell, Cpu, MonitorSmartphone, Server, Clock, ShoppingCart, Lock, AlertTriangle, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SystemInfo {
  version: string;
  edition: string;
  systemId: string;
  device: string;
  manufacturer: string;
  hardware: {
    cpu: string;
    gpu: string;
    ram: string;
    os: string;
  };
}

interface ParentalStatus {
  enabled: boolean;
  playtimeLimit: number | null;
  canMakePurchases: boolean;
  restrictedRatings: string[];
  requiresParentApproval: boolean;
  dailyPlaytimeLog: {
    date: string;
    minutesPlayed: number;
  };
}

type SettingsTab = "display" | "performance" | "network" | "storage" | "notifications" | "parental" | "system";

const tabs: { id: SettingsTab; label: string; icon: typeof Monitor }[] = [
  { id: "display", label: "Display", icon: Monitor },
  { id: "performance", label: "Performance", icon: Zap },
  { id: "network", label: "Network", icon: Wifi },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "parental", label: "Parental Controls", icon: Shield },
  { id: "system", label: "System", icon: Info },
];

const CONTENT_RATINGS = [
  { value: "E", label: "Everyone (E)" },
  { value: "T", label: "Teen (T)" },
  { value: "M", label: "Mature (M)" },
  { value: "18+", label: "Adults Only (18+)" },
];

interface ThemeOption {
  id: string;
  name: string;
  colors: { primary: string; accent: string; bg: string };
  isPremium: boolean;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: "nexar-red", name: "Nexar Red", colors: { primary: "#d00024", accent: "#ff1a40", bg: "#0a0a0a" }, isPremium: false },
  { id: "midnight-blue", name: "Midnight Blue", colors: { primary: "#1e3a5f", accent: "#2e5a8f", bg: "#0a0a0a" }, isPremium: false },
  { id: "neon-green", name: "Neon Green", colors: { primary: "#00ff88", accent: "#00cc6a", bg: "#0a0a0a" }, isPremium: true },
  { id: "royal-purple", name: "Royal Purple", colors: { primary: "#8b5cf6", accent: "#a78bfa", bg: "#0a0a0a" }, isPremium: true },
  { id: "sunset-orange", name: "Sunset Orange", colors: { primary: "#f97316", accent: "#fb923c", bg: "#0a0a0a" }, isPremium: true },
  { id: "cyber-pink", name: "Cyber Pink", colors: { primary: "#ec4899", accent: "#f472b6", bg: "#0a0a0a" }, isPremium: true },
];

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("display");
  const [selectedTheme, setSelectedTheme] = useState("nexar-red");
  const { toast } = useToast();
  
  const { data: systemInfo, isLoading: systemLoading } = useQuery<SystemInfo>({
    queryKey: ["/api/system/info"],
  });

  const { data: parentalStatus, isLoading: parentalLoading, refetch: refetchParental } = useQuery<ParentalStatus>({
    queryKey: ["/api/parental/status"],
  });

  const { data: subscriptionStatus } = useQuery<{ hasActiveSubscription: boolean }>({
    queryKey: ["/api/subscription/status"],
  });

  const hasNexarPlus = subscriptionStatus?.hasActiveSubscription ?? false;

  const [settings, setSettings] = useState({
    darkMode: true,
    accentGlow: true,
    animations: true,
    resolution: "1920x1080",
    performanceMode: "balanced",
    autoUpdate: true,
    downloadOnWifi: false,
    notifications: true,
    soundEffects: true,
    brightness: [80],
    volume: [70],
  });

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalType, setPinModalType] = useState<"enable" | "disable" | "settings">("enable");
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [pendingSettings, setPendingSettings] = useState<Partial<ParentalStatus>>({});

  const enableParentalMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await apiRequest("POST", "/api/parental/enable", { pin });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Parental Controls Enabled", description: "PIN has been set successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/parental/status"] });
      setPinModalOpen(false);
      setPinInput("");
      setConfirmPinInput("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const disableParentalMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await apiRequest("POST", "/api/parental/disable", { pin });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Parental Controls Disabled" });
      queryClient.invalidateQueries({ queryKey: ["/api/parental/status"] });
      setPinModalOpen(false);
      setPinInput("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ pin, ...settings }: { pin: string } & Partial<ParentalStatus>) => {
      const res = await apiRequest("POST", "/api/parental/updateSettings", { pin, ...settings });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/parental/status"] });
      setPinModalOpen(false);
      setPinInput("");
      setPendingSettings({});
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSetting = (key: string, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleEnableParental = () => {
    setPinModalType("enable");
    setPinInput("");
    setConfirmPinInput("");
    setPinModalOpen(true);
  };

  const handleDisableParental = () => {
    setPinModalType("disable");
    setPinInput("");
    setPinModalOpen(true);
  };

  const handleUpdateSettings = (newSettings: Partial<ParentalStatus>) => {
    setPendingSettings(newSettings);
    setPinModalType("settings");
    setPinInput("");
    setPinModalOpen(true);
  };

  const handlePinSubmit = () => {
    if (pinModalType === "enable") {
      if (pinInput.length < 4 || pinInput.length > 8 || !/^\d+$/.test(pinInput)) {
        toast({ title: "Invalid PIN", description: "PIN must be 4-8 digits", variant: "destructive" });
        return;
      }
      if (pinInput !== confirmPinInput) {
        toast({ title: "PINs don't match", description: "Please confirm your PIN", variant: "destructive" });
        return;
      }
      enableParentalMutation.mutate(pinInput);
    } else if (pinModalType === "disable") {
      disableParentalMutation.mutate(pinInput);
    } else if (pinModalType === "settings") {
      updateSettingsMutation.mutate({ pin: pinInput, ...pendingSettings });
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="flex h-full" data-testid="settings-panel">
      <div className="w-56 border-r border-border p-4 space-y-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={`w-full justify-start gap-3 ${
                isActive ? "bg-accent text-accent-foreground" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`settings-tab-${tab.id}`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
              {tab.label}
            </Button>
          );
        })}
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {activeTab === "display" && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Display Settings</h2>
                <p className="text-sm text-muted-foreground">Customize your visual experience</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Theme
                  </CardTitle>
                  <CardDescription>Manage appearance settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Dark Mode</p>
                      <p className="text-sm text-muted-foreground">Always on for NexarOS</p>
                    </div>
                    <Switch checked={settings.darkMode} disabled data-testid="switch-dark-mode" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Accent Glow Effects</p>
                      <p className="text-sm text-muted-foreground">Red glow on interactive elements</p>
                    </div>
                    <Switch 
                      checked={settings.accentGlow} 
                      onCheckedChange={(v) => updateSetting("accentGlow", v)}
                      data-testid="switch-accent-glow"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Animations</p>
                      <p className="text-sm text-muted-foreground">Enable smooth transitions</p>
                    </div>
                    <Switch 
                      checked={settings.animations} 
                      onCheckedChange={(v) => updateSetting("animations", v)}
                      data-testid="switch-animations"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Brightness</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Slider 
                      value={settings.brightness}
                      onValueChange={(v) => updateSetting("brightness", v)}
                      max={100}
                      step={1}
                      className="flex-1"
                      data-testid="slider-brightness"
                    />
                    <span className="w-12 text-right text-sm text-muted-foreground">
                      {settings.brightness[0]}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Color Theme
                  </CardTitle>
                  <CardDescription>Choose your accent color theme</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {THEME_OPTIONS.map((theme) => {
                      const isLocked = theme.isPremium && !hasNexarPlus;
                      const isSelected = selectedTheme === theme.id;
                      
                      return (
                        <button
                          key={theme.id}
                          onClick={() => {
                            if (isLocked) {
                              toast({
                                title: "Nexar+ Required",
                                description: "Subscribe to Nexar+ to unlock premium themes",
                              });
                              return;
                            }
                            setSelectedTheme(theme.id);
                            toast({
                              title: "Theme Applied",
                              description: `${theme.name} theme is now active`,
                            });
                          }}
                          disabled={isLocked}
                          className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : isLocked
                              ? "border-border/50 opacity-60 cursor-not-allowed"
                              : "border-border hover:border-primary/50"
                          }`}
                          data-testid={`theme-${theme.id}`}
                        >
                          <div
                            className="w-8 h-8 rounded-full border-2"
                            style={{
                              backgroundColor: theme.colors.primary,
                              borderColor: theme.colors.accent,
                            }}
                          />
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground text-sm">{theme.name}</span>
                              {theme.isPremium && (
                                <Crown className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                            {isLocked && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Nexar+ Required
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!hasNexarPlus && (
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      Unlock 4 premium themes with Nexar+ subscription
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "performance" && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Performance</h2>
                <p className="text-sm text-muted-foreground">Optimize system performance</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Performance Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {["power-saver", "balanced", "performance"].map((mode) => (
                      <Button
                        key={mode}
                        variant={settings.performanceMode === mode ? "default" : "outline"}
                        className="capitalize"
                        onClick={() => updateSetting("performanceMode", mode)}
                        data-testid={`button-perf-${mode}`}
                      >
                        {mode.replace("-", " ")}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {settings.performanceMode === "power-saver" && "Reduces performance to save battery life"}
                    {settings.performanceMode === "balanced" && "Optimal balance between performance and power"}
                    {settings.performanceMode === "performance" && "Maximum performance, higher power usage"}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "network" && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Network</h2>
                <p className="text-sm text-muted-foreground">Configure network settings</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-primary" />
                    Connection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Status</p>
                      <p className="text-sm text-green-500">Connected</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">Signal</p>
                      <p className="text-sm text-muted-foreground">Excellent</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Download on Wi-Fi Only</p>
                      <p className="text-sm text-muted-foreground">Save mobile data</p>
                    </div>
                    <Switch 
                      checked={settings.downloadOnWifi}
                      onCheckedChange={(v) => updateSetting("downloadOnWifi", v)}
                      data-testid="switch-wifi-only"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "storage" && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Storage</h2>
                <p className="text-sm text-muted-foreground">Manage storage space</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-primary" />
                    Storage Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Used</span>
                      <span className="text-foreground font-medium">245.6 GB / 512 GB</span>
                    </div>
                    <Progress value={48} className="h-3" />
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Games</span>
                      <span className="text-sm text-foreground">180.2 GB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">System</span>
                      <span className="text-sm text-foreground">45.8 GB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Other</span>
                      <span className="text-sm text-foreground">19.6 GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "notifications" && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Notifications</h2>
                <p className="text-sm text-muted-foreground">Configure alert preferences</p>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates and alerts</p>
                    </div>
                    <Switch 
                      checked={settings.notifications}
                      onCheckedChange={(v) => updateSetting("notifications", v)}
                      data-testid="switch-notifications"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Sound Effects</p>
                      <p className="text-sm text-muted-foreground">Audio feedback for actions</p>
                    </div>
                    <Switch 
                      checked={settings.soundEffects}
                      onCheckedChange={(v) => updateSetting("soundEffects", v)}
                      data-testid="switch-sounds"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Slider 
                      value={settings.volume}
                      onValueChange={(v) => updateSetting("volume", v)}
                      max={100}
                      step={1}
                      className="flex-1"
                      data-testid="slider-volume"
                    />
                    <span className="w-12 text-right text-sm text-muted-foreground">
                      {settings.volume[0]}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "parental" && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Parental Controls</h2>
                <p className="text-sm text-muted-foreground">Manage content and playtime restrictions</p>
              </div>

              {parentalLoading ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">Loading parental controls...</p>
                  </CardContent>
                </Card>
              ) : !parentalStatus?.enabled ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Enable Parental Controls
                    </CardTitle>
                    <CardDescription>
                      Set up parental controls to restrict content, limit playtime, and control purchases.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleEnableParental} data-testid="button-enable-parental">
                      <Lock className="w-4 h-4 mr-2" />
                      Enable Parental Controls
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Daily Activity
                      </CardTitle>
                      <CardDescription>Today's playtime statistics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Time Played Today</span>
                        <span className="font-medium text-foreground" data-testid="text-playtime-today">
                          {formatMinutes(parentalStatus.dailyPlaytimeLog?.minutesPlayed || 0)}
                        </span>
                      </div>
                      {parentalStatus.playtimeLimit && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Daily Limit</span>
                            <span className="font-medium text-foreground" data-testid="text-playtime-limit">
                              {formatMinutes(parentalStatus.playtimeLimit)}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Remaining</span>
                              <span className="text-foreground">
                                {formatMinutes(Math.max(0, parentalStatus.playtimeLimit - (parentalStatus.dailyPlaytimeLog?.minutesPlayed || 0)))}
                              </span>
                            </div>
                            <Progress 
                              value={Math.min(100, ((parentalStatus.dailyPlaytimeLog?.minutesPlayed || 0) / parentalStatus.playtimeLimit) * 100)} 
                              className="h-2" 
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Playtime Limit
                      </CardTitle>
                      <CardDescription>Set daily playtime restrictions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select 
                        value={parentalStatus.playtimeLimit?.toString() || "none"}
                        onValueChange={(v) => handleUpdateSettings({ playtimeLimit: v === "none" ? null : parseInt(v) })}
                        data-testid="select-playtime-limit"
                      >
                        <SelectTrigger data-testid="trigger-playtime-limit">
                          <SelectValue placeholder="Select limit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Limit</SelectItem>
                          <SelectItem value="30">30 minutes/day</SelectItem>
                          <SelectItem value="60">1 hour/day</SelectItem>
                          <SelectItem value="120">2 hours/day</SelectItem>
                          <SelectItem value="180">3 hours/day</SelectItem>
                          <SelectItem value="240">4 hours/day</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-primary" />
                        Content Restrictions
                      </CardTitle>
                      <CardDescription>Block games by age rating</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {CONTENT_RATINGS.map((rating) => (
                        <div key={rating.value} className="flex items-center space-x-3">
                          <Checkbox 
                            id={`rating-${rating.value}`}
                            checked={parentalStatus.restrictedRatings?.includes(rating.value)}
                            onCheckedChange={(checked) => {
                              const newRatings = checked
                                ? [...(parentalStatus.restrictedRatings || []), rating.value]
                                : (parentalStatus.restrictedRatings || []).filter((r) => r !== rating.value);
                              handleUpdateSettings({ restrictedRatings: newRatings });
                            }}
                            data-testid={`checkbox-rating-${rating.value}`}
                          />
                          <Label htmlFor={`rating-${rating.value}`} className="text-foreground cursor-pointer">
                            Block {rating.label}
                          </Label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        Purchase Settings
                      </CardTitle>
                      <CardDescription>Control buying permissions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">Allow Purchases</p>
                          <p className="text-sm text-muted-foreground">Enable buying games and add-ons</p>
                        </div>
                        <Switch 
                          checked={parentalStatus.canMakePurchases}
                          onCheckedChange={(v) => handleUpdateSettings({ canMakePurchases: v })}
                          data-testid="switch-allow-purchases"
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">Require Parent Approval</p>
                          <p className="text-sm text-muted-foreground">PIN required for each purchase</p>
                        </div>
                        <Switch 
                          checked={parentalStatus.requiresParentApproval}
                          onCheckedChange={(v) => handleUpdateSettings({ requiresParentApproval: v })}
                          data-testid="switch-require-approval"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Button 
                    variant="destructive" 
                    onClick={handleDisableParental}
                    data-testid="button-disable-parental"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Disable Parental Controls
                  </Button>
                </>
              )}
            </>
          )}

          {activeTab === "system" && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">System Information</h2>
                <p className="text-sm text-muted-foreground">Device and software details</p>
              </div>

              {systemLoading || !systemInfo ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">Loading system information...</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MonitorSmartphone className="w-5 h-5 text-primary" />
                        Nexar System Identity
                      </CardTitle>
                      <CardDescription>Core system identification</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">System ID</span>
                        <span className="font-medium text-foreground font-mono" data-testid="text-system-id">
                          {systemInfo?.systemId || "Unknown"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Device Type</span>
                        <span className="font-medium text-foreground" data-testid="text-device-type">
                          {systemInfo?.device || "Unknown"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Manufacturer</span>
                        <span className="font-medium text-foreground" data-testid="text-manufacturer">
                          {systemInfo?.manufacturer || "Unknown"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-primary" />
                        Hardware (Simulated)
                      </CardTitle>
                      <CardDescription>Virtual hardware configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">CPU</span>
                        <span className="font-medium text-foreground" data-testid="text-cpu">
                          {systemInfo?.hardware?.cpu || "Unknown"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">GPU</span>
                        <span className="font-medium text-foreground" data-testid="text-gpu">
                          {systemInfo?.hardware?.gpu || "Unknown"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">RAM</span>
                        <span className="font-medium text-foreground" data-testid="text-ram">
                          {systemInfo?.hardware?.ram || "Unknown"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Operating System</span>
                        <span className="font-medium text-foreground" data-testid="text-os">
                          {systemInfo?.hardware?.os || "Unknown"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-primary" />
                        Software
                      </CardTitle>
                      <CardDescription>NexarOS software information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">NexarOS Version</span>
                        <span className="font-medium text-foreground" data-testid="text-version">
                          {systemInfo?.version || "Unknown"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Update Status</span>
                        <span className="font-medium text-green-500" data-testid="text-update-status">Up to date</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">Automatic Updates</p>
                          <p className="text-sm text-muted-foreground">Download updates automatically</p>
                        </div>
                        <Switch 
                          checked={settings.autoUpdate}
                          onCheckedChange={(v) => updateSetting("autoUpdate", v)}
                          data-testid="switch-auto-update"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Button variant="outline" className="w-full" data-testid="button-check-updates">
                <Shield className="w-4 h-4 mr-2" />
                Check for Updates
              </Button>
            </>
          )}
        </motion.div>
      </div>

      <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pinModalType === "enable" && "Create Parent PIN"}
              {pinModalType === "disable" && "Enter Parent PIN"}
              {pinModalType === "settings" && "Confirm Changes"}
            </DialogTitle>
            <DialogDescription>
              {pinModalType === "enable" && "Create a 4-8 digit PIN to manage parental controls"}
              {pinModalType === "disable" && "Enter your PIN to disable parental controls"}
              {pinModalType === "settings" && "Enter your PIN to update settings"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="Enter PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                data-testid="input-pin"
              />
            </div>
            {pinModalType === "enable" && (
              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Confirm PIN</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="Confirm PIN"
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ""))}
                  data-testid="input-confirm-pin"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinModalOpen(false)} data-testid="button-pin-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handlePinSubmit} 
              disabled={enableParentalMutation.isPending || disableParentalMutation.isPending || updateSettingsMutation.isPending}
              data-testid="button-pin-confirm"
            >
              {(enableParentalMutation.isPending || disableParentalMutation.isPending || updateSettingsMutation.isPending) 
                ? "Processing..." 
                : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
