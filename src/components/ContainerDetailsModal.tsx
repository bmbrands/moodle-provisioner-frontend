import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Copy, ExternalLink, Eye, FileText, GitPullRequest, Container, Database, Cpu, Network, Play, Square } from "lucide-react";
import { toast } from "sonner";
import type { Environment, MoodleContainer } from "./EnvironmentsTable";

export interface DetailedContainer {
  container: MoodleContainer;
  environment: Environment;
  logs: string[];
  dockerLinks: {
    container: string;
    logs: string;
    exec: string;
  };
}

interface ContainerDetailsModalProps {
  container: DetailedContainer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogActivity?: (action: string, resource: string, details: Record<string, any>, resourceId?: string, resourceName?: string) => void;
  onStartContainer?: (environmentId: string, containerId: string) => void;
  onStopContainer?: (environmentId: string, containerId: string) => void;
}

export function ContainerDetailsModal({
  container,
  open,
  onOpenChange,
  onLogActivity,
  onStartContainer,
  onStopContainer
}: ContainerDetailsModalProps) {
  if (!container) return null;

  const { container: containerData, environment, logs, dockerLinks } = container;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);

      // Log password copy activity
      if (label.toLowerCase().includes('password') && onLogActivity) {
        onLogActivity('copy_password', 'container', { passwordCopied: true }, containerData.id, `${environment.name} - Moodle ${containerData.moodleVersion}`);
      }
    } catch (err) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
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

  const containerStatusBadge = getContainerStatusBadge(containerData.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-3">
                <Container className="h-5 w-5 text-primary" />
                Moodle {containerData.moodleVersion}
                <Badge variant={containerStatusBadge.variant} className={containerStatusBadge.className}>
                  {containerData.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Container details for {environment.name} • Created {containerData.createdAt}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Environment Context */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Environment Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Environment</dt>
                    <dd className="font-medium">{environment.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Plugin</dt>
                    <dd className="font-medium">{environment.plugin}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Plugin Version</dt>
                    <dd>
                      {environment.isWebhookCreated && environment.pullRequestUrl ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-info hover:text-info/80 underline decoration-1 underline-offset-2 hover:decoration-2"
                          onClick={() => window.open(environment.pullRequestUrl, '_blank')}
                        >
                          <GitPullRequest className="h-3 w-3 mr-1" />
                          <code className="text-info">
                            PR #{environment.pullRequestNumber}
                          </code>
                        </Button>
                      ) : (
                        <code className="px-2 py-1 bg-muted rounded text-sm">
                          {environment.version}
                        </code>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Container Created</dt>
                    <dd className="text-sm">{containerData.createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Creation Source</dt>
                    <dd className="text-sm">
                      <div className="flex items-center gap-2">
                        {environment.isWebhookCreated ? (
                          <>
                            <GitPullRequest className="h-4 w-4 text-info" />
                            <span className="font-medium text-info">GitHub Webhook</span>
                            {environment.pullRequestUrl && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-info hover:text-info/80 text-xs"
                                onClick={() => window.open(environment.pullRequestUrl, '_blank')}
                              >
                                View PR #{environment.pullRequestNumber}
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-medium">Manual Creation</span>
                          </>
                        )}
                      </div>
                    </dd>
                  </div>
                  {environment.createdBy && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Created By</dt>
                      <dd className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{environment.createdBy.name}</span>
                          <span className="text-muted-foreground">({environment.createdBy.email})</span>
                        </div>
                      </dd>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Container Details */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Container Configuration</CardTitle>
                <CardDescription>
                  Moodle {containerData.moodleVersion} instance configuration and access details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Container URL</dt>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2 py-1 bg-muted rounded text-sm text-xs">
                        {containerData.url}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(containerData.url, '_blank')}
                        disabled={containerData.status !== "running"}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Admin Password</dt>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2 py-1 bg-muted rounded text-sm text-xs font-mono">
                        {containerData.adminPassword}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(containerData.adminPassword, "Admin password")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Moodle Version</dt>
                    <dd>
                      <Badge variant="outline" className="text-sm">
                        {containerData.moodleVersion}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">Status</dt>
                    <dd>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={containerStatusBadge.variant}
                          className={containerStatusBadge.className}
                        >
                          {containerData.status}
                        </Badge>
                        {onStartContainer && onStopContainer && (
                          <>
                            {containerData.status === "stopped" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStartContainer(environment.id, containerData.id)}
                                className="border-success text-success hover:bg-success hover:text-success-foreground"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStopContainer(environment.id, containerData.id)}
                                disabled={containerData.status === "stopping" || containerData.status === "provisioning"}
                                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Square className="h-4 w-4 mr-1" />
                                Stop
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </dd>
                  </div>
                </div>

                {/* Advanced Configuration */}
                {containerData.advancedConfig && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-3">Advanced Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Database</dt>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{containerData.advancedConfig.database}</span>
                          </div>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">PHP Version</dt>
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">PHP {containerData.advancedConfig.phpVersion}</span>
                          </div>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">MLBackend</dt>
                          <div className="flex items-center gap-2">
                            <Network className={`h-4 w-4 ${containerData.advancedConfig.enableMLBackend ? 'text-info' : 'text-muted-foreground'}`} />
                            <span className={`font-medium ${containerData.advancedConfig.enableMLBackend ? 'text-info' : 'text-muted-foreground'}`}>
                              {containerData.advancedConfig.enableMLBackend ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground mb-1">Additional Plugins</dt>
                          <dd>
                            {containerData.advancedConfig.additionalPlugins.length > 0 ? (
                              <Badge variant="outline" className="text-sm">
                                {containerData.advancedConfig.additionalPlugins.length} plugin{containerData.advancedConfig.additionalPlugins.length !== 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">None</span>
                            )}
                          </dd>
                        </div>
                      </div>

                      {containerData.advancedConfig.additionalPlugins.length > 0 && (
                        <div className="mt-4">
                          <dt className="text-sm text-muted-foreground mb-2">Installed Additional Plugins</dt>
                          <div className="flex flex-wrap gap-1">
                            {containerData.advancedConfig.additionalPlugins.map((plugin, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {plugin}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Docker Management */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Docker Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Container Dashboard</span>
                  <Button size="sm" variant="outline" onClick={() => window.open(dockerLinks.container, '_blank')}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Container
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Container Logs</span>
                  <Button size="sm" variant="outline" onClick={() => window.open(dockerLinks.logs, '_blank')}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Logs
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Execute Commands</span>
                  <Button size="sm" variant="outline" onClick={() => window.open(dockerLinks.exec, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Shell Access
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Application Logs */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recent Application Logs</CardTitle>
                <CardDescription>Last 10 log entries for this container</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48 w-full rounded border p-4">
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-xs font-mono text-muted-foreground">
                        {log}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
