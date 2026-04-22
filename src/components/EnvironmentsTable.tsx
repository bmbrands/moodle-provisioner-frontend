import React, { useState } from "react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Play, Square, Trash2, MoreHorizontal, Copy, ExternalLink, Settings, Download, Clock, Pin, GitPullRequest, ChevronDown, ChevronRight, Plus, Network, Container, Server, GitBranch, Tag, Package, Database, Binary } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { toast } from "sonner";

import type { Plugin, PluginVersion } from "../types/plugin";

export interface MoodleContainer {
  id: string;
  moodleVersion: string;
  status: "running" | "stopped" | "starting" | "stopping" | "provisioning";
  url: string;
  adminPassword: string;
  createdAt: string;
  advancedConfig?: {
    database: string;
    phpVersion: string;
    enableMLBackend: boolean;
    additionalPlugins: string[];
  };
}

export interface Environment {
  id: string;
  name: string;
  plugin: string;
  version: string;
  containers: MoodleContainer[];
  isPinned?: boolean;
  isWebhookCreated?: boolean;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  // Real-time provisioning state from the backend. Present only while the
  // infrastructure is being set up (queued → cloning → building → finalizing).
  provisioningPhase?: "queued" | "cloning" | "building" | "finalizing" | "error";
  provisioningError?: string;
}

const getVersionUrl = (plugin: Plugin | undefined, version: string, pluginVersions: Record<string, PluginVersion[]>) => {
  if (!plugin) return null;
  for (const [pluginId, versions] of Object.entries(pluginVersions)) {
    if (pluginId === plugin.id || (plugin.name === versions[0]?.name?.split('/')[0])) {
      const versionInfo = versions.find(v => v.ref === version);
      if (versionInfo) {
        const repoUrl = plugin.repositoryUrl;
        switch (versionInfo.type) {
          case "branch":
            return `${repoUrl}/tree/${version}`;
          case "tag":
            return `${repoUrl}/releases/tag/${version}`;
          case "pr":
            const prNumber = version.replace(/^PR#/, '');
            return `${repoUrl}/pull/${prNumber}`;
          default:
            return null;
        }
      }
    }
  }
  return null;
};

const getVersionIcon = (plugin: Plugin | undefined, version: string, pluginVersions: Record<string, PluginVersion[]>) => {
  if (!plugin) return null;
  for (const [pluginId, versions] of Object.entries(pluginVersions)) {
    if (pluginId === plugin.id || (plugin.name === versions[0]?.name?.split('/')[0])) {
      const versionInfo = versions.find(v => v.ref === version);
      if (versionInfo) {
        switch (versionInfo.type) {
          case "branch":
            return <GitBranch className="h-4 w-4 text-info" />;
          case "tag":
            return <Tag className="h-4 w-4 text-success" />;
          case "pr":
            return <GitPullRequest className="h-4 w-4 text-warning" />;
          default:
            return null;
        }
      }
    }
  }
  return null;
};

interface EnvironmentsTableProps {
  environments: Environment[];
  plugins: Plugin[];
  pluginVersions: Record<string, PluginVersion[]>;
  onStartContainer: (environmentId: string, containerId: string) => void;
  onStopContainer: (environmentId: string, containerId: string) => void;
  onDeleteContainer: (environmentId: string, containerId: string) => void;
  onDeleteEnvironment: (id: string) => void;
  onAddContainer: (environmentId: string, moodleVersions: string[], advancedConfig?: any) => void;
  onRowClick: (environment: Environment) => void;
  onContainerClick: (environment: Environment, container: MoodleContainer) => void;
  onContainerDetails?: (environment: Environment, container: MoodleContainer) => void;
  onViewTimeline: (environment: Environment, container?: MoodleContainer) => void;
}

export function EnvironmentsTable({
  environments,
  plugins,
  pluginVersions,
  onStartContainer,
  onStopContainer,
  onDeleteContainer,
  onDeleteEnvironment,
  onAddContainer,
  onRowClick,
  onContainerClick,
  onContainerDetails,
  onViewTimeline
}: EnvironmentsTableProps) {
  const [expandedEnvironments, setExpandedEnvironments] = useState<Set<string>>(new Set());

  const toggleEnvironment = (environmentId: string) => {
    setExpandedEnvironments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(environmentId)) {
        newSet.delete(environmentId);
      } else {
        newSet.add(environmentId);
      }
      return newSet;
    });
  };

  const getContainerStatusBadge = (status: MoodleContainer['status']) => {
    switch (status) {
      case "running":
        return { variant: "default" as const, className: "bg-success text-success-foreground" };
      case "stopped":
        return { variant: "secondary" as const, className: "bg-muted text-muted-foreground" };
      case "starting":
        return { variant: "outline" as const, className: "border-info text-info bg-info/10" };
      case "stopping":
        return { variant: "outline" as const, className: "border-warning text-warning bg-warning/10" };
      case "provisioning":
        return { variant: "outline" as const, className: "border-secondary text-secondary bg-secondary/10" };
      default:
        return { variant: "secondary" as const, className: "bg-muted text-muted-foreground" };
    }
  };

  const getEnvironmentStatus = (environment: Environment) => {
    const containers = environment.containers;
    if (containers.length === 0) return "no-containers";

    const runningContainers = containers.filter(c => c.status === "running").length;
    const provisioningContainers = containers.filter(c => c.status === "provisioning").length;
    const totalContainers = containers.length;

    if (provisioningContainers > 0) return "provisioning";
    if (runningContainers === totalContainers) return "running";
    if (runningContainers === 0) return "stopped";
    return "mixed";
  };

  const getEnvironmentStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return { variant: "default" as const, className: "bg-success text-success-foreground" };
      case "stopped":
        return { variant: "secondary" as const, className: "bg-muted text-muted-foreground" };
      case "mixed":
        return { variant: "outline" as const, className: "border-warning text-warning bg-warning/10" };
      case "provisioning":
        return { variant: "outline" as const, className: "border-secondary text-secondary bg-secondary/10" };
      case "no-containers":
        return { variant: "outline" as const, className: "border-muted text-muted-foreground bg-muted/10" };
      default:
        return { variant: "secondary" as const, className: "bg-muted text-muted-foreground" };
    }
  };

  const handleMenuAction = (action: string, env: Environment, container?: MoodleContainer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    switch (action) {
      case 'clone':
        if (container) {
          // TODO: Implement container cloning
          toast.error("Container cloning not yet implemented");
        } else {
          toast.success(`Cloning environment "${env.name}"...`);
        }
        break;
      case 'export':
        if (container) {
          toast.success(`Exporting container ${container.moodleVersion} from "${env.name}"...`);
        } else {
          toast.success(`Exporting environment "${env.name}"...`);
        }
        break;
      case 'settings':
        if (container) {
          toast.success(`Opening settings for container ${container.moodleVersion}...`);
        } else {
          toast.success(`Opening settings for "${env.name}"...`);
        }
        break;
      case 'add-container':
        const moodleVersions = ["5.0.0"]; // Default version for quick add
        onAddContainer(env.id, moodleVersions);
        break;
    }
  };

  const flattenedRows: Array<{
    type: 'environment' | 'container' | 'no-containers';
    environment: Environment;
    container?: MoodleContainer;
    isExpanded?: boolean;
    envIndex?: number;
  }> = [];

  environments.forEach((env, envIndex) => {
    const isExpanded = expandedEnvironments.has(env.id);
    flattenedRows.push({
      type: 'environment',
      environment: env,
      isExpanded,
      envIndex
    });

    if (isExpanded) {
      if (env.containers.length === 0) {
        flattenedRows.push({
          type: 'no-containers',
          environment: env
        });
      } else {
        env.containers.forEach((container) => {
          flattenedRows.push({
            type: 'container',
            environment: env,
            container
          });
        });
      }
    }
  });

  return (
    <div className="rounded-lg border border-border bg-card shadow-md">
      <Table className="w-full">
        <TableHeader className="bg-table-header">
          <TableRow className="border-b-2 border-border hover:bg-table-header">
            <TableHead className="w-[30%] font-semibold text-table-header-foreground text-center">Name</TableHead>
            <TableHead className="w-[20%] font-semibold text-table-header-foreground">Plugin & Version</TableHead>
            <TableHead className="w-[15%] font-semibold text-table-header-foreground">Owner</TableHead>
            <TableHead className="w-[15%] font-semibold text-table-header-foreground">Status</TableHead>
            <TableHead className="w-[10%] font-semibold text-table-header-foreground">Created</TableHead>
            <TableHead className="w-[10%] font-semibold text-table-header-foreground text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:has([colspan])]:border-0">
          {flattenedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No test environments match your current filters. Try adjusting your search criteria or clear filters to see all environments.
              </TableCell>
            </TableRow>
          ) : (
            flattenedRows.map((row, index) => {
              const previousEnvironmentRows = flattenedRows.slice(0, index).filter(r => r.type === 'environment');
              const isFirstEnvironment = previousEnvironmentRows.length === 0;
              const env = row.environment;

              if (row.type === 'no-containers') {
                return (
                  <TableRow key={`${env.id}-no-containers`} className="!border-0">
                    <TableCell colSpan={6} className="p-0 border-0">
                      <div className="py-4 px-12">
                        <div className="text-center text-muted-foreground text-sm py-4">
                          No containers created yet. Click "Add Container" to create your first Moodle instance.
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }

              if (row.type === 'container' && row.container) {
                const containerStatusBadge = getContainerStatusBadge(row.container.status);
                const container = row.container;

                return (
                  <TableRow key={`${env.id}-${container.id}`} className="!border-0">
                    <TableCell colSpan={6} className="p-0 border-0">
                      <div className={cn(
                        "pt-4 px-12",
                        (index === flattenedRows.length - 1 || flattenedRows[index + 1]?.type === 'environment') && "pb-4"
                      )}>
                        <div
                          className="relative bg-background border rounded-lg p-4 flex items-center justify-between transition-colors">
                          <div className="flex items-center gap-4">
                            <Container className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <span
                                  className="cursor-pointer hover:text-primary"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onContainerDetails?.(env, container);
                                  }}
                                >
                                  Moodle {container.moodleVersion}
                                </span>
                                <Badge variant={containerStatusBadge.variant} className={containerStatusBadge.className}>
                                  {container.status === "provisioning" && env.provisioningPhase
                                    ? `provisioning · ${env.provisioningPhase}`
                                    : container.status}
                                </Badge>
                                {env.provisioningError && container.status === "provisioning" && (
                                  <Badge variant="destructive" className="text-xs">
                                    error
                                  </Badge>
                                )}
                              </div>
                              {container.advancedConfig && (
                                <div className="flex items-center gap-2 mt-1 text-sm">
                                  <div className="flex items-center gap-1.5 bg-muted/50 py-0.5 px-2 rounded-md">
                                    <Database className="h-3.5 w-3.5 text-primary" />
                                    {container.advancedConfig.database.toLowerCase().includes('mariadb') ? (
                                      <img
                                        src="/mariadb-icon.svg"
                                        alt="MariaDB"
                                        className="h-3.5 w-3.5"
                                      />
                                    ) : container.advancedConfig.database.toLowerCase().includes('mysql') ? (
                                      <img
                                        src="/mysql-icon.svg"
                                        alt="MySQL"
                                        className="h-3.5 w-3.5"
                                      />
                                    ) : container.advancedConfig.database.toLowerCase().includes('postgres') ? (
                                      <img
                                        src="/postgresql-icon.svg"
                                        alt="PostgreSQL"
                                        className="h-3.5 w-3.5"
                                      />
                                    ) : null}
                                    <span className="text-xs font-medium">{container.advancedConfig.database}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-muted/50 py-0.5 px-2 rounded-md">
                                    <Binary className="h-3.5 w-3.5 text-primary" />
                                    <img
                                      src="/php-icon.svg"
                                      alt="PHP"
                                      className="h-3.5 w-3.5"
                                    />
                                    <span className="text-xs font-medium">PHP {container.advancedConfig.phpVersion}</span>
                                  </div>
                                  {container.advancedConfig.enableMLBackend && (
                                    <div className="flex items-center gap-1.5 bg-info/10 py-0.5 px-2 rounded-md">
                                      <Network className="h-3.5 w-3.5 text-info" />
                                      <span className="text-xs font-medium text-info">MLBackend enabled</span>
                                    </div>
                                  )}
                                  {container.advancedConfig.additionalPlugins.length > 0 && (
                                    <div className="flex items-center gap-1.5 bg-warning/10 py-0.5 px-2 rounded-md">
                                      <Package className="h-3.5 w-3.5 text-warning" />
                                      <span className="text-xs font-medium text-warning">
                                        {container.advancedConfig.additionalPlugins.length} additional plugin{container.advancedConfig.additionalPlugins.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="mt-1 flex flex-col gap-1">
                                {container.createdAt && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <span className="text-muted-foreground">Created:</span>
                                    <span className="text-muted-foreground">{container.createdAt}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-sm">
                                  <span className="text-muted-foreground">URL:</span>
                                  <a
                                    href={container.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary flex items-center gap-1 hover:underline"
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {container.url.replace('https://', '').replace('http://', '')}
                                  </a>
                                </div>
                                <div
                                  className="text-sm text-muted-foreground flex items-center gap-1"
                                >
                                  <span className="text-muted-foreground">Admin password:</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <code
                                        className="bg-muted px-1 rounded cursor-pointer group-hover:bg-muted/80"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(container.adminPassword)
                                            .then(() => toast.success("Password copied!"))
                                            .catch(() => toast.error("Failed to copy password"));
                                        }}
                                      >
                                        {container.adminPassword}
                                      </code>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Click to copy password</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {container.status === "stopped" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  onStartContainer(env.id, container.id);
                                }}
                                className="border-success text-success hover:bg-success hover:text-success-foreground"
                              >
                                <Play className="h-4 w-4" />
                                <span className="ml-1">Start</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  onStopContainer(env.id, container.id);
                                }}
                                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Square className="h-4 w-4" />
                                <span className="ml-1">Stop</span>
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleMenuAction('clone', env, container)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Clone Container
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onContainerDetails?.(env, container)}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onViewTimeline(env, container)}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  View Timeline
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onDeleteContainer(env.id, container.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Container
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }

              if (row.type === 'environment') {
                const envStatus = getEnvironmentStatus(env);
                const statusBadge = getEnvironmentStatusBadge(envStatus);
                const isExpanded = row.isExpanded || false;

                return (
                  <TableRow
                    key={env.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      !isFirstEnvironment && row.type === 'environment' && "border-t border-border"
                    )}
                    onClick={() => toggleEnvironment(env.id)}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Server className="h-4 w-4 text-primary" />
                          <span
                            className="font-medium hover:text-primary"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              onRowClick(env);
                            }}
                          >
                            {env.name}
                          </span>
                          {env.isPinned && (
                            <Pin
                              className="h-4 w-4 text-warning fill-warning"
                              aria-label="Environment is pinned"
                            />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground pl-10">
                          {env.containers.length} container{env.containers.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const plugin = plugins.find(p => p.name === env.plugin);
                          return plugin?.repositoryUrl ? (
                            <a
                              href={plugin.repositoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary no-underline hover:no-underline flex items-center gap-1 w-fit"
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            >
                              <span>{env.plugin}</span>
                              <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <span className="font-medium">{env.plugin}</span>
                          );
                        })()}
                        <div className="flex items-center gap-2">
                          {getVersionIcon(plugins.find(p => p.name === env.plugin), env.version, pluginVersions)}
                          {(() => {
                            const plugin = plugins.find(p => p.name === env.plugin);
                            const versionUrl = getVersionUrl(plugin, env.version, pluginVersions);
                            return versionUrl ? (
                              <a
                                href={versionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="no-underline hover:no-underline group"
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              >
                                <Badge
                                  variant="outline"
                                  className="w-fit group-hover:border-primary group-hover:text-primary cursor-pointer transition-all flex items-center gap-1"
                                >
                                  <span>{env.version}</span>
                                  <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </Badge>
                              </a>
                            ) : (
                              <Badge variant="outline" className="w-fit">
                                {env.version}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {env.isWebhookCreated && (
                        <GitPullRequest
                          className="h-4 w-4 text-warning"
                          aria-label="Created from GitHub webhook"
                        />
                      )}
                      {env.createdBy?.name ? (
                        <span className="text-sm">{env.createdBy.name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge.variant} className={statusBadge.className}>
                        {envStatus === "no-containers" ? "No containers" :
                         envStatus === "mixed" ? `Mixed (${env.containers.filter(c => c.status === 'running').length}/${env.containers.length})` :
                         envStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{env.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleMenuAction('add-container', env);
                          }}
                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Container
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleMenuAction('clone', env)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Clone Environment
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMenuAction('export', env)}>
                              <Download className="h-4 w-4 mr-2" />
                              Export Environment
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onViewTimeline(env)}>
                              <Clock className="h-4 w-4 mr-2" />
                              View Timeline
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMenuAction('settings', env)}>
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onDeleteEnvironment(env.id);
                              }}
                              className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Environment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
