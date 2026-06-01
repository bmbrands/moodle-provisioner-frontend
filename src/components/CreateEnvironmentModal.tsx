import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import type { Plugin, PluginVersion } from "../types/plugin";
import { fetchPluginVersions, fetchMoodleVersions } from "../services/api";

interface CreateEnvironmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEnvironment: (environment: {
    name: string;
    plugin: string;
    version: string;
    versionType: "branch" | "tag" | "pr" | "commit";
    moodleVersions: string[];
    advancedConfig?: {
      additionalPlugins: string[];
    };
  }) => void;
  plugins: Plugin[];
  pluginVersions: Record<string, PluginVersion[]>;
  // Add Container mode props
  isAddContainerMode?: boolean;
  prefilledEnvironment?: {
    name: string;
    plugin: string;
    version: string;
  };
}

const availableMoodleVersionsFallback = [
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
];

export function CreateEnvironmentModal({
  open,
  onOpenChange,
  onCreateEnvironment,
  plugins,
  pluginVersions,
  isAddContainerMode = false,
  prefilledEnvironment
}: CreateEnvironmentModalProps) {
  const [name, setName] = useState(prefilledEnvironment?.name || "");
  // Docker Compose project names and nginx location paths only allow lowercase
  // alphanumeric characters, hyphens, and underscores (no spaces, dots, or uppercase).
  const NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
  const nameError =
    name.length > 0 && !NAME_PATTERN.test(name)
      ? "Only lowercase letters, numbers, hyphens and underscores are allowed (e.g. my-test-env)"
      : null;
  const [selectedPluginId, setSelectedPluginId] = useState(() => {
    if (prefilledEnvironment?.plugin) {
      return plugins.find(p => p.name === prefilledEnvironment.plugin)?.id || "";
    }
    return "";
  });
  const [version, setVersion] = useState(prefilledEnvironment?.version || "");
  const [moodleVersions, setMoodleVersions] = useState<string[]>([]);

  // Advanced settings state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [additionalPlugins, setAdditionalPlugins] = useState<string[]>([]);
  const [newPluginInput, setNewPluginInput] = useState("");

  // Available Moodle versions, fetched live from the backend (which pulls
  // them from tags on moodle/moodle) with a static fallback.
  const [availableMoodleVersions, setAvailableMoodleVersions] = useState<string[]>(
    availableMoodleVersionsFallback
  );
  const [moodleVersionsLoading, setMoodleVersionsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMoodleVersionsLoading(true);
    fetchMoodleVersions()
      .then((versions) => {
        if (cancelled) return;
        if (versions.length > 0) {
          setAvailableMoodleVersions(versions.map(v => v.version));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch Moodle versions:", err);
      })
      .finally(() => {
        if (!cancelled) setMoodleVersionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Get only active plugins for selection
  const activePlugins = useMemo(() =>
    plugins.filter(plugin => plugin.isActive),
    [plugins]
  );

  // Get versions for the selected plugin (fetched live from the backend
  // which proxies the GitHub API and caches responses).
  const [availableVersions, setAvailableVersions] = useState<PluginVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPluginId) {
      setAvailableVersions([]);
      setVersionsError(null);
      return;
    }
    const plugin = plugins.find(p => p.id === selectedPluginId);
    // Prefer freshly fetched refs; fall back to whatever the parent passed in.
    const fallback = pluginVersions[selectedPluginId] || [];
    if (!plugin?.repositoryUrl) {
      setAvailableVersions(fallback);
      setVersionsError(null);
      return;
    }
    let cancelled = false;
    setVersionsLoading(true);
    setVersionsError(null);
    fetchPluginVersions(plugin.repositoryUrl)
      .then((versions) => {
        if (cancelled) return;
        setAvailableVersions(versions);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch plugin versions:", err);
        setVersionsError(err.message || "Failed to fetch versions");
        setAvailableVersions(fallback);
      })
      .finally(() => {
        if (!cancelled) setVersionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPluginId, plugins, pluginVersions]);

  // Get the selected plugin object
  const selectedPlugin = useMemo(() =>
    plugins.find(p => p.id === selectedPluginId),
    [plugins, selectedPluginId]
  );

  // Reset version when plugin changes
  const handlePluginChange = (pluginId: string) => {
    setSelectedPluginId(pluginId);
    setVersion(""); // Reset version selection when plugin changes
  };

  const handleAddPlugin = () => {
    if (newPluginInput.trim() && !additionalPlugins.includes(newPluginInput.trim())) {
      setAdditionalPlugins(prev => [...prev, newPluginInput.trim()]);
      setNewPluginInput("");
    }
  };

  const handleRemovePlugin = (pluginToRemove: string) => {
    setAdditionalPlugins(prev => prev.filter(plugin => plugin !== pluginToRemove));
  };

  const handleMoodleVersionToggle = (version: string) => {
    setMoodleVersions(prev => {
      if (prev.includes(version)) {
        return prev.filter(v => v !== version);
      } else {
        return [...prev, version];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddContainerMode) {
      if (moodleVersions.length === 0) return;
      // In add-container mode the plugin/version are already fixed on the
      // environment; we only emit the moodle versions. Reuse the same
      // callback — App-level handler distinguishes via isAddContainerMode.
      onCreateEnvironment({
        name: prefilledEnvironment?.name ?? "",
        plugin: prefilledEnvironment?.plugin ?? "",
        version: prefilledEnvironment?.version ?? "",
        versionType: "branch", // unused in add-container path
        moodleVersions,
      });
      setMoodleVersions([]);
      onOpenChange(false);
      return;
    }
    if (name && !nameError && selectedPluginId && version && moodleVersions.length > 0 && selectedPlugin) {
      const selectedVersion = availableVersions.find(v => v.ref === version);
      const versionType = selectedVersion?.type ?? "branch";
      const environment = {
        name,
        plugin: selectedPlugin.name, // Use the plugin technical name
        version,
        versionType,
        moodleVersions,
        ...(showAdvanced && {
          advancedConfig: {
            additionalPlugins
          }
        })
      };

      onCreateEnvironment(environment);

      // Reset form
      setName("");
      setSelectedPluginId("");
      setVersion("");
      setMoodleVersions([]);
      setShowAdvanced(false);
      setAdditionalPlugins([]);
      setNewPluginInput("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isAddContainerMode ? "Add Container to Environment" : "Create Test Environment"}
          </DialogTitle>
          <DialogDescription>
            {isAddContainerMode
              ? `Add new Moodle containers to "${prefilledEnvironment?.name}" environment.`
              : "Set up a new Moodle test environment for plugin development."
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isAddContainerMode && (
            <div className="space-y-2">
              <Label htmlFor="environment-name">Environment Name</Label>
              <Input
                id="environment-name"
                placeholder="e.g., quiz-feature-testing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                aria-invalid={!!nameError}
                className={nameError ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
              {!nameError && name.length === 0 && (
                <p className="text-sm text-muted-foreground">Only lowercase letters, numbers, hyphens and underscores (e.g. <code className="bg-muted px-1 rounded">my-test-env</code>)</p>
              )}
            </div>
          )}

          {!isAddContainerMode && (
            <div className="space-y-2">
              <Label htmlFor="plugin-select">Plugin</Label>
              <Select value={selectedPluginId} onValueChange={handlePluginChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plugin" />
                </SelectTrigger>
                <SelectContent>
                  {activePlugins.length === 0 ? (
                    <SelectItem value="no-plugins" disabled>
                      No active plugins available
                    </SelectItem>
                  ) : (
                    activePlugins.map((plugin) => (
                      <SelectItem key={plugin.id} value={plugin.id}>
                        <div className="flex items-center gap-2">
                          <span>{plugin.displayName}</span>
                          <Badge variant="outline" className="text-xs">
                            {plugin.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedPlugin && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Path:</span>{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      {selectedPlugin.installationPath}
                    </code>
                  </p>
                  {selectedPlugin.description && (
                    <p>{selectedPlugin.description}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {!isAddContainerMode && (
            <div className="space-y-2">
              <Label htmlFor="version-select">Plugin Version</Label>
              <Select
                value={version}
                onValueChange={setVersion}
                required
                disabled={!selectedPluginId || versionsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedPluginId
                        ? "Select a plugin first"
                        : versionsLoading
                          ? "Loading versions from GitHub…"
                          : "Select version/git reference"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableVersions.length === 0 ? (
                    <SelectItem value="no-versions" disabled>
                      {selectedPluginId
                        ? versionsLoading
                          ? "Loading…"
                          : "No versions available"
                        : "Select a plugin first"}
                    </SelectItem>
                  ) : (
                    availableVersions.map((v) => (
                      <SelectItem key={v.ref} value={v.ref}>
                        <div className="flex items-center gap-2">
                          <span>{v.name}</span>
                          <Badge
                            variant="outline"
                            className={
                              v.type === "branch"
                                ? "text-info border-info/20 bg-info/10"
                                : v.type === "pr"
                                  ? "text-warning border-warning/20 bg-warning/10"
                                  : "text-success border-success/20 bg-success/10"
                            }
                          >
                            {v.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {versionsError && (
                <p className="text-sm text-destructive">
                  Could not load versions from GitHub: {versionsError}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="moodle-version-select">
              Moodle Version{(showAdvanced && !isAddContainerMode) || isAddContainerMode ? 's' : ''}
              {((showAdvanced && !isAddContainerMode) || isAddContainerMode) && <span className="text-sm text-muted-foreground ml-1">(select multiple)</span>}
            </Label>
            {showAdvanced && !isAddContainerMode ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                  {availableMoodleVersions.map((mv) => (
                    <div key={mv} className="flex items-center space-x-2">
                      <Checkbox
                        id={`moodle-${mv}`}
                        checked={moodleVersions.includes(mv)}
                        onCheckedChange={() => handleMoodleVersionToggle(mv)}
                      />
                      <Label htmlFor={`moodle-${mv}`} className="text-sm cursor-pointer">
                        {mv}
                      </Label>
                    </div>
                  ))}
                </div>
                {moodleVersions.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {moodleVersions.join(', ')}
                  </div>
                )}
              </div>
            ) : isAddContainerMode ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                  {availableMoodleVersions.map((mv) => (
                    <div key={mv} className="flex items-center space-x-2">
                      <Checkbox
                        id={`moodle-${mv}`}
                        checked={moodleVersions.includes(mv)}
                        onCheckedChange={() => handleMoodleVersionToggle(mv)}
                      />
                      <Label htmlFor={`moodle-${mv}`} className="text-sm cursor-pointer">
                        {mv}
                      </Label>
                    </div>
                  ))}
                </div>
                {moodleVersions.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {moodleVersions.join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <Select
                value={moodleVersions[0] || ""}
                onValueChange={(value) => setMoodleVersions([value])}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={moodleVersionsLoading ? "Loading Moodle versions…" : "Select Moodle version"} />
                </SelectTrigger>
                <SelectContent>
                  {availableMoodleVersions.map((mv) => (
                    <SelectItem key={mv} value={mv}>
                      {mv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Advanced Settings Collapsible */}
          {!isAddContainerMode && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <div className="flex justify-end">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showAdvanced ? (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Hide Advanced Settings
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Advanced Settings
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="space-y-6 pt-4 border-t">
              {/* Database Engine and PHP Version selectors are hidden for now:
                  the backend picks DB/PHP automatically based on the Moodle
                  version (see moodle-versions-to-supported-php-versions.yaml).
                  Re-enable once the backend accepts overrides. */}

              {/* Additional Plugins */}
              <div className="space-y-3">
                <Label>Additional Plugins</Label>
                <p className="text-sm text-muted-foreground">
                  Add extra plugins to install alongside your main plugin (use repository URLs or plugin names)
                </p>

                {/* Plugin Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., https://github.com/user/plugin.git or plugin_name"
                    value={newPluginInput}
                    onChange={(e) => setNewPluginInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPlugin();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPlugin}
                    disabled={!newPluginInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Plugin List */}
                {additionalPlugins.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Added plugins:</div>
                    <div className="space-y-1">
                      {additionalPlugins.map((plugin, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <span className="text-sm font-mono">{plugin}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePlugin(plugin)}
                            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          )}

          <DialogFooter className="pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isAddContainerMode ? "Add Containers" : "Create Environment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
