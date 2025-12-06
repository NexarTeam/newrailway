import { useState } from "react";
import { motion } from "framer-motion";
import { Monitor, Wifi, HardDrive, Info, Palette, Zap, Shield, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type SettingsTab = "display" | "performance" | "network" | "storage" | "notifications" | "system";

const tabs: { id: SettingsTab; label: string; icon: typeof Monitor }[] = [
  { id: "display", label: "Display", icon: Monitor },
  { id: "performance", label: "Performance", icon: Zap },
  { id: "network", label: "Network", icon: Wifi },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "system", label: "System", icon: Info },
];

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("display");
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

  const updateSetting = (key: string, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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

          {activeTab === "system" && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">System Information</h2>
                <p className="text-sm text-muted-foreground">Device and software details</p>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Software Version</span>
                    <span className="font-medium text-foreground">NexarOS 1.0.0</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Device</span>
                    <span className="font-medium text-foreground">Nexar Handheld</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Manufacturer</span>
                    <span className="font-medium text-foreground">Sabre Collective</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Serial Number</span>
                    <span className="font-medium text-foreground font-mono">NXR-2024-XXXX</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-4">
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

              <Button variant="outline" className="w-full" data-testid="button-check-updates">
                <Shield className="w-4 h-4 mr-2" />
                Check for Updates
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
