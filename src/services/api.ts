import type { Environment, MoodleContainer } from "../components/EnvironmentsTable";
import type { Plugin, PluginVersion } from "../types/plugin";

interface ApiMoodleContainer {
  moodle_version: string;
  status: string;
  url: string;
  admin_password: string;
  www_port: string;
  db_port: string;
  created_at: string;
}

interface ApiInfrastructure {
  name: string;
  git_ref_type: string;
  git_ref_reference: string;
  created_at: string;
  moodles: ApiMoodleContainer[];
}

interface ApiInfrastructureListResponse {
  infrastructures: ApiInfrastructure[];
}

function mapStatus(status: string): MoodleContainer["status"] {
  switch (status) {
    case "running": return "running";
    case "stopped": return "stopped";
    case "starting": return "starting";
    case "stopping": return "stopping";
    case "provisioning": return "provisioning";
    default: return "stopped";
  }
}

function formatDate(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapInfrastructureToEnvironment(infra: ApiInfrastructure): Environment {
  return {
    id: infra.name,
    name: infra.name,
    plugin: "theme_boost_union",
    version: infra.git_ref_reference,
    createdAt: formatDate(infra.created_at),
    containers: infra.moodles.map((m, index) => ({
      id: `${infra.name}-${m.moodle_version}-${index}`,
      moodleVersion: m.moodle_version,
      status: mapStatus(m.status),
      url: m.url,
      adminPassword: m.admin_password,
      createdAt: formatDate(m.created_at),
    })),
  };
}

export async function fetchInfrastructures(): Promise<Environment[]> {
  const response = await fetch("/api/infrastructures");
  if (!response.ok) {
    throw new Error(`Failed to fetch infrastructures: ${response.status}`);
  }
  const data: ApiInfrastructureListResponse = await response.json();
  return data.infrastructures.map(mapInfrastructureToEnvironment);
}

export async function startContainer(
  infrastructureName: string,
  moodleVersion: string
): Promise<void> {
  const response = await fetch(
    `/api/infrastructures/${encodeURIComponent(infrastructureName)}/${encodeURIComponent(moodleVersion)}/start`,
    { method: "POST" }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to start container: ${response.status} ${detail}`);
  }
}

export async function stopContainer(
  infrastructureName: string,
  moodleVersion: string
): Promise<void> {
  const response = await fetch(
    `/api/infrastructures/${encodeURIComponent(infrastructureName)}/${encodeURIComponent(moodleVersion)}/stop`,
    { method: "POST" }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to stop container: ${response.status} ${detail}`);
  }
}

export async function deleteContainer(
  infrastructureName: string,
  moodleVersion: string
): Promise<void> {
  const response = await fetch(
    `/api/infrastructures/${encodeURIComponent(infrastructureName)}/${encodeURIComponent(moodleVersion)}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to delete container: ${response.status} ${detail}`);
  }
}

export async function deleteInfrastructure(
  infrastructureName: string
): Promise<void> {
  const response = await fetch(
    `/api/infrastructures/${encodeURIComponent(infrastructureName)}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to delete infrastructure: ${response.status} ${detail}`);
  }
}

interface ApiPluginVersion {
  ref: string;
  name: string;
  type: "branch" | "tag" | "pr";
}

interface ApiPluginVersionsResponse {
  versions: ApiPluginVersion[];
}

export async function fetchPluginVersions(repoUrl: string): Promise<PluginVersion[]> {
  const response = await fetch(
    `/api/plugins/refs?repo_url=${encodeURIComponent(repoUrl)}`
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch plugin versions: ${response.status} ${detail}`);
  }
  const data: ApiPluginVersionsResponse = await response.json();
  return data.versions;
}

interface ApiPluginListResponse {
  plugins: Plugin[];
}

export async function fetchPlugins(): Promise<Plugin[]> {
  const response = await fetch("/api/plugins");
  if (!response.ok) {
    throw new Error(`Failed to fetch plugins: ${response.status}`);
  }
  const data: ApiPluginListResponse = await response.json();
  return data.plugins;
}

export async function createPlugin(
  plugin: Omit<Plugin, "id" | "createdAt" | "updatedAt">
): Promise<Plugin> {
  const response = await fetch("/api/plugins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plugin),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to create plugin: ${response.status} ${detail}`);
  }
  return response.json();
}

export async function updatePlugin(
  pluginId: string,
  updates: Partial<Omit<Plugin, "id" | "createdAt" | "updatedAt">>
): Promise<Plugin> {
  const response = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to update plugin: ${response.status} ${detail}`);
  }
  return response.json();
}

export async function deletePlugin(pluginId: string): Promise<void> {
  const response = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to delete plugin: ${response.status} ${detail}`);
  }
}
