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
  plugin?: string;
  moodles: ApiMoodleContainer[];
  provisioning_phase?: string | null;
  provisioning_error?: string | null;
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
  const phase = infra.provisioning_phase as Environment["provisioningPhase"] | null | undefined;
  return {
    id: infra.name,
    name: infra.name,
    plugin: infra.plugin || "boost_union",
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
    ...(phase ? { provisioningPhase: phase } : {}),
    ...(infra.provisioning_error ? { provisioningError: infra.provisioning_error } : {}),
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

export interface CreateInfrastructurePayload {
  name: string;
  plugin: string;
  git_ref_type: "branch" | "tag" | "commit" | "pr";
  git_ref: string;
  moodle_versions: string[];
}

export async function createInfrastructure(
  payload: CreateInfrastructurePayload
): Promise<void> {
  const response = await fetch("/api/infrastructures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let detail = await response.text();
    try {
      const parsed = JSON.parse(detail);
      if (parsed && parsed.detail) detail = parsed.detail;
    } catch {
      // detail remains as the raw text
    }
    throw new Error(`Failed to create infrastructure: ${response.status} ${detail}`);
  }
}

export async function addContainers(
  infrastructureName: string,
  moodleVersions: string[]
): Promise<void> {
  const response = await fetch(
    `/api/infrastructures/${encodeURIComponent(infrastructureName)}/containers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moodle_versions: moodleVersions }),
    }
  );
  if (!response.ok) {
    let detail = await response.text();
    try {
      const parsed = JSON.parse(detail);
      if (parsed && parsed.detail) detail = parsed.detail;
    } catch {
      // keep raw text
    }
    throw new Error(`Failed to add containers: ${response.status} ${detail}`);
  }
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

export interface MoodleVersion {
  version: string;
  tag: string;
  major: number;
  minor: number;
  patch: number;
}

interface ApiMoodleVersionsResponse {
  versions: MoodleVersion[];
}

export async function fetchMoodleVersions(): Promise<MoodleVersion[]> {
  const response = await fetch("/api/moodle/versions");
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch Moodle versions: ${response.status} ${detail}`);
  }
  const data: ApiMoodleVersionsResponse = await response.json();
  return data.versions;
}

// ---- Audit log ----------------------------------------------------------

export interface AuditEntryDto {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  resource: string;
  resource_id?: string | null;
  resource_name?: string | null;
  details: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
  severity: "low" | "medium" | "high" | "critical";
}

export interface CreateAuditEntryDto {
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  resource: string;
  resource_id?: string;
  resource_name?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export async function fetchAuditLog(limit = 500): Promise<AuditEntryDto[]> {
  const response = await fetch(`/api/audit?limit=${limit}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch audit log: ${response.status} ${detail}`);
  }
  const data: { entries: AuditEntryDto[] } = await response.json();
  return data.entries;
}

export async function postAuditEntry(payload: CreateAuditEntryDto): Promise<AuditEntryDto> {
  const response = await fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to post audit entry: ${response.status} ${detail}`);
  }
  return response.json();
}

// ---- Server logs -------------------------------------------------------

export interface ServerLogLine {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

export async function fetchServerLogs(
  limit = 1000,
  afterId?: number
): Promise<ServerLogLine[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (afterId !== undefined) {
    params.set("after_id", String(afterId));
  }
  const response = await fetch(`/api/logs?${params.toString()}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch server logs: ${response.status} ${detail}`);
  }
  const data: { lines: ServerLogLine[] } = await response.json();
  return data.lines;
}

export async function clearServerLogs(): Promise<void> {
  const response = await fetch("/api/logs", { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to clear server logs: ${response.status} ${detail}`);
  }
}

// ---- Settings ----------------------------------------------------------

export type SettingValue = string | number | boolean;

export async function fetchSettings(): Promise<Record<string, SettingValue>> {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch settings: ${response.status} ${detail}`);
  }
  const data: { values: Record<string, SettingValue> } = await response.json();
  return data.values ?? {};
}

export async function updateSettings(
  values: Record<string, SettingValue>
): Promise<Record<string, SettingValue>> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to save settings: ${response.status} ${detail}`);
  }
  const data: { values: Record<string, SettingValue> } = await response.json();
  return data.values ?? {};
}
