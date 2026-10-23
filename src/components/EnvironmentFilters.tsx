import { useState } from "react";
import { Search, Filter, X, Calendar, User, Package, Server, Activity, GitPullRequest, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import type { Environment } from "./EnvironmentsTable";

export interface EnvironmentFilters {
  search: string;
  plugins: string[];
  moodleVersions: string[];
  statuses: string[];
  owners: string[];
  ageRange: "all" | "today" | "week" | "month" | "older";
  creationSource: "all" | "manual" | "webhook";
}

interface EnvironmentFiltersProps {
  environments: Environment[];
  filters: EnvironmentFilters;
  onFiltersChange: (filters: EnvironmentFilters) => void;
  onClearFilters: () => void;
}

export function EnvironmentFiltersComponent({
  environments,
  filters,
  onFiltersChange,
  onClearFilters
}: EnvironmentFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<{
    plugins: string;
    moodleVersions: string;
    statuses: string;
    owners: string;
  }>({
    plugins: "",
    moodleVersions: "",
    statuses: "",
    owners: ""
  });

  // Extract unique values for filter options
  const uniquePlugins = [...new Set(environments.map(env => env.plugin))].sort();
  const uniqueMoodleVersions = [...new Set(
    environments.flatMap(env =>
      env.containers.map(container => container.moodleVersion)
    )
  )].sort((a, b) => {
    // Compare version numbers properly
    const versionA = a.split('.').map(Number);
    const versionB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
      const numA = versionA[i] || 0;
      const numB = versionB[i] || 0;
      if (numA !== numB) return numB - numA; // Sort descending
    }
    return 0;
  });
  const uniqueStatuses = [...new Set(
    environments.flatMap(env =>
      env.containers.length === 0
        ? ["no-containers"]
        : env.containers.map(container => container.status)
    )
  )].sort();
  const uniqueOwners = [
    ...new Set(
      environments
        .filter(env => env.createdBy)
        .map(env => env.createdBy!.name)
    )
  ].sort();

  const updateFilters = (key: keyof EnvironmentFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const addToMultiFilter = (key: 'plugins' | 'moodleVersions' | 'statuses' | 'owners', value: string) => {
    const currentValues = filters[key];
    if (!currentValues.includes(value)) {
      updateFilters(key, [...currentValues, value]);
    }
    // Reset the current selection for this filter
    setCurrentSelection(prev => ({ ...prev, [key]: "" }));
  };

  const removeFromMultiFilter = (key: 'plugins' | 'moodleVersions' | 'statuses' | 'owners', value: string) => {
    const currentValues = filters[key];
    const newValues = currentValues.filter(v => v !== value);
    updateFilters(key, newValues);
  };

  const hasActiveFilters = filters.search !== "" ||
    filters.plugins.length > 0 ||
    filters.moodleVersions.length > 0 ||
    filters.statuses.length > 0 ||
    filters.owners.length > 0 ||
    filters.ageRange !== "all" ||
    filters.creationSource !== "all";

  const activeFiltersCount = [
    filters.search !== "",
    filters.plugins.length > 0,
    filters.moodleVersions.length > 0,
    filters.statuses.length > 0,
    filters.owners.length > 0,
    filters.ageRange !== "all",
    filters.creationSource !== "all"
  ].filter(Boolean).length;

  return (
    <Card className="shadow-lg">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4 border-b bg-table-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search environments..."
                  value={filters.search}
                  onChange={(e) => updateFilters('search', e.target.value)}
                  className="pl-10 bg-background"
                  aria-label="Search environments by name"
                />
              </div>

              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shadow-sm"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Hide' : 'Show'} advanced filters`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear all filters"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filters.search && (
                <Badge variant="outline" className="bg-background">
                  <Search className="h-3 w-3 mr-1" />
                  "{filters.search}"
                  <button
                    onClick={() => updateFilters('search', '')}
                    className="ml-1 hover:text-destructive"
                    aria-label="Clear search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.plugins.map(plugin => (
                <Badge key={plugin} variant="outline" className="bg-background">
                  <Package className="h-3 w-3 mr-1" />
                  {plugin}
                  <button
                    onClick={() => removeFromMultiFilter('plugins', plugin)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${plugin} from plugin filters`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              {filters.moodleVersions.map(version => (
                <Badge key={version} variant="outline" className="bg-background">
                  <Server className="h-3 w-3 mr-1" />
                  {version}
                  <button
                    onClick={() => removeFromMultiFilter('moodleVersions', version)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${version} from Moodle version filters`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              {filters.statuses.map(status => (
                <Badge key={status} variant="outline" className="bg-background">
                  <Activity className="h-3 w-3 mr-1" />
                  {status}
                  <button
                    onClick={() => removeFromMultiFilter('statuses', status)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${status} from status filters`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              {filters.owners.map(owner => (
                <Badge key={owner} variant="outline" className="bg-background">
                  <User className="h-3 w-3 mr-1" />
                  {owner}
                  <button
                    onClick={() => removeFromMultiFilter('owners', owner)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${owner} from owner filters`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              {filters.ageRange !== "all" && (
                <Badge variant="outline" className="bg-background">
                  <Calendar className="h-3 w-3 mr-1" />
                  {filters.ageRange}
                  <button
                    onClick={() => updateFilters('ageRange', 'all')}
                    className="ml-1 hover:text-destructive"
                    aria-label="Clear age range filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}


              {filters.creationSource !== "all" && (
                <Badge variant="outline" className="bg-background">
                  <GitPullRequest className="h-3 w-3 mr-1" />
                  {filters.creationSource === "webhook" ? "GitHub" : "Manual"}
                  <button
                    onClick={() => updateFilters('creationSource', 'all')}
                    className="ml-1 hover:text-destructive"
                    aria-label="Clear creation source filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        <CollapsibleContent>
          <CardContent className="p-4 bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {/* Plugin Filter */}
              <div className="space-y-2">
                <Label htmlFor="plugin-filter" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Plugin
                </Label>
                <Select
                  value={currentSelection.plugins}
                  onValueChange={(value) => {
                    addToMultiFilter('plugins', value);
                    setCurrentSelection(prev => ({ ...prev, plugins: "" }));
                  }}
                >
                  <SelectTrigger id="plugin-filter" className="bg-background shadow-sm">
                    <SelectValue placeholder="Select plugin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniquePlugins.map(plugin => (
                      <SelectItem
                        key={plugin}
                        value={plugin}
                        disabled={filters.plugins.includes(plugin)}
                      >
                        <span className="flex items-center gap-2">
                          <span>{plugin}</span>
                          {filters.plugins.includes(plugin) && <Check className="h-4 w-4" />}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Moodle Version Filter */}
              <div className="space-y-2">
                <Label htmlFor="moodle-version-filter" className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Moodle Version
                </Label>
                <Select
                  value={currentSelection.moodleVersions}
                  onValueChange={(value) => {
                    addToMultiFilter('moodleVersions', value);
                    setCurrentSelection(prev => ({ ...prev, moodleVersions: "" }));
                  }}
                >
                  <SelectTrigger id="moodle-version-filter" className="bg-background shadow-sm">
                    <SelectValue placeholder="Select version..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueMoodleVersions.map(version => (
                      <SelectItem
                        key={version}
                        value={version}
                        disabled={filters.moodleVersions.includes(version)}
                      >
                        <span className="flex items-center gap-2">
                          <span>{version}</span>
                          {filters.moodleVersions.includes(version) && <Check className="h-4 w-4" />}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Status
                </Label>
                <Select
                  value={currentSelection.statuses}
                  onValueChange={(value) => {
                    addToMultiFilter('statuses', value);
                    setCurrentSelection(prev => ({ ...prev, statuses: "" }));
                  }}
                >
                  <SelectTrigger id="status-filter" className="bg-background shadow-sm">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueStatuses.map(status => (
                      <SelectItem
                        key={status}
                        value={status}
                        disabled={filters.statuses.includes(status)}
                      >
                        <span className="flex items-center gap-2">
                          <span className="capitalize">{status}</span>
                          {filters.statuses.includes(status) && <Check className="h-4 w-4" />}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Owner Filter */}
              <div className="space-y-2">
                <Label htmlFor="owner-filter" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Owner
                </Label>
                <Select
                  value={currentSelection.owners}
                  onValueChange={(value) => {
                    addToMultiFilter('owners', value);
                    setCurrentSelection(prev => ({ ...prev, owners: "" }));
                  }}
                >
                  <SelectTrigger id="owner-filter" className="bg-background shadow-sm">
                    <SelectValue placeholder="Select owner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueOwners.map(owner => (
                      <SelectItem
                        key={owner}
                        value={owner}
                        disabled={filters.owners.includes(owner)}
                      >
                        <span className="flex items-center gap-2">
                          <span>{owner}</span>
                          {filters.owners.includes(owner) && <Check className="h-4 w-4" />}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Age Range Filter */}
              <div className="space-y-2">
                <Label htmlFor="age-filter" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Age
                </Label>
                <Select value={filters.ageRange} onValueChange={(value) => updateFilters('ageRange', value)}>
                  <SelectTrigger id="age-filter" className="bg-background shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All environments</SelectItem>
                    <SelectItem value="today">Created today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="older">Older than 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              {/* Creation Source Filter */}
              <div className="space-y-2">
                <Label htmlFor="source-filter" className="flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4" />
                  Source
                </Label>
                <Select value={filters.creationSource} onValueChange={(value) => updateFilters('creationSource', value)}>
                  <SelectTrigger id="source-filter" className="bg-background shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="manual">Manual creation</SelectItem>
                    <SelectItem value="webhook">GitHub webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Filter function to apply all filters to environments array
export function applyEnvironmentFilters(environments: Environment[], filters: EnvironmentFilters): Environment[] {
  return environments.filter(env => {
    // Search filter (name)
    if (filters.search && !env.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Plugin filter
    if (filters.plugins.length > 0 && !filters.plugins.includes(env.plugin)) {
      return false;
    }

    // Moodle version filter
    if (filters.moodleVersions.length > 0) {
      const envMoodleVersions = env.containers.map(container => container.moodleVersion);
      if (!envMoodleVersions.some(version => filters.moodleVersions.includes(version))) {
        return false;
      }
    }

    // Status filter
    if (filters.statuses.length > 0) {
      if (env.containers.length === 0) {
        // Special case for environments with no containers
        if (!filters.statuses.includes("no-containers")) {
          return false;
        }
      } else {
        // For environments with containers, check if any container matches the selected statuses
        if (!env.containers.some(container => filters.statuses.includes(container.status))) {
          return false;
        }
      }
    }

    // Owner filter
    if (filters.owners.length > 0) {
      if (!env.createdBy || !filters.owners.includes(env.createdBy.name)) {
        return false;
      }
    }

    // Age filter
    if (filters.ageRange !== "all") {
      const now = new Date();
      const createdAt = parseCreatedAt(env.createdAt);

      if (!createdAt) return true; // If we can't parse the date, include it

      const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      switch (filters.ageRange) {
        case "today":
          if (daysDiff > 0) return false;
          break;
        case "week":
          if (daysDiff > 7) return false;
          break;
        case "month":
          if (daysDiff > 30) return false;
          break;
        case "older":
          if (daysDiff <= 30) return false;
          break;
      }
    }


    // Creation source filter
    if (filters.creationSource !== "all") {
      const isWebhookCreated = env.isWebhookCreated === true;
      if (filters.creationSource === "webhook" && !isWebhookCreated) {
        return false;
      }
      if (filters.creationSource === "manual" && isWebhookCreated) {
        return false;
      }
    }

    return true;
  });
}

// Helper function to parse the createdAt string
function parseCreatedAt(createdAt: string): Date | null {
  const now = new Date();

  if (createdAt === "Just now") {
    return now;
  }

  // Parse relative times like "2 hours ago", "1 day ago", etc.
  const match = createdAt.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
  if (match) {
    const [, amount, unit] = match;
    const num = parseInt(amount);

    switch (unit) {
      case "minute":
        return new Date(now.getTime() - num * 60 * 1000);
      case "hour":
        return new Date(now.getTime() - num * 60 * 60 * 1000);
      case "day":
        return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  // Try to parse as a regular date
  const parsed = new Date(createdAt);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const defaultFilters: EnvironmentFilters = {
  search: "",
  plugins: [],
  moodleVersions: [],
  statuses: [],
  owners: [],
  ageRange: "all",
  creationSource: "all"
};
