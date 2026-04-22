import { useState, useRef, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { CreateEnvironmentModal } from "./components/CreateEnvironmentModal";
import { EnvironmentsTable} from "./components/EnvironmentsTable";
import type { Environment, MoodleContainer } from "./components/EnvironmentsTable";
import { EnvironmentDetailsModal } from "./components/EnvironmentDetailsModal";
import type { DetailedEnvironment } from "./components/EnvironmentDetailsModal";
import { ContainerDetailsModal } from "./components/ContainerDetailsModal";
import type { DetailedContainer } from "./components/ContainerDetailsModal";
import { AdminSettingsModal } from "./components/AdminSettingsModal";
import { HostMetricsModal } from "./components/HostMetricsModal";
import { ProvisioningTimelineModal, provisioningSteps } from "./components/ProvisioningTimelineModal";
import type { ProvisioningTimeline, ProvisioningStep} from "./components/ProvisioningTimelineModal";
import { UserManagementModal } from "./components/UserManagementModal";
import { UserProfileModal } from "./components/UserProfileModal";
import { AuditLogModal } from "./components/AuditLogModal";
import { EnvironmentFiltersComponent, applyEnvironmentFilters, defaultFilters } from "./components/EnvironmentFilters";
import type { EnvironmentFilters } from "./components/EnvironmentFilters";
import { Header } from "./components/Header";
import { useAuth } from "./hooks/useAuth";
import { useAuditLog } from "./hooks/useAuditLog";
import { mockUsers } from "./types/user";
import type { User } from "./types/user";
import { mockPluginVersions } from "./types/plugin";
import type { Plugin } from "./types/plugin";
import { toast } from "sonner";
import { fetchInfrastructures, startContainer as apiStartContainer, stopContainer as apiStopContainer, deleteContainer as apiDeleteContainer, deleteInfrastructure as apiDeleteInfrastructure, fetchPlugins as apiFetchPlugins, createPlugin as apiCreatePlugin, updatePlugin as apiUpdatePlugin, deletePlugin as apiDeletePlugin, createInfrastructure as apiCreateInfrastructure, addContainers as apiAddContainers } from "./services/api";

const generateDetailedEnvironment = (env: Environment): DetailedEnvironment => ({
  ...env,
  updatedAt: "1 hour ago",
  logs: [
    "[2024-01-15 10:30:22] INFO: Moodle environment started successfully",
    "[2024-01-15 10:30:18] INFO: Database connection established",
    "[2024-01-15 10:30:15] INFO: Plugin loaded: " + env.plugin,
    ...(env.isWebhookCreated
      ? [
          `[2024-01-15 10:30:13] INFO: GitHub PR #${env.pullRequestNumber} detected`,
          "[2024-01-15 10:30:11] INFO: Webhook authentication successful"
        ]
      : []
    ),
    "[2024-01-15 10:30:12] INFO: Initializing container...",
    "[2024-01-15 10:30:10] INFO: Starting environment: " + env.name,
    "[2024-01-15 10:29:58] INFO: Container image pulled successfully",
    "[2024-01-15 10:29:45] INFO: Preparing file system...",
    "[2024-01-15 10:29:30] INFO: Allocating resources...",
    "[2024-01-15 10:29:25] INFO: " + (env.isWebhookCreated ? "GitHub webhook triggered environment creation" : "Environment creation requested"),
    "[2024-01-15 10:29:20] INFO: Validating configuration..."
  ],
  dockerLinks: {
    container: `http://docker.local/containers/${env.id}`,
    logs: `http://docker.local/containers/${env.id}/logs`,
    exec: `http://docker.local/containers/${env.id}/exec`
  },
  createdBy: env.createdBy
});

const generateDetailedContainer = (env: Environment, container: MoodleContainer): DetailedContainer => ({
  container,
  environment: env,
  logs: [
    `[2024-01-15 10:30:22] INFO: Moodle ${container.moodleVersion} instance started successfully`,
    "[2024-01-15 10:30:18] INFO: Database connection established",
    "[2024-01-15 10:30:15] INFO: Plugin loaded: " + env.plugin,
    `[2024-01-15 10:30:14] INFO: Admin user created with password: ${container.adminPassword}`,
    "[2024-01-15 10:30:12] INFO: Container initialization completed",
    `[2024-01-15 10:30:10] INFO: Starting Moodle ${container.moodleVersion} container`,
    "[2024-01-15 10:29:58] INFO: Container image pulled successfully",
    `[2024-01-15 10:29:45] INFO: Setting up ${container.advancedConfig?.database || 'mysql'} database`,
    `[2024-01-15 10:29:30] INFO: Configuring PHP ${container.advancedConfig?.phpVersion || '8.2'}`,
    ...(container.advancedConfig?.enableMLBackend ? ["[2024-01-15 10:29:25] INFO: MLBackend service enabled"] : []),
    ...(container.advancedConfig?.additionalPlugins?.length ?
      container.advancedConfig.additionalPlugins.map(plugin =>
        `[2024-01-15 10:29:20] INFO: Installing additional plugin: ${plugin}`
      ) : []
    ),
    "[2024-01-15 10:29:15] INFO: Allocating container resources...",
    "[2024-01-15 10:29:10] INFO: Container creation initiated"
  ],
  dockerLinks: {
    container: `http://docker.local/containers/${container.id}`,
    logs: `http://docker.local/containers/${container.id}/logs`,
    exec: `http://docker.local/containers/${container.id}/exec`
  }
});

// mockEnvironments removed - real data comes from fetchInfrastructures()

export default function App() {
  const auth = useAuth();
  const auditLog = useAuditLog();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [filters, setFilters] = useState<EnvironmentFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddContainerModalOpen, setIsAddContainerModalOpen] = useState(false);
  const [addContainerEnvironment, setAddContainerEnvironment] = useState<Environment | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<DetailedEnvironment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<DetailedContainer | null>(null);
  const [isContainerDetailsModalOpen, setIsContainerDetailsModalOpen] = useState(false);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isHostMetricsOpen, setIsHostMetricsOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState<ProvisioningTimeline | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [activeTimelines, setActiveTimelines] = useState<Map<string, ProvisioningTimeline>>(new Map());
  const timelineRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  const createProvisioningTimeline = (environment: Environment): ProvisioningTimeline => {
    const now = new Date();
    const steps: ProvisioningStep[] = provisioningSteps.map(step => ({
      ...step,
      status: "pending" as const
    }));

    return {
      environmentId: environment.id,
      environmentName: environment.name,
      status: "running",
      startTime: now,
      currentStep: steps[0].id,
      steps
    };
  };

  const simulateProvisioningStep = (environmentId: string, stepIndex: number) => {
    if (stepIndex >= provisioningSteps.length) {
      // All steps completed
      setActiveTimelines(prev => {
        const updated = new Map(prev);
        const timeline = updated.get(environmentId);
        if (timeline) {
          updated.set(environmentId, {
            ...timeline,
            status: "completed",
            endTime: new Date(),
            currentStep: undefined
          });
        }
        return updated;
      });

      setEnvironments(prev =>
        prev.map(env =>
          env.id === environmentId
            ? { ...env, status: "running" as const }
            : env
        )
      );

      const env = environments.find(e => e.id === environmentId);
      toast.success(`Environment "${env?.name}" provisioned successfully!`);
      return;
    }

    const step = provisioningSteps[stepIndex];
    const now = new Date();

    // Start the step
    setActiveTimelines(prev => {
      const updated = new Map(prev);
      const timeline = updated.get(environmentId);
      if (timeline) {
        const updatedSteps = timeline.steps.map((s, index) => {
          if (index === stepIndex) {
            return { ...s, status: "running" as const, startTime: now };
          }
          return s;
        });
        updated.set(environmentId, {
          ...timeline,
          currentStep: step.id,
          steps: updatedSteps
        });
      }
      return updated;
    });

    // Complete the step after estimated duration
    const timeout = setTimeout(() => {
      const endTime = new Date();
      setActiveTimelines(prev => {
        const updated = new Map(prev);
        const timeline = updated.get(environmentId);
        if (timeline) {
          const updatedSteps = timeline.steps.map((s, index) => {
            if (index === stepIndex) {
              return {
                ...s,
                status: "completed" as const,
                endTime,
                duration: endTime.getTime() - now.getTime()
              };
            }
            return s;
          });
          updated.set(environmentId, {
            ...timeline,
            steps: updatedSteps
          });
        }
        return updated;
      });

      // Start next step
      simulateProvisioningStep(environmentId, stepIndex + 1);
    }, step.estimatedDuration);

    timelineRefs.current.set(`${environmentId}-${stepIndex}`, timeout);
  };

  const handleCreateEnvironment = async (newEnv: {
    name: string;
    plugin: string;
    version: string;
    versionType: "branch" | "tag" | "pr" | "commit";
    moodleVersions: string[];
    advancedConfig?: {
      additionalPlugins: string[];
    };
  }) => {
    const containerText = newEnv.moodleVersions.length === 1 ? "container" : "containers";
    const toastId = toast.loading(
      `Creating "${newEnv.name}" with ${newEnv.moodleVersions.length} ${containerText}… this can take a few minutes.`
    );

    try {
      await apiCreateInfrastructure({
        name: newEnv.name,
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
            ...(newEnv.advancedConfig && {
              advancedConfig: {
                additionalPluginsCount: newEnv.advancedConfig.additionalPlugins.length,
                additionalPlugins: newEnv.advancedConfig.additionalPlugins,
              }
            })
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

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    return Array.from({length: 12}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleRowClick = (environment: Environment) => {
    const detailedEnv = generateDetailedEnvironment(environment);
    setSelectedEnvironment(detailedEnv);
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

  const handleViewTimeline = (environment: Environment, container?: MoodleContainer) => {
    // If container is specified, look for container timeline, otherwise environment timeline
    const timelineId = container ? container.id : environment.id;
    const timeline = activeTimelines.get(timelineId);

    if (timeline) {
      setSelectedTimeline(timeline);
      setIsTimelineModalOpen(true);

      // Log the view activity
      if (auth.currentUser) {
        auditLog.logActivity(
          auth.currentUser.id,
          `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
          auth.currentUser.email,
          'view',
          'timeline',
          {
            viewType: 'provisioning',
            targetType: container ? 'container' : 'environment',
            ...(container && { moodleVersion: container.moodleVersion })
          },
          timelineId,
          container ? `${environment.name} - Moodle ${container.moodleVersion}` : environment.name
        );
      }
    } else {
      const targetName = container
        ? `container Moodle ${container.moodleVersion}`
        : "environment";
      toast.info(`No provisioning timeline available for this ${targetName}`);
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

  const handleAddContainer = (environmentId: string, _moodleVersions: string[], _advancedConfig?: any) => {
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
    advancedConfig?: {
      additionalPlugins: string[];
    };
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

  const handleContainerDetails = (environment: Environment, container: MoodleContainer) => {
    const detailedContainer = generateDetailedContainer(environment, container);
    setSelectedContainer(detailedContainer);
    setIsContainerDetailsModalOpen(true);

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
          viewType: 'detailed_view'
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

  const handleTogglePin = (id: string) => {
    const env = environments.find(e => e.id === id);
    if (!env) return;

    const newPinnedStatus = !env.isPinned;

    setEnvironments(prev =>
      prev.map(environment =>
        environment.id === id
          ? { ...environment, isPinned: newPinnedStatus }
          : environment
      )
    );

    // Update the selected environment if it's currently open
    if (selectedEnvironment && selectedEnvironment.id === id) {
      setSelectedEnvironment(prev => prev ? { ...prev, isPinned: newPinnedStatus } : null);
    }

    // Log the activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        newPinnedStatus ? 'pin' : 'unpin',
        'environment',
        {
          isPinned: newPinnedStatus,
          reason: newPinnedStatus ? 'protected_from_auto_eviction' : 'removed_protection'
        },
        id,
        env.name
      );
    }

    toast.success(
      newPinnedStatus
        ? `Environment "${env.name}" has been pinned and is now protected from auto-eviction`
        : `Environment "${env.name}" has been unpinned and may be subject to auto-eviction`
    );
  };

  // User Management Handlers
  const handleUpdateUser = (updatedUser: User) => {
    const originalUser = users.find(u => u.id === updatedUser.id);

    setUsers(prev => prev.map(user => user.id === updatedUser.id ? updatedUser : user));
    if (auth.currentUser && auth.currentUser.id === updatedUser.id) {
      auth.updateCurrentUser(updatedUser);
    }

    // Log the activity
    if (auth.currentUser && originalUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'update',
        'user',
        {
          changes: {
            email: originalUser.email !== updatedUser.email ? { from: originalUser.email, to: updatedUser.email } : undefined,
            roles: originalUser.roles !== updatedUser.roles ? {
              from: originalUser.roles.map(r => r.name),
              to: updatedUser.roles.map(r => r.name)
            } : undefined
          }
        },
        updatedUser.id,
        `${updatedUser.firstName} ${updatedUser.lastName}`
      );
    }

    toast.success("User updated successfully!");
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);

    // Log the activity
    if (auth.currentUser && user) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'delete',
        'user',
        {
          deletedUserEmail: user.email,
          deletedUserRoles: user.roles.map(r => r.name)
        },
        userId,
        `${user.firstName} ${user.lastName}`
      );
    }

    setUsers(prev => prev.filter(user => user.id !== userId));
    toast.success(`User "${user?.firstName} ${user?.lastName}" deleted successfully!`);
  };

  const handleCreateUser = (newUser: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>) => {
    const user: User = {
      ...newUser,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    // Log the activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'create',
        'user',
        {
          email: user.email,
          roles: user.roles.map(r => r.name)
        },
        user.id,
        `${user.firstName} ${user.lastName}`
      );
    }

    setUsers(prev => [...prev, user]);
    toast.success("User created successfully!");
  };

  const handleLogout = () => {
    // Log the activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'logout',
        'system',
        { sessionEnded: true }
      );
    }

    auth.logout();
    toast.info("Logged out successfully");
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
        setPlugins(prev => [...prev, plugin]);
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

  const simulateWebhookEnvironment = () => {
    const webhookPRNumber = Math.floor(Math.random() * 9000) + 1000;
    const webhookContainer: MoodleContainer = {
      id: `container-webhook-${Date.now()}`,
      moodleVersion: "4.3.0",
      status: "provisioning",
      url: `https://focused-cray.92-205-184-244.plesk.page/test-webhook-pr-${webhookPRNumber}/moodleversion/`,
      adminPassword: generatePassword(),
      createdAt: "Just now"
    };

    const webhookEnvironment: Environment = {
      id: `env-webhook-${Date.now()}`,
      name: `test-webhook-pr-${webhookPRNumber}`,
      plugin: "mod_bookit",
      version: "feature/webhook-testing",
      createdAt: "Just now",
      isPinned: false,
      isWebhookCreated: true,
      pullRequestUrl: `https://github.com/moodle/moodle/pull/${webhookPRNumber}`,
      pullRequestNumber: webhookPRNumber,
      containers: [webhookContainer],
      createdBy: {
        id: "webhook-system",
        name: "GitHub Webhook",
        email: "webhook@system.local"
      }
    };

    setEnvironments(prev => [webhookEnvironment, ...prev]);

    // Log the activity
    if (auth.currentUser) {
      auditLog.logActivity(
        auth.currentUser.id,
        `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
        auth.currentUser.email,
        'create',
        'environment',
        {
          plugin: webhookEnvironment.plugin,
          version: webhookEnvironment.version,
          moodleVersions: [webhookContainer.moodleVersion],
          isWebhookCreated: true,
          pullRequestNumber: webhookPRNumber,
          pullRequestUrl: webhookEnvironment.pullRequestUrl
        },
        webhookEnvironment.id,
        webhookEnvironment.name
      );
    }

    // Create and start provisioning timeline
    const timeline = createProvisioningTimeline(webhookEnvironment);
    setActiveTimelines(prev => new Map(prev.set(webhookContainer.id, timeline)));

    toast.success(`GitHub webhook environment created for PR #${webhookPRNumber}!`);

    // Start the provisioning simulation
    simulateProvisioningStep(webhookContainer.id, 0);
  };

  return (
    <div className="min-h-screen bg-background p-6">

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Header
          currentUser={auth.currentUser}
          onOpenHostMetrics={() => setIsHostMetricsOpen(true)}
          onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
          onOpenUserManagement={() => setIsUserManagementOpen(true)}
          onOpenAuditLog={() => setIsAuditLogOpen(true)}
          onOpenUserProfile={() => setIsUserProfileOpen(true)}
          onLogout={handleLogout}
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
              pluginVersions={mockPluginVersions}
              onStartContainer={handleStartContainer}
              onStopContainer={handleStopContainer}
              onDeleteContainer={handleDeleteContainer}
              onDeleteEnvironment={handleDeleteEnvironment}
              onAddContainer={handleAddContainer}
              onRowClick={handleRowClick}
              onContainerClick={handleContainerClick}
              onContainerDetails={handleContainerDetails}
              onViewTimeline={handleViewTimeline}
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
          pluginVersions={mockPluginVersions}
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
          pluginVersions={mockPluginVersions}
          isAddContainerMode={true}
          prefilledEnvironment={addContainerEnvironment ? {
            name: addContainerEnvironment.name,
            plugin: addContainerEnvironment.plugin,
            version: addContainerEnvironment.version
          } : undefined}
        />

        {/* Environment Details Modal */}
        <EnvironmentDetailsModal
          environment={selectedEnvironment}
          open={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          onTogglePin={handleTogglePin}
          onStartContainer={handleStartContainer}
          onStopContainer={handleStopContainer}
          onLogActivity={(action, resource, details, resourceId, resourceName) => {
            if (auth.currentUser) {
              auditLog.logActivity(
                auth.currentUser.id,
                `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
                auth.currentUser.email,
                action as any,
                resource as any,
                details,
                resourceId,
                resourceName
              );
            }
          }}
        />

        {/* Admin Settings Modal */}
        {auth.canAccessAdminSettings && (
          <AdminSettingsModal
            open={isAdminSettingsOpen}
            onOpenChange={setIsAdminSettingsOpen}
            onSimulateWebhook={simulateWebhookEnvironment}
            plugins={plugins}
            onTogglePluginActive={handleTogglePluginActive}
            onDeletePlugin={handleDeletePlugin}
            onAddPlugin={handleAddPlugin}
            onUpdatePlugin={handleUpdatePlugin}
          />
        )}

        {/* Host Metrics Modal */}
        {auth.canViewMetrics && (
          <HostMetricsModal
            open={isHostMetricsOpen}
            onOpenChange={setIsHostMetricsOpen}
          />
        )}

        {/* User Management Modal */}
        {auth.canManageUsers && (
          <UserManagementModal
            open={isUserManagementOpen}
            onOpenChange={setIsUserManagementOpen}
            users={users}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onCreateUser={handleCreateUser}
          />
        )}

        {/* User Profile Modal */}
        {auth.currentUser && (
          <UserProfileModal
            user={auth.currentUser}
            open={isUserProfileOpen}
            onOpenChange={setIsUserProfileOpen}
            onUpdateUser={(updatedUser) => {
              auth.updateCurrentUser(updatedUser);
              handleUpdateUser(updatedUser);
            }}
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

        {/* Container Details Modal */}
        <ContainerDetailsModal
          container={selectedContainer}
          open={isContainerDetailsModalOpen}
          onOpenChange={setIsContainerDetailsModalOpen}
          onLogActivity={(action, resource, details, resourceId, resourceName) => {
            if (auth.currentUser) {
              auditLog.logActivity(
                auth.currentUser.id,
                `${auth.currentUser.firstName} ${auth.currentUser.lastName}`,
                auth.currentUser.email,
                action as any,
                resource as any,
                details,
                resourceId,
                resourceName
              );
            }
          }}
          onStartContainer={handleStartContainer}
          onStopContainer={handleStopContainer}
        />

        {/* Provisioning Timeline Modal */}
        <ProvisioningTimelineModal
          timeline={selectedTimeline}
          open={isTimelineModalOpen}
          onOpenChange={setIsTimelineModalOpen}
        />
      </div>
    </div>
  );
}
