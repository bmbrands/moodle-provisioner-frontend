import { useState, useRef, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { CreateEnvironmentModal } from "./components/CreateEnvironmentModal";
import { EnvironmentsTable} from "./components/EnvironmentsTable";
import type { Environment, MoodleContainer } from "./components/EnvironmentsTable";
import { AdminSettingsModal } from "./components/AdminSettingsModal";
import { AuditLogModal } from "./components/AuditLogModal";
import { EnvironmentFiltersComponent, applyEnvironmentFilters, defaultFilters } from "./components/EnvironmentFilters";
import type { EnvironmentFilters } from "./components/EnvironmentFilters";
import { Header } from "./components/Header";
import { useAuth } from "./hooks/useAuth";
import { useAuditLog } from "./hooks/useAuditLog";
import type { Plugin } from "./types/plugin";
import { toast } from "sonner";
import { fetchInfrastructures, startContainer as apiStartContainer, stopContainer as apiStopContainer, deleteContainer as apiDeleteContainer, deleteInfrastructure as apiDeleteInfrastructure, fetchPlugins as apiFetchPlugins, createPlugin as apiCreatePlugin, updatePlugin as apiUpdatePlugin, deletePlugin as apiDeletePlugin, createInfrastructure as apiCreateInfrastructure, addContainers as apiAddContainers } from "./services/api";

// mockEnvironments removed - real data comes from fetchInfrastructures()

export default function App() {
  const auth = useAuth();
  const auditLog = useAuditLog();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [filters, setFilters] = useState<EnvironmentFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddContainerModalOpen, setIsAddContainerModalOpen] = useState(false);
  const [addContainerEnvironment, setAddContainerEnvironment] = useState<Environment | null>(null);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  // Fetch real infrastructure data from the API
  useEffect(() => {
    fetchInfrastructures()
      .then((envs) => {
        setEnvironments(envs);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch infrastructures:", err);
        toast.error("Failed to load environments from API");
        setIsLoading(false);
      });
  }, []);

  // Poll the backend while any container is still provisioning, so the list
  // updates automatically once setup + build finish.
  const hasProvisioningContainers = environments.some(env =>
    env.containers.some(c => c.status === "provisioning")
  );
  useEffect(() => {
    if (!hasProvisioningContainers) return;
    const interval = setInterval(() => {
      fetchInfrastructures()
        .then(setEnvironments)
        .catch((err) => console.error("Failed to refresh infrastructures:", err));
    }, 4000);
    return () => clearInterval(interval);
  }, [hasProvisioningContainers]);

  // Surface provisioning failures as toasts (once per environment).
  const reportedErrorsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    environments.forEach(env => {
      if (env.provisioningError && !reportedErrorsRef.current.has(env.id)) {
        reportedErrorsRef.current.add(env.id);
        toast.error(`Provisioning failed for "${env.name}": ${env.provisioningError}`);
      }
    });
  }, [environments]);

  // Fetch plugin catalog from the API
  useEffect(() => {
    apiFetchPlugins()
      .then(setPlugins)
      .catch((err) => {
        console.error("Failed to fetch plugins:", err);
        toast.error("Failed to load plugin catalog from API");
      });
  }, []);

  // Apply filters to get filtered environments
  const filteredEnvironments = useMemo(() => {
    return applyEnvironmentFilters(environments, filters);
  }, [environments, filters]);

  const handleFiltersChange = (newFilters: EnvironmentFilters) => {
    setFilters(newFilters);

    // Log the filter activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'filter',
        'environment',
        {
          filterCriteria: newFilters,
          resultsCount: applyEnvironmentFilters(environments, newFilters).length
        }
      );
    }
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);

    // Log the clear filters activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'clear_filters',
        'environment',
        { totalEnvironments: environments.length }
      );
    }
  };

  const handleCreateEnvironment = async (newEnv: {
    name: string;
    plugin: string;
    version: string;
    versionType: "branch" | "tag" | "pr" | "commit";
    moodleVersions: string[];
  }) => {
    const containerText = newEnv.moodleVersions.length === 1 ? "container" : "containers";
    const toastId = toast.loading(
      `Creating "${newEnv.name}" with ${newEnv.moodleVersions.length} ${containerText}… this can take a few minutes.`
    );

    try {
      await apiCreateInfrastructure({
        name: newEnv.name,
        plugin: newEnv.plugin,
        git_ref_type: newEnv.versionType,
        git_ref: newEnv.version,
        moodle_versions: newEnv.moodleVersions,
      });

      // Reload the authoritative list from the backend so ports, URLs and
      // generated admin passwords reflect what actually got created.
      const envs = await fetchInfrastructures();
      setEnvironments(envs);

      // Log the activity
      if (auth.currentUser) {
        auditLog.logActivity(
          auth.currentUser.id,
          `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
          auth.currentUser.email,
          'create',
          'environment',
          {
            plugin: newEnv.plugin,
            version: newEnv.version,
            versionType: newEnv.versionType,
            moodleVersions: newEnv.moodleVersions,
          },
          newEnv.name,
          newEnv.name
        );
      }

      toast.success(
        `Environment "${newEnv.name}" is being provisioned. It'll appear ready in the list shortly.`,
        { id: toastId }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to create "${newEnv.name}": ${message}`, { id: toastId });
    }
  };

  const handleRowClick = (environment: Environment) => {
    setIsDetailsModalOpen(true);

    // Log the view activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'view',
        'environment',
        { viewType: 'details' },
        environment.id,
        environment.name
      );
    }
  };

  const handleStartContainer = (environmentId: string, containerId: string) => {
    const env = environments.find(e => e.id === environmentId);
    const container = env?.containers.find(c => c.id === containerId);

    if (!env || !container) return;

    setEnvironments(prev =>
      prev.map(environment =>
        environment.id === environmentId
          ? {
              ...environment,
              containers: environment.containers.map(container =>
                container.id === containerId
                  ? { ...container, status: "starting" as const }
                  : container
              )
            }
          : environment
      )
    );

    // Log the activity
    if (auth.currentUser && env && container) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'start',
        'container',
        {
          previousStatus: container.status,
          moodleVersion: container.moodleVersion,
          environmentName: env.name
        },
        containerId,
        `${env.name} - Moodle ${container.moodleVersion}`
      );
    }

    // Call the backend API to start the container
    apiStartContainer(env.name, container.moodleVersion)
      .then(() => {
        setEnvironments(prev =>
          prev.map(environment =>
            environment.id === environmentId
              ? {
                  ...environment,
                  containers: environment.containers.map(c =>
                    c.id === containerId
                      ? { ...c, status: "running" as const }
                      : c
                  )
                }
              : environment
          )
        );
        toast.success(`Container Moodle ${container.moodleVersion} started successfully!`);
      })
      .catch((err) => {
        console.error("Failed to start container:", err);
        setEnvironments(prev =>
          prev.map(environment =>
            environment.id === environmentId
              ? {
                  ...environment,
                  containers: environment.containers.map(c =>
                    c.id === containerId
                      ? { ...c, status: "stopped" as const }
                      : c
                  )
                }
              : environment
          )
        );
        toast.error(`Failed to start container Moodle ${container.moodleVersion}`);
      });
  };

  const handleStopContainer = (environmentId: string, containerId: string) => {
    const env = environments.find(e => e.id === environmentId);
    const container = env?.containers.find(c => c.id === containerId);

    if (!env || !container) return;

    setEnvironments(prev =>
      prev.map(environment =>
        environment.id === environmentId
          ? {
              ...environment,
              containers: environment.containers.map(container =>
                container.id === containerId
                  ? { ...container, status: "stopping" as const }
                  : container
              )
            }
          : environment
      )
    );

    // Log the activity
    if (auth.currentUser && env && container) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'stop',
        'container',
        {
          previousStatus: container.status,
          moodleVersion: container.moodleVersion,
          environmentName: env.name
        },
        containerId,
        `${env.name} - Moodle ${container.moodleVersion}`
      );
    }

    // Call the backend API to stop the container
    apiStopContainer(env.name, container.moodleVersion)
      .then(() => {
        setEnvironments(prev =>
          prev.map(environment =>
            environment.id === environmentId
              ? {
                  ...environment,
                  containers: environment.containers.map(c =>
                    c.id === containerId
                      ? { ...c, status: "stopped" as const }
                      : c
                  )
                }
              : environment
          )
        );
        toast.success(`Container Moodle ${container.moodleVersion} stopped successfully!`);
      })
      .catch((err) => {
        console.error("Failed to stop container:", err);
        setEnvironments(prev =>
          prev.map(environment =>
            environment.id === environmentId
              ? {
                  ...environment,
                  containers: environment.containers.map(c =>
                    c.id === containerId
                      ? { ...c, status: "running" as const }
                      : c
                  )
                }
              : environment
          )
        );
        toast.error(`Failed to stop container Moodle ${container.moodleVersion}`);
      });
  };

  const handleDeleteContainer = (environmentId: string, containerId: string) => {
    const env = environments.find(e => e.id === environmentId);
    const container = env?.containers.find(c => c.id === containerId);

    if (!env || !container) return;

    const previousStatus = container.status;

    // Optimistically mark the container as stopping while the backend
    // tears it down (docker-compose down stops and removes the container).
    setEnvironments(prev =>
      prev.map(environment =>
        environment.id === environmentId
          ? {
              ...environment,
              containers: environment.containers.map(c =>
                c.id === containerId
                  ? { ...c, status: "stopping" as const }
                  : c
              )
            }
          : environment
      )
    );

    // Log the activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'delete',
        'container',
        {
          previousStatus,
          moodleVersion: container.moodleVersion,
          environmentName: env.name
        },
        containerId,
        `${env.name} - Moodle ${container.moodleVersion}`
      );
    }

    apiDeleteContainer(env.name, container.moodleVersion)
      .then(() => {
        setEnvironments(prev =>
          prev.map(environment =>
            environment.id === environmentId
              ? {
                  ...environment,
                  containers: environment.containers.filter(c => c.id !== containerId)
                }
              : environment
          )
        );
        toast.success(`Container Moodle ${container.moodleVersion} deleted successfully!`);
      })
      .catch((err) => {
        console.error("Failed to delete container:", err);
        setEnvironments(prev =>
          prev.map(environment =>
            environment.id === environmentId
              ? {
                  ...environment,
                  containers: environment.containers.map(c =>
                    c.id === containerId
                      ? { ...c, status: previousStatus }
                      : c
                  )
                }
              : environment
          )
        );
        toast.error(`Failed to delete container Moodle ${container.moodleVersion}`);
      });
  };

  const handleAddContainer = (environmentId: string, _moodleVersions: string[]) => {
    // Open the modal instead of directly adding containers
    const env = environments.find(e => e.id === environmentId);
    if (!env) return;

    setAddContainerEnvironment(env);
    setIsAddContainerModalOpen(true);
  };

  const handleCreateContainer = async (containerData: {
    name: string;
    plugin: string;
    version: string;
    versionType: "branch" | "tag" | "pr" | "commit";
    moodleVersions: string[];
  }) => {
    if (!addContainerEnvironment) return;

    const versionsText = containerData.moodleVersions.length === 1 ? "container" : "containers";
    const toastId = toast.loading(
      `Adding ${containerData.moodleVersions.length} ${versionsText} to "${addContainerEnvironment.name}"…`
    );

    try {
      await apiAddContainers(addContainerEnvironment.name, containerData.moodleVersions);

      // Reload so the backend's provisioning placeholders show up in the UI.
      const envs = await fetchInfrastructures();
      setEnvironments(envs);

      // Log the activity
      if (auth.currentUser) {
        auditLog.logActivity(
          auth.currentUser.id,
          `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
          auth.currentUser.email,
          'create',
          'container',
          {
            moodleVersions: containerData.moodleVersions,
            environmentName: addContainerEnvironment.name,
            containersAdded: containerData.moodleVersions.length,
          },
          addContainerEnvironment.id,
          addContainerEnvironment.name
        );
      }

      toast.success(
        `${containerData.moodleVersions.length} ${versionsText} being provisioned for "${addContainerEnvironment.name}".`,
        { id: toastId }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        `Failed to add containers to "${addContainerEnvironment.name}": ${message}`,
        { id: toastId }
      );
    }

    // Close modal and reset state
    setIsAddContainerModalOpen(false);
    setAddContainerEnvironment(null);
  };

  const handleContainerClick = (environment: Environment, container: MoodleContainer) => {
    // For now, just show a toast with container details
    toast.info(`Container: Moodle ${container.moodleVersion} in ${environment.name} - Status: ${container.status}`);

    // Log the view activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'view',
        'container',
        {
          moodleVersion: container.moodleVersion,
          environmentName: environment.name,
          viewType: 'quick_view'
        },
        container.id,
        `${environment.name} - Moodle ${container.moodleVersion}`
      );
    }
  };

  const handleDeleteEnvironment = (id: string) => {
    if (!auth.canDeleteEnvironments) {
      toast.error("You don't have permission to delete environments");
      return;
    }
    const env = environments.find(e => e.id === id);
    if (!env) return;

    // Log the activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'delete',
        'environment',
        {
          plugin: env.plugin,
          version: env.version,
          containersCount: env.containers.length
        },
        id,
        env.name
      );
    }

    const previousEnvironments = environments;

    // Optimistically remove the environment
    setEnvironments(prev => prev.filter(e => e.id !== id));

    apiDeleteInfrastructure(env.name)
      .then(() => {
        toast.success(`Environment "${env.name}" deleted successfully!`);
      })
      .catch((err) => {
        console.error("Failed to delete infrastructure:", err);
        setEnvironments(previousEnvironments);
        toast.error(`Failed to delete environment "${env.name}"`);
      });
  };

  // Plugin Management Handlers
  const handleTogglePluginActive = (pluginId: string) => {
    const plugin = plugins.find(p => p.id === pluginId);
    if (!plugin) return;

    const newActiveStatus = !plugin.isActive;

    // Optimistic update
    setPlugins(prev =>
      prev.map(p =>
        p.id === pluginId
          ? { ...p, isActive: newActiveStatus, updatedAt: new Date().toISOString() }
          : p
      )
    );

    apiUpdatePlugin(pluginId, { isActive: newActiveStatus })
      .then((updated) => {
        setPlugins(prev => prev.map(p => (p.id === pluginId ? updated : p)));
      })
      .catch((err) => {
        console.error("Failed to update plugin:", err);
        // Revert
        setPlugins(prev =>
          prev.map(p => (p.id === pluginId ? { ...p, isActive: plugin.isActive } : p))
        );
        toast.error(`Failed to ${newActiveStatus ? 'activate' : 'deactivate'} plugin`);
        return;
      });

    // Log the activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        newActiveStatus ? 'activate' : 'deactivate',
        'plugin',
        {
          isActive: newActiveStatus,
          pluginType: plugin.type,
          repositoryUrl: plugin.repositoryUrl
        },
        pluginId,
        plugin.displayName
      );
    }

    toast.success(`Plugin "${plugin.displayName}" ${newActiveStatus ? 'activated' : 'deactivated'}`);
  };

  const handleDeletePlugin = (pluginId: string) => {
    const plugin = plugins.find(p => p.id === pluginId);
    if (!plugin) return;

    const previous = plugins;
    setPlugins(prev => prev.filter(p => p.id !== pluginId));

    apiDeletePlugin(pluginId)
      .then(() => {
        toast.success(`Plugin "${plugin.displayName}" deleted successfully`);
      })
      .catch((err) => {
        console.error("Failed to delete plugin:", err);
        setPlugins(previous);
        toast.error(`Failed to delete plugin "${plugin.displayName}"`);
      });

    // Log the activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'delete',
        'plugin',
        {
          pluginType: plugin.type,
          repositoryUrl: plugin.repositoryUrl,
          installationPath: plugin.installationPath
        },
        pluginId,
        plugin.displayName
      );
    }
  };

  const handleAddPlugin = (newPlugin: Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>) => {
    const createdBy = auth.currentUser ? {
      id: auth.currentUser.id,
      name: `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
      email: auth.currentUser.email
    } : newPlugin.createdBy;

    apiCreatePlugin({ ...newPlugin, createdBy })
      .then((plugin) => {
        // Re-fetch the authoritative catalog from the API so the new plugin
        // (and any backend-side normalisation) is reflected in the list,
        // falling back to an optimistic append if the refresh fails.
        apiFetchPlugins()
          .then(setPlugins)
          .catch(() => setPlugins(prev => [...prev, plugin]));
        toast.success(`Plugin "${plugin.displayName}" added successfully`);

        // Log the activity
        if (auth.currentUser) {
          auditLog.logActivity(
            auth.currentUser.id,
            `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
            auth.currentUser.email,
            'create',
            'plugin',
            {
              pluginType: plugin.type,
              repositoryUrl: plugin.repositoryUrl,
              installationPath: plugin.installationPath,
              isActive: plugin.isActive
            },
            plugin.id,
            plugin.displayName
          );
        }
      })
      .catch((err) => {
        console.error("Failed to create plugin:", err);
        toast.error(`Failed to add plugin "${newPlugin.displayName}"`);
      });
  };

  const handleUpdatePlugin = (
    pluginId: string,
    updates: Partial<Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const previous = plugins.find(p => p.id === pluginId);
    if (!previous) return;

    // Optimistic update
    setPlugins(prev =>
      prev.map(p =>
        p.id === pluginId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      )
    );

    apiUpdatePlugin(pluginId, updates)
      .then((updated) => {
        setPlugins(prev => prev.map(p => (p.id === pluginId ? updated : p)));
        toast.success(`Plugin "${updated.displayName}" updated`);

        if (auth.currentUser) {
          auditLog.logActivity(
            auth.currentUser.id,
            `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
            auth.currentUser.email,
            'update',
            'plugin',
            { updatedFields: Object.keys(updates) },
            updated.id,
            updated.displayName
          );
        }
      })
      .catch((err) => {
        console.error("Failed to update plugin:", err);
        // Revert
        setPlugins(prev => prev.map(p => (p.id === pluginId ? previous : p)));
        toast.error(`Failed to update plugin "${previous.displayName}"`);
      });
  };

  return (
    <div className="min-h-screen bg-background p-6">

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Header
          currentUser={auth.currentUser}
          onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
          onOpenAuditLog={() => setIsAuditLogOpen(true)}
          canAccessAdminSettings={auth.canAccessAdminSettings}
          canViewMetrics={auth.canViewMetrics}
          canManageUsers={auth.canManageUsers}
          canViewAuditLog={auth.canViewAuditLog}
        />

        {/* Environment Filters */}
        <div className="mb-6">
          <EnvironmentFiltersComponent
            environments={environments}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Environments Card with Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Test Environments</CardTitle>
                <CardDescription>
                  {filteredEnvironments.length === environments.length
                    ? `Showing all ${environments.length} environments`
                    : `Showing ${filteredEnvironments.length} of ${environments.length} environments`}
                  {filteredEnvironments.length !== environments.length && " (filtered)"}
                  {filteredEnvironments.length > 0 && " • Click on any environment to view detailed information"}
                </CardDescription>
              </div>
              {auth.canCreateEnvironments && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="shadow-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-105 hover:shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Environment
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0 pb-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Loading environments from API…
              </div>
            ) : (
            <EnvironmentsTable
              environments={filteredEnvironments}
              plugins={plugins}
              onStartContainer={handleStartContainer}
              onStopContainer={handleStopContainer}
              onDeleteContainer={handleDeleteContainer}
              onDeleteEnvironment={handleDeleteEnvironment}
              onAddContainer={handleAddContainer}
              onRowClick={handleRowClick}
              onContainerClick={handleContainerClick}
            />
            )}
          </CardContent>
        </Card>

        {/* Create Environment Modal */}
        <CreateEnvironmentModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onCreateEnvironment={handleCreateEnvironment}
          plugins={plugins}
        />

        {/* Add Container Modal */}
        <CreateEnvironmentModal
          open={isAddContainerModalOpen}
          onOpenChange={(open) => {
            setIsAddContainerModalOpen(open);
            if (!open) {
              setAddContainerEnvironment(null);
            }
          }}
          onCreateEnvironment={handleCreateContainer}
          plugins={plugins}
          isAddContainerMode={true}
          prefilledEnvironment={addContainerEnvironment ? {
            name: addContainerEnvironment.name,
            plugin: addContainerEnvironment.plugin,
            version: addContainerEnvironment.version
          } : undefined}
        />

        {/* Admin Settings Modal */}
        {auth.canAccessAdminSettings && (
          <AdminSettingsModal
            open={isAdminSettingsOpen}
            onOpenChange={setIsAdminSettingsOpen}
            plugins={plugins}
            onTogglePluginActive={handleTogglePluginActive}
            onDeletePlugin={handleDeletePlugin}
            onAddPlugin={handleAddPlugin}
            onUpdatePlugin={handleUpdatePlugin}
          />
        )}

        {/* Audit Log Modal */}
        {auth.canViewAuditLog && (
          <AuditLogModal
            open={isAuditLogOpen}
            onOpenChange={setIsAuditLogOpen}
            auditLogs={auditLog.auditLogs}
            onExportLogs={auditLog.exportLogs}
          />
        )}

      </div>
    </div>
  );
}
