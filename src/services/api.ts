import type { Environment, MoodleContainer } from "../components/EnvironmentsTable";

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
