import type { Environment, MoodleContainer } from "../components/EnvironmentsTable";
import type { Plugin, PluginVersion } from "../types/plugin";
import type { User, Role } from "../types/user";

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
  created_by?: { id: string; name: string; email: string } | null;
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
    ...(infra.created_by
      ? {
          createdBy: {
            id: infra.created_by.id,
            name: infra.created_by.name,
            email: infra.created_by.email,
          },
        }
      : {}),
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

// ---------------------------------------------------------------------------
// Authentication & user management
// ---------------------------------------------------------------------------

/** Raised on a 401 so callers can distinguish "not logged in" from real errors. */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  let detail = await response.text();
  try {
    const parsed = JSON.parse(detail);
    if (parsed && parsed.detail) detail = parsed.detail;
  } catch {
    // keep raw text
  }
  return detail;
}

/** Fetch the currently authenticated user, or `null` if not logged in. */
export async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to load current user: ${response.status}`);
  }
  return (await response.json()) as User;
}

/** Authenticate with email + password. Returns the logged-in user. */
export async function login(email: string, password: string): Promise<User> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (response.status === 401) {
    throw new UnauthorizedError("Invalid email or password");
  }
  if (response.status === 429) {
    throw new Error("Too many failed attempts. Please wait a minute and try again.");
  }
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${await readErrorDetail(response)}`);
  }
  return (await response.json()) as User;
}

/** End the current session. */
export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

/** Change the current user's password. Returns the refreshed user record. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<User> {
  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (response.status === 401) {
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }
  return (await response.json()) as User;
}

/** List all users (admin only). */
export async function fetchUsers(): Promise<User[]> {
  const response = await fetch("/api/users", { credentials: "include" });
  if (response.status === 401) throw new UnauthorizedError();
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }
  const data = (await response.json()) as { users: User[] };
  return data.users ?? [];
}

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  roles: string[];
  avatar?: string;
}

/** Create a new user (admin only). */
export async function createUser(payload: CreateUserPayload): Promise<User> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }
  return (await response.json()) as User;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  roles?: string[];
  is_active?: boolean;
  avatar?: string;
  password?: string;
}

/** Update an existing user (admin only). */
export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<User> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }
  return (await response.json()) as User;
}

/** Delete a user (admin only). */
export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }
}

/** Fetch the available roles (admin only). */
export async function fetchRoles(): Promise<Role[]> {
  const response = await fetch("/api/users/roles", { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to fetch roles: ${response.status}`);
  }
  const data = (await response.json()) as { roles: Role[] };
  return data.roles ?? [];
}
