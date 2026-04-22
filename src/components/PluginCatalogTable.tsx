import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { MoreHorizontal, ExternalLink, Edit, Trash2, Package, GitBranch, Plus } from "lucide-react";
import type { Plugin } from "../types/plugin";
import { toast } from "sonner";

interface PluginCatalogTableProps {
  plugins: Plugin[];
  onToggleActive: (pluginId: string) => void;
  onDeletePlugin: (pluginId: string) => void;
  onAddPlugin: () => void;
  onEditPlugin?: (plugin: Plugin) => void;
}

const pluginTypeColors: Record<Plugin['type'], string> = {
  activity: "bg-primary/10 text-primary border-primary/20",
  block: "bg-secondary/10 text-secondary border-secondary/20",
  theme: "bg-success/10 text-success border-success/20",
  local: "bg-warning/10 text-warning border-warning/20",
  admin: "bg-info/10 text-info border-info/20",
  core: "bg-muted text-muted-foreground border-muted-foreground/20",
  other: "bg-accent text-accent-foreground border-accent/20"
};

const pluginTypeLabels: Record<Plugin['type'], string> = {
  activity: "Activity",
  block: "Block",
  theme: "Theme",
  local: "Local",
  admin: "Admin Tool",
  core: "Core",
  other: "Other"
};

export function PluginCatalogTable({ plugins, onToggleActive, onDeletePlugin, onAddPlugin, onEditPlugin }: PluginCatalogTableProps) {
  const handleOpenRepository = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDeletePlugin = (plugin: Plugin) => {
    if (confirm(`Are you sure you want to delete the plugin "${plugin.displayName}"? This action cannot be undone.`)) {
      onDeletePlugin(plugin.id);
      toast.success(`Plugin "${plugin.displayName}" deleted successfully`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="shadow-sm flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Plugin Catalog
            </CardTitle>
            <CardDescription>
              Manage available Moodle plugins for test environment creation
            </CardDescription>
          </div>
          <Button onClick={onAddPlugin} className="shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Add Plugin
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        {plugins.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No plugins configured</h3>
            <p className="text-muted-foreground mb-4">
              Add your first plugin to start creating test environments
            </p>
            <Button onClick={onAddPlugin}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plugin
            </Button>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-table-header hover:bg-table-header">
                  <TableHead className="text-table-header-foreground">Plugin</TableHead>
                  <TableHead className="text-table-header-foreground">Type</TableHead>
                  <TableHead className="text-table-header-foreground">Repository</TableHead>
                  <TableHead className="text-table-header-foreground">Installation Path</TableHead>
                  <TableHead className="text-table-header-foreground">Status</TableHead>
                  <TableHead className="text-table-header-foreground">Updated</TableHead>
                  <TableHead className="text-table-header-foreground w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plugins.map((plugin) => (
                <TableRow key={plugin.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{plugin.displayName}</div>
                      <code className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                        {plugin.name}
                      </code>
                      {plugin.description && (
                        <div className="text-sm text-muted-foreground mt-1 max-w-xs truncate">
                          {plugin.description}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={pluginTypeColors[plugin.type]}
                    >
                      {pluginTypeLabels[plugin.type]}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-info hover:text-info/80"
                        onClick={() => handleOpenRepository(plugin.repositoryUrl)}
                      >
                        <GitBranch className="h-3 w-3 mr-1" />
                        <span className="max-w-48 truncate">
                          {plugin.repositoryUrl.replace(/^https?:\/\//, '').replace(/\.git$/, '')}
                        </span>
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell>
                    <code className="px-2 py-1 bg-muted rounded text-sm">
                      {plugin.installationPath}
                    </code>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plugin.isActive}
                        onCheckedChange={() => onToggleActive(plugin.id)}
                        size="sm"
                      />
                      <span className="text-sm">
                        {plugin.isActive ? (
                          <span className="text-success">Active</span>
                        ) : (
                          <span className="text-muted-foreground">Inactive</span>
                        )}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(plugin.updatedAt)}
                    </div>
                    {plugin.createdBy && (
                      <div className="text-xs text-muted-foreground">
                        by {plugin.createdBy.name}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu for {plugin.displayName}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 z-50">
                        <DropdownMenuItem onClick={() => handleOpenRepository(plugin.repositoryUrl)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Repository
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (onEditPlugin) {
                              onEditPlugin(plugin);
                            } else {
                              toast.info("Edit functionality coming soon");
                            }
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Plugin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeletePlugin(plugin)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Plugin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
