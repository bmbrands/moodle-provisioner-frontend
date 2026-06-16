export interface Plugin {
  id: string;
  name: string;
  displayName: string;
  repositoryUrl: string;
  installationPath: string;
  description?: string;
  type: 'activity' | 'block' | 'theme' | 'local' | 'admin' | 'core' | 'other';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PluginVersion {
  ref: string;
  name: string;
  type: 'branch' | 'tag' | 'pr' | 'commit';
}
