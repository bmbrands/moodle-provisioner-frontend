export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceName?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'start'
  | 'stop'
  | 'login'
  | 'logout'
  | 'view'
  | 'copy_password'
  | 'export'
  | 'import'
  | 'filter'
  | 'clear_filters'
  | 'pin'
  | 'unpin'
  | 'activate'
  | 'deactivate';

export type AuditResource =
  | 'environment'
  | 'container'
  | 'plugin'
  | 'user'
  | 'role'
  | 'account'
  | 'settings'
  | 'system'
  | 'timeline';

export interface AuditFilters {
  dateRange: {
    from: string;
    to: string;
  };
  users: string[];
  actions: AuditAction[];
  resources: AuditResource[];
  severity: ('low' | 'medium' | 'high' | 'critical')[];
  searchQuery: string;
}

export const auditActionLabels: Record<AuditAction, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  start: 'Started',
  stop: 'Stopped',
  login: 'Logged In',
  logout: 'Logged Out',
  view: 'Viewed',
  copy_password: 'Copied Password',
  export: 'Exported',
  import: 'Imported',
  filter: 'Filtered',
  clear_filters: 'Cleared Filters',
  pin: 'Pinned',
  unpin: 'Unpinned',
  activate: 'Activated',
  deactivate: 'Deactivated'
};

export const auditResourceLabels: Record<AuditResource, string> = {
  environment: 'Environment',
  container: 'Container',
  plugin: 'Plugin',
  user: 'User',
  role: 'Role',
  account: 'Account',
  settings: 'Settings',
  system: 'System',
  timeline: 'Timeline'
};

export const getSeverityColor = (severity: AuditLogEntry['severity']) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'secondary';
    case 'medium': return 'default';
    case 'low': return 'outline';
    default: return 'outline';
  }
};

export const getActionSeverity = (action: AuditAction, resource: AuditResource): AuditLogEntry['severity'] => {
  if (action === 'delete' && resource === 'environment') return 'high';
  if (action === 'delete' && resource === 'user') return 'critical';
  if (action === 'create' && resource === 'user') return 'medium';
  if (action === 'copy_password') return 'medium';
  if (action === 'login' || action === 'logout') return 'low';
  if (action === 'view') return 'low';
  return 'medium';
};
