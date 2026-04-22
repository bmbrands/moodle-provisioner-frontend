import { useState, useCallback, useEffect } from 'react';
import type { AuditLogEntry, AuditAction, AuditResource } from '../types/audit';
import { getActionSeverity as calculateSeverity } from '../types/audit';
import { fetchAuditLog, postAuditEntry } from '../services/api';
import type { AuditEntryDto } from '../services/api';

function dtoToEntry(dto: AuditEntryDto): AuditLogEntry {
  return {
    id: dto.id,
    timestamp: dto.timestamp,
    userId: dto.user_id,
    userName: dto.user_name,
    userEmail: dto.user_email,
    action: dto.action as AuditAction,
    resource: dto.resource as AuditResource,
    resourceId: dto.resource_id ?? undefined,
    resourceName: dto.resource_name ?? undefined,
    details: dto.details ?? {},
    ipAddress: dto.ip_address ?? undefined,
    userAgent: dto.user_agent ?? undefined,
    severity: dto.severity,
  };
}

export function useAuditLog() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Load from backend on mount. Failures are non-fatal (we'll start with an
  // empty log and future appends will still be persisted).
  useEffect(() => {
    fetchAuditLog(500)
      .then(entries => setAuditLogs(entries.map(dtoToEntry)))
      .catch(err => console.error('Failed to load audit log:', err));
  }, []);

  const logActivity = useCallback((
    userId: string,
    userName: string,
    userEmail: string,
    action: AuditAction,
    resource: AuditResource,
    details: Record<string, any> = {},
    resourceId?: string,
    resourceName?: string
  ) => {
    const severity = calculateSeverity(action, resource);
    const optimistic: AuditLogEntry = {
      id: `audit-local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userEmail,
      action,
      resource,
      resourceId,
      resourceName,
      details,
      userAgent: navigator.userAgent,
      severity,
    };
    // Optimistic prepend.
    setAuditLogs(prev => [optimistic, ...prev]);

    // Fire-and-forget persistence; replace the optimistic entry with the
    // server-assigned one on success so subsequent reloads are consistent.
    postAuditEntry({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      action,
      resource,
      resource_id: resourceId,
      resource_name: resourceName,
      details,
      user_agent: navigator.userAgent,
      severity,
    })
      .then(persisted => {
        setAuditLogs(prev =>
          prev.map(e => (e.id === optimistic.id ? dtoToEntry(persisted) : e))
        );
      })
      .catch(err => {
        console.error('Failed to persist audit entry:', err);
      });

    return optimistic;
  }, []);

  const getFilteredLogs = useCallback((
    filters: {
      dateRange?: { from: string; to: string };
      users?: string[];
      actions?: AuditAction[];
      resources?: AuditResource[];
      severity?: ('low' | 'medium' | 'high' | 'critical')[];
      searchQuery?: string;
    } = {}
  ) => {
    return auditLogs.filter(log => {
      // Date range filter
      if (filters.dateRange) {
        const logDate = new Date(log.timestamp);
        const fromDate = new Date(filters.dateRange.from);
        const toDate = new Date(filters.dateRange.to);
        if (logDate < fromDate || logDate > toDate) return false;
      }

      // Users filter
      if (filters.users && filters.users.length > 0) {
        if (!filters.users.includes(log.userId)) return false;
      }

      // Actions filter
      if (filters.actions && filters.actions.length > 0) {
        if (!filters.actions.includes(log.action)) return false;
      }

      // Resources filter
      if (filters.resources && filters.resources.length > 0) {
        if (!filters.resources.includes(log.resource)) return false;
      }

      // Severity filter
      if (filters.severity && filters.severity.length > 0) {
        if (!filters.severity.includes(log.severity)) return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          log.userName.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.resource.toLowerCase().includes(query) ||
          (log.resourceName && log.resourceName.toLowerCase().includes(query)) ||
          JSON.stringify(log.details).toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [auditLogs]);

  const getLogsByUser = useCallback((userId: string) => {
    return auditLogs.filter(log => log.userId === userId);
  }, [auditLogs]);

  const getLogsByResource = useCallback((resource: AuditResource, resourceId?: string) => {
    return auditLogs.filter(log => {
      if (log.resource !== resource) return false;
      if (resourceId && log.resourceId !== resourceId) return false;
      return true;
    });
  }, [auditLogs]);

  const exportLogs = useCallback((logs: AuditLogEntry[]) => {
    const csv = [
      'Timestamp,User,Action,Resource,Resource Name,Details,IP Address,Severity',
      ...logs.map(log => [
        log.timestamp,
        `"${log.userName} (${log.userEmail})"`,
        log.action,
        log.resource,
        `"${log.resourceName || ''}"`,
        `"${JSON.stringify(log.details)}"`,
        log.ipAddress || '',
        log.severity
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    auditLogs,
    logActivity,
    getFilteredLogs,
    getLogsByUser,
    getLogsByResource,
    exportLogs
  };
}
