export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  description: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

export interface Account {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  accountId: string;
  account: Account;
  roles: Role[];
  lastLoginAt: string;
  createdAt: string;
  isActive: boolean;
}

export const defaultRoles: Role[] = [
  {
    id: 'tester',
    name: 'Tester',
    description: 'Can create and manage test environments',
    permissions: [
      { id: 'env-read', name: 'View Environments', resource: 'environments', action: 'read' },
      { id: 'env-write', name: 'Create/Edit Environments', resource: 'environments', action: 'write' },
      { id: 'env-delete', name: 'Delete Environments', resource: 'environments', action: 'delete' },
    ]
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access including user and system management',
    permissions: [
      { id: 'env-read', name: 'View Environments', resource: 'environments', action: 'read' },
      { id: 'env-write', name: 'Create/Edit Environments', resource: 'environments', action: 'write' },
      { id: 'env-delete', name: 'Delete Environments', resource: 'environments', action: 'delete' },
      { id: 'metrics-read', name: 'View Host Metrics', resource: 'metrics', action: 'read' },
      { id: 'admin-settings', name: 'Admin Settings', resource: 'system', action: 'admin' },
      { id: 'user-management', name: 'User Management', resource: 'users', action: 'admin' },
      { id: 'audit-log', name: 'View Audit Log', resource: 'audit', action: 'read' },
    ]
  }
];

export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'yvonne.w@example.org',
    firstName: 'Yvonne',
    lastName: 'W.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yvonne',
    accountId: 'account-1',
    account: {
      id: 'account-1',
      name: 'Boost Union',
      domain: 'example.org',
      createdAt: '2024-01-01',
      isActive: true
    },
    roles: [defaultRoles[1]], // Admin
    lastLoginAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true
  },
  {
    id: 'user-2',
    email: 'wiebke.m@example.org',
    firstName: 'Wiebke',
    lastName: 'M.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wiebke',
    accountId: 'account-1',
    account: {
      id: 'account-1',
      name: 'Boost Union',
      domain: 'example.org',
      createdAt: '2024-01-01',
      isActive: true
    },
    roles: [defaultRoles[1]], // Admin
    lastLoginAt: '2024-01-15T09:45:00Z',
    createdAt: '2024-01-05T00:00:00Z',
    isActive: true
  },
  {
    id: 'user-3',
    email: 'dennis.g@example.org',
    firstName: 'Dennis',
    lastName: 'G.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dennis',
    accountId: 'account-1',
    account: {
      id: 'account-1',
      name: 'Boost Union',
      domain: 'example.org',
      createdAt: '2024-01-01',
      isActive: true
    },
    roles: [defaultRoles[1]], // Admin
    lastLoginAt: '2024-01-15T08:20:00Z',
    createdAt: '2024-01-10T00:00:00Z',
    isActive: true
  },
  {
    id: 'user-4',
    email: 'alex.b@example.org',
    firstName: 'Alex',
    lastName: 'B.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    accountId: 'account-1',
    account: {
      id: 'account-1',
      name: 'Boost Union',
      domain: 'example.org',
      createdAt: '2024-01-01',
      isActive: true
    },
    roles: [defaultRoles[1]], // Admin
    lastLoginAt: '2024-01-14T15:30:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true
  },
  {
    id: 'user-5',
    email: 'christian.w@example.org',
    firstName: 'Christian',
    lastName: 'W.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=christian',
    accountId: 'account-1',
    account: {
      id: 'account-1',
      name: 'Boost Union',
      domain: 'example.org',
      createdAt: '2024-01-01',
      isActive: true
    },
    roles: [defaultRoles[1]], // Admin
    lastLoginAt: '2024-01-14T14:20:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true
  },
  {
    id: 'user-6',
    email: 'kathleen.a@example.org',
    firstName: 'Kathleen',
    lastName: 'A.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kathleen',
    accountId: 'account-1',
    account: {
      id: 'account-1',
      name: 'Boost Union',
      domain: 'example.org',
      createdAt: '2024-01-01',
      isActive: true
    },
    roles: [defaultRoles[0]], // Tester
    lastLoginAt: '2024-01-14T11:45:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true
  },
  {
    id: 'user-7',
    email: 'melanie.t@example.org',
    firstName: 'Melanie',
    lastName: 'T.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=melanie',
    accountId: 'account-2',
    account: {
      id: 'account-2',
      name: 'BookIT',
      domain: 'example.org',
      createdAt: '2024-01-01',
      isActive: true
    },
    roles: [defaultRoles[1]], // Admin
    lastLoginAt: '2024-01-14T10:15:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true
  }
];
