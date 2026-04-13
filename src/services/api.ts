import type { Environment, MoodleContainer } from "../components/EnvironmentsTable";

interface ApiMoodleContainer {
  moodle_version: string;
  status: string;
  url: string;
  admin_password: string;
  www_port: string;
  db_port: string;
}

interface ApiInfrastructure {
  name: string;
  git_ref_type: string;
  git_ref_reference: string;
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

function mapInfrastructureToEnvironment(infra: ApiInfrastructure): Environment {
  return {
    id: infra.name,
    name: infra.name,
    plugin: "theme_boost_union",
    version: infra.git_ref_reference,
    createdAt: "",
    containers: infra.moodles.map((m, index) => ({
      id: `${infra.name}-${m.moodle_version}-${index}`,
      moodleVersion: m.moodle_version,
      status: mapStatus(m.status),
      url: m.url,
      adminPassword: m.admin_password,
      createdAt: "",
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
