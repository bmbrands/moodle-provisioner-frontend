import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Save, RotateCcw, Globe, GitPullRequest, AlertCircle, CheckCircle2, Settings, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PluginCatalogTable } from "./PluginCatalogTable";
import { AddPluginModal } from "./AddPluginModal";
import type { Plugin } from "../types/plugin";
import { fetchSettings, updateSettings } from "../services/api";
import type { SettingValue } from "../services/api";

interface AdminSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSimulateWebhook?: () => void;
  plugins: Plugin[];
  onTogglePluginActive: (pluginId: string) => void;
  onDeletePlugin: (pluginId: string) => void;
  onAddPlugin: (plugin: Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdatePlugin?: (
    pluginId: string,
    updates: Partial<Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>>
  ) => void;
}

interface ConfigItem {
  name: string;
  shortName: string;
  description: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  options?: string[];
  category: string;
}

const mockConfigs: ConfigItem[] = [
  {
    name: "Maximum Environment Lifetime",
    shortName: "max_env_lifetime",
    description: "Maximum time in hours that an environment can run before being automatically stopped",
    value: 48,
    type: "number",
    category: "Environment Management"
  },
  {
    name: "Auto-cleanup Stopped Environments",
    shortName: "auto_cleanup_stopped",
    description: "Automatically delete environments that have been stopped for more than the specified duration",
    value: true,
    type: "boolean",
    category: "Environment Management"
  },
  {
    name: "Default Moodle Version",
    shortName: "default_moodle_version",
    description: "The default Moodle version to use when creating new environments",
    value: "5.0.2",
    type: "select",
    options: [
      "5.0.2",
      "5.0.1",
      "5.0.0",
      "4.5.6",
      "4.5.5",
      "4.5.4",
      "4.4.0",
      "4.3.0",
      "4.2.0",
      "4.1.0",
    ],
    category: "Environment Management"
  },
  {
    name: "Enable GitHub Webhook Handler",
    shortName: "enable_github_webhook",
    description: "Enable automatic test environment creation from GitHub pull requests",
    value: true,
    type: "boolean",
    category: "GitHub Integration"
  },
  {
    name: "GitHub Webhook Secret",
    shortName: "github_webhook_secret",
    description: "Secret token for validating GitHub webhook requests (leave empty to disable validation)",
    value: "your-webhook-secret-here",
    type: "string",
    category: "GitHub Integration"
  },
  {
    name: "GitHub Personal Access Token",
    shortName: "github_personal_token",
    description: "GitHub PAT for posting comments on pull requests (requires 'repo' scope)",
    value: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    type: "string",
    category: "GitHub Integration"
  },
  {
    name: "Post PR Comments",
    shortName: "github_post_pr_comments",
    description: "Automatically post comments on pull requests with environment details",
    value: true,
    type: "boolean",
    category: "GitHub Integration"
  },
  {
    name: "Webhook Comment Template",
    shortName: "github_comment_template",
    description: "Template for comments posted on pull requests (use {{url}}, {{name}}, {{password}} placeholders)",
    value: "🚀 Test environment created successfully!\\n\\n**Environment Details:**\\n- URL: {{url}}\\n- Name: `{{name}}`\\n- Admin Password: `{{password}}`\\n\\nThe environment will be automatically cleaned up when the PR is closed.",
    type: "textarea",
    category: "GitHub Integration"
  },
  {
    name: "Allowed Repository Pattern",
    shortName: "github_allowed_repos",
    description: "Regex pattern for allowed repositories (e.g., 'moodle/.*' for all Moodle repositories)",
    value: "moodle/.*",
    type: "string",
    category: "GitHub Integration"
  },
  {
    name: "Docker Registry URL",
    shortName: "docker_registry_url",
    description: "URL of the Docker registry to pull Moodle images from",
    value: "registry.docker.local/moodle",
    type: "string",
    category: "Docker Configuration"
  },
  {
    name: "Container Memory Limit",
    shortName: "container_memory_limit",
    description: "Memory limit in MB for each container environment",
    value: 2048,
    type: "number",
    category: "Docker Configuration"
  },
  {
    name: "Enable Debug Mode",
    shortName: "enable_debug_mode",
    description: "Enable debug logging and extended error reporting",
    value: false,
    type: "boolean",
    category: "System"
  },
  {
    name: "Admin Email Notifications",
    shortName: "admin_email_notifications",
    description: "Send email notifications to administrators for system events",
    value: true,
    type: "boolean",
    category: "System"
  },
  {
    name: "Log Retention Days",
    shortName: "log_retention_days",
    description: "Number of days to retain application logs",
    value: 30,
    type: "number",
    category: "System"
  }
];

export function AdminSettingsModal({
  open,
  onOpenChange,
  onSimulateWebhook,
  plugins,
  onTogglePluginActive,
  onDeletePlugin,
  onAddPlugin,
  onUpdatePlugin
}: AdminSettingsModalProps) {
  const [configs, setConfigs] = useState<ConfigItem[]>(mockConfigs);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAddPluginModalOpen, setIsAddPluginModalOpen] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load persisted overrides from backend on first open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchSettings()
      .then(overrides => {
        if (cancelled) return;
        if (!overrides || Object.keys(overrides).length === 0) return;
        setConfigs(prev =>
          prev.map(cfg =>
            cfg.shortName in overrides
              ? { ...cfg, value: overrides[cfg.shortName] as ConfigItem["value"] }
              : cfg
          )
        );
        setHasChanges(false);
      })
      .catch(err => {
        console.error("Failed to load settings:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const updateConfig = (shortName: string, newValue: string | number | boolean) => {
    setConfigs(prev => prev.map(config =>
      config.shortName === shortName
        ? { ...config, value: newValue }
        : config
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const values: Record<string, SettingValue> = Object.fromEntries(
        configs.map(c => [c.shortName, c.value])
      );
      await updateSettings(values);
      toast.success("Settings saved successfully!");
      setHasChanges(false);
    } catch (err) {
      toast.error(
        `Failed to save settings: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfigs(mockConfigs);
    setHasChanges(true);
    toast.info("Settings reset to defaults — click Save to persist");
  };

  const renderConfigInput = (config: ConfigItem) => {
    switch (config.type) {
      case 'boolean':
        return (
          <Switch
            checked={config.value as boolean}
            onCheckedChange={(checked) => updateConfig(config.shortName, checked)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={config.value as number}
            onChange={(e) => updateConfig(config.shortName, parseInt(e.target.value))}
            className="max-w-32"
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={config.value as string}
            onChange={(e) => updateConfig(config.shortName, e.target.value)}
            rows={4}
            className="w-full min-h-[120px] resize-y bg-background border-input ring-1 ring-input/10"
          />
        );
      case 'select':
        return (
          <select
            value={config.value as string}
            onChange={(e) => updateConfig(config.shortName, e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background"
          >
            {config.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      default:
        return (
          <Input
            type="text"
            value={config.value as string}
            onChange={(e) => updateConfig(config.shortName, e.target.value)}
            className="max-w-96"
          />
        );
    }
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, ConfigItem[]>);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="2xl" className="max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Admin Settings
                  {hasChanges && (
                    <Badge variant="outline" className="text-warning bg-warning/10">
                      Unsaved Changes
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Configure system settings, webhooks, and plugin catalog
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="settings" className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                System Settings
              </TabsTrigger>
              <TabsTrigger value="plugins" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Plugin Catalog
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-6 flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="space-y-6">
                  {/* GitHub Webhook Status */}
                  <Card className="shadow-sm border-info/50 bg-info/5">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GitPullRequest className="h-5 w-5" />
                        GitHub Webhook Status
                      </CardTitle>
                      <CardDescription>
                        Configure GitHub integration for automatic environment creation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span className="font-medium">Webhook Endpoint</span>
                          </div>
                          <code className="block p-2 bg-background rounded text-sm border">
                            https://your-domain.com/webhook/github
                          </code>
                          <p className="text-xs text-muted-foreground">
                            Configure this URL as your GitHub webhook endpoint
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-info" />
                            <span className="font-medium">Supported Events</span>
                          </div>
                          <ul className="text-sm space-y-1">
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              Pull Request Opened
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              Pull Request Synchronized
                            </li>
                            <li className="flex items-center gap-2">
                              <AlertCircle className="h-3 w-3 text-warning" />
                              Pull Request Closed (cleanup)
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-warning">Configuration Required</p>
                            <p className="text-muted-foreground mt-1">
                              Make sure to configure the webhook secret and GitHub token below for security and PR commenting functionality.
                            </p>
                          </div>
                        </div>
                      </div>
                      {onSimulateWebhook && (
                        <div className="pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onSimulateWebhook}
                            className="text-info hover:text-info/80 border-info/20 hover:border-info/40"
                          >
                            <GitPullRequest className="h-4 w-4 mr-2" />
                            Simulate Webhook Event
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
                    <Card key={category} className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">{category}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {categoryConfigs.map((config) => (
                          <div key={config.shortName} className="space-y-3">
                            {config.type === 'textarea' ? (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-3">
                                    <Label className="font-medium">{config.name}</Label>
                                    <code className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                                      {config.shortName}
                                    </code>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {config.description}
                                  </p>
                                </div>
                                <div className="w-full">
                                  {renderConfigInput(config)}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-3">
                                    <Label className="font-medium">{config.name}</Label>
                                    <code className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                                      {config.shortName}
                                    </code>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {config.description}
                                  </p>
                                </div>
                                <div className="flex-shrink-0">
                                  {renderConfigInput(config)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="plugins" className="mt-6 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <PluginCatalogTable
                  plugins={plugins}
                  onToggleActive={onTogglePluginActive}
                  onDeletePlugin={onDeletePlugin}
                  onAddPlugin={() => {
                    setEditingPlugin(null);
                    setIsAddPluginModalOpen(true);
                  }}
                  onEditPlugin={(plugin) => {
                    setEditingPlugin(plugin);
                    setIsAddPluginModalOpen(true);
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddPluginModal
        open={isAddPluginModalOpen}
        onOpenChange={(open) => {
          setIsAddPluginModalOpen(open);
          if (!open) setEditingPlugin(null);
        }}
        onAddPlugin={onAddPlugin}
        editingPlugin={editingPlugin}
        onUpdatePlugin={onUpdatePlugin}
      />
    </>
  );
}
